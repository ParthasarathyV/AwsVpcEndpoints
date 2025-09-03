package com.jpmorgan.myig.service;

import com.jpmorgan.myig.repository.CustomCostsRepository;
import com.mongodb.client.model.InsertOneModel;
import com.mongodb.client.model.WriteModel;
import com.mongodb.client.result.DeleteResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.openxml4j.opc.OPCPackage;
import org.apache.poi.openxml4j.util.ZipSecureFile;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.xssf.eventusermodel.XSSFReader;
import org.apache.poi.xssf.eventusermodel.XSSFSheetXMLHandler;
import org.apache.poi.xssf.model.SharedStrings;
import org.apache.poi.xssf.model.StylesTable;
import org.apache.poi.xssf.usermodel.XSSFComment;
import org.bson.Document;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.xml.sax.InputSource;
import org.xml.sax.XMLReader;
import org.xml.sax.helpers.XMLReaderFactory;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.LongAdder;
import java.util.regex.Pattern;

/**
 * XLSX/XLSM importer for BU lookup rows (ID, SNODE_ALIAS, NME) -> {type, id, value:{name, sdml1..}}
 * - Target collection is hardcoded to "lookup"
 * - Deletes existing {type:<type>} before insert
 * - Multipart uploads are written to a temp file then parsed using POI event API
 * - S3 is intentionally NOT implemented
 * - Detailed timing logs (end-to-end, per-batch)
 * - OPTIONAL: multi-threaded writer with backpressure
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class XlsxBuImportHandler {

    private final CustomCostsRepository customCostsRepository;

    private static final String COLLECTION = "lookup";
    private static final int BATCH_SIZE = 1000;                 // write batch size
    private static final int QUEUE_CAPACITY = 50_000;           // backpressure buffer
    private static final int WORKERS = Math.max(2, Runtime.getRuntime().availableProcessors());

    
    // For local testing without multipart
    private static final Path DEFAULT_LOCAL_PATH = Paths.get("C:/Users/R751034/Downloads/bu.xlsx");

    /** Entry used by controller when a MultipartFile is uploaded */
    public void handleMultipart(String type, MultipartFile file) {
        Instant t0 = Instant.now();
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Multipart file is required");
        }
        String name = file.getOriginalFilename();
        String suffix = (name != null && name.toLowerCase().endsWith(".xlsm")) ? ".xlsm" : ".xlsx";
        Path tmp = null;
        try {
            tmp = Files.createTempFile("lookup-upload-", suffix);
            Instant tSave = Instant.now();
            file.transferTo(tmp);
            log.info("[IMPORT] saved upload to {} in {}ms", tmp, msSince(tSave));
            handleXlsxImportFromPath(type, tmp);
        } catch (Exception e) {
            log.error("[IMPORT] multipart import failed", e);
            throw new RuntimeException(e);
        } finally {
            if (tmp != null) try { Files.deleteIfExists(tmp); } catch (Exception ignore) {}
            log.info("[IMPORT] multipart total took={}ms", msSince(t0));
        }
    }

    /** Dev helper: process a local fixed file */
    public void handleLocal(String type) { handleXlsxImportFromPath(type, DEFAULT_LOCAL_PATH); }

    /** Main path-based importer (multi-threaded writers) */
    public void handleXlsxImportFromPath(String type, Path filePath) {
        Instant t0 = Instant.now();
        log.info("[IMPORT] type={} path={} workers={} batch={} queueCap={}", type, filePath, WORKERS, BATCH_SIZE, QUEUE_CAPACITY);
        ZipSecureFile.setMinInflateRatio(0.0d);

        // Step 0: delete existing of this type
        Instant tDel = Instant.now();
        DeleteResult del = customCostsRepository.remove(COLLECTION, Query.query(Criteria.where("type").is(type)));
        log.info("[IMPORT] delete type='{}' -> deleted={} took={}ms", type, del.getDeletedCount(), msSince(tDel));

        // Step 1: parse + concurrent write
        try {
            processSingleSheetConcurrent(filePath, type);
        } catch (Exception e) {
            log.error("[IMPORT] parse failed type={} path={}", type, filePath, e);
            throw new RuntimeException(e);
        }
        log.info("[IMPORT] total took={}ms", msSince(t0));
    }

    // ---------------- core concurrent parser ----------------

    private void processSingleSheetConcurrent(Path filePath, String type) throws Exception {
        // shared metrics
        Metrics metrics = new Metrics();
        metrics.start = Instant.now();

        // bounded queue for backpressure
        final Document POISON = new Document("__poison", true);
        BlockingQueue<Document> q = new ArrayBlockingQueue<>(QUEUE_CAPACITY);

        // start writer pool
        ExecutorService pool = Executors.newFixedThreadPool(WORKERS);
        CountDownLatch writersDone = new CountDownLatch(WORKERS);
        for (int i = 0; i < WORKERS; i++) {
            pool.submit(new WriterWorker(q, POISON, writersDone, metrics));
        }

        // ---- parse on this thread and feed queue ----
        Instant tOpen0 = Instant.now();
        try (OPCPackage pkg = OPCPackage.open(filePath.toFile())) {
            log.info("[IMPORT] OPCPackage.open done in {}ms", msSince(tOpen0));

            XSSFReader reader = new XSSFReader(pkg);
            StylesTable styles = reader.getStylesTable();
            SharedStrings sst = reader.getSharedStringsTable();

            DataFormatter fmt = new DataFormatter();
            XMLReader parser = XMLReaderFactory.createXMLReader();
            parser.setContentHandler(new XSSFSheetXMLHandler(styles, null, sst,
                    new ConcurrentBuSheetHandler(type, q, metrics), fmt, false));

            Iterator<InputStream> sheets = reader.getSheetsData();
            if (!sheets.hasNext()) {
                log.warn("[IMPORT] no sheets found in {}", filePath);
                // signal writers to finish with no work
                for (int i = 0; i < WORKERS; i++) q.put(POISON);
                writersDone.await();
                pool.shutdown();
                return;
            }

            Instant tParse0 = Instant.now();
            try (InputStream sheet1 = sheets.next()) {
                parser.parse(new InputSource(sheet1));
            }
            metrics.parseMillis.add(msSince(tParse0));
            log.info("[IMPORT] sheet parsed in {}ms (rows parsed={})", msSince(tParse0), metrics.rowsParsed.sum());
        }

        // send poison pills to stop workers
        for (int i = 0; i < WORKERS; i++) q.put(POISON);
        writersDone.await();
        pool.shutdown();

        log.info("[IMPORT] written={} batches={} writeTime={}ms queueMax={} rowsParsed={}",
                metrics.rowsWritten.sum(), metrics.batches.sum(), metrics.writeMillis.sum(), metrics.maxQueue, metrics.rowsParsed.sum());
    }

    // ---------------- SAX row handler (producer) ----------------

    private class ConcurrentBuSheetHandler implements XSSFSheetXMLHandler.SheetContentsHandler {
        private final String type;
        private final BlockingQueue<Document> q;
        private final Metrics m;

        private String id, alias, name;
        private long lastLogged = 0;

        ConcurrentBuSheetHandler(String type, BlockingQueue<Document> q, Metrics metrics) {
            this.type = type; this.q = q; this.m = metrics;
        }

        @Override public void startRow(int rowNum) { id = alias = name = null; }
        @Override public void headerFooter(String text, boolean isHeader, String tagName) { }

        @Override
        public void cell(String cellRef, String v, XSSFComment c) {
            switch (columnIndex(cellRef)) {
                case 0 -> id = v;      // ID as-is
                case 1 -> alias = v;   // SNODE_ALIAS
                case 2 -> name = v;    // NME
                default -> { }
            }
        }

        @Override
        public void endRow(int rowNum) {
            if (rowNum == 0 && looksLikeHeader(id, alias, name)) return; // header
            if (isBlank(id)) return; // require ID

            Document value = new Document();
            if (name != null) value.append("name", name);
            List<String> sdmls = extractSdmls(alias);
            for (int i = 0; i < sdmls.size(); i++) value.append("sdml" + (i + 1), sdmls.get(i));

            Document doc = new Document("type", type).append("id", id).append("value", value);

            try {
                q.put(doc); // backpressure
                m.rowsParsed.increment();
                int size = q.size();
                if (size > m.maxQueue) m.maxQueue = size;
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                throw new RuntimeException(ie);
            }

            long parsed = m.rowsParsed.sum();
            if (parsed - lastLogged >= 100_000) {
                lastLogged = parsed;
                log.info("[IMPORT] parsed rows={} elapsed={}ms queueSize={}", parsed, msSince(m.start), q.size());
            }
        }
    }

    // ---------------- writer worker (consumer) ----------------

    private class WriterWorker implements Runnable {
        private final BlockingQueue<Document> q;
        private final Document poison;
        private final CountDownLatch done;
        private final Metrics m;

        WriterWorker(BlockingQueue<Document> q, Document poison, CountDownLatch done, Metrics m) {
            this.q = q; this.poison = poison; this.done = done; this.m = m;
        }

        @Override
        public void run() {
            List<WriteModel<Document>> batch = new ArrayList<>(BATCH_SIZE);
            try {
                while (true) {
                    Document d = q.take();
                    if (d == poison) break;
                    batch.add(new InsertOneModel<>(d));
                    if (batch.size() >= BATCH_SIZE) flush(batch);
                }
                flush(batch); // final partial
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                done.countDown();
            }
        }

        private void flush(List<WriteModel<Document>> batch) {
            if (batch.isEmpty()) return;
            Instant t0 = Instant.now();
            customCostsRepository.bulkWrite(COLLECTION, new ArrayList<>(batch));
            long took = msSince(t0);
            m.writeMillis.add(took);
            m.batches.increment();
            m.rowsWritten.add(batch.size());
            log.info("[IMPORT] worker {} wrote {} docs in {}ms (q={})", Thread.currentThread().getName(), batch.size(), took, q.size());
            batch.clear();
        }
    }

    // ---------------- utils ----------------

    private static boolean looksLikeHeader(String id, String alias, String name) {
        return eq(id, "ID") || eq(alias, "SNODE_ALIAS") || eq(name, "NME");
    }
    private static boolean isBlank(String s){ return s == null || s.isEmpty(); }
    private static boolean eq(String a,String b){ return a!=null && a.equalsIgnoreCase(b); }
    private static int columnIndex(String ref){ int idx=0; for(int i=0;i<ref.length();i++){ char ch=ref.charAt(i); if(ch>='A'&&ch<='Z') idx=idx*26+(ch-'A'+1); else if(ch>='a'&&ch<='z') idx=idx*26+(ch-'a'+1); else break; } return idx-1; }
    private static long msSince(Instant start){ return Duration.between(start, Instant.now()).toMillis(); }
    package com.jpmorgan.myig.service;

import com.jpmorgan.myig.repository.CustomCostsRepository;
import com.mongodb.client.model.InsertOneModel;
import com.mongodb.client.model.WriteModel;
import com.mongodb.client.result.DeleteResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.openxml4j.opc.OPCPackage;
import org.apache.poi.openxml4j.util.ZipSecureFile;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.xssf.eventusermodel.XSSFReader;
import org.apache.poi.xssf.eventusermodel.XSSFSheetXMLHandler;
import org.apache.poi.xssf.model.SharedStrings;
import org.apache.poi.xssf.model.StylesTable;
import org.apache.poi.xssf.usermodel.XSSFComment;
import org.bson.Document;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.xml.sax.InputSource;
import org.xml.sax.XMLReader;
import org.xml.sax.helpers.XMLReaderFactory;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.LongAdder;
import java.util.regex.Pattern;

/**
 * XLSX/XLSM importer for BU lookup rows (ID, SNODE_ALIAS, NME) -> {type, id, value:{name, sdml1..}}
 * - Target collection is hardcoded to "lookup"
 * - Deletes existing {type:<type>} before insert
 * - Multipart uploads are written to a temp file then parsed using POI event API
 * - S3 is intentionally NOT implemented
 * - Detailed timing logs (end-to-end, per-batch)
 * - OPTIONAL: multi-threaded writer with backpressure
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class XlsxBuImportHandler {

    private final CustomCostsRepository customCostsRepository;

    private static final String COLLECTION = "lookup";
    private static final int BATCH_SIZE = 1000;                 // write batch size
    private static final int QUEUE_CAPACITY = 50_000;           // backpressure buffer
    private static final int WORKERS = Math.max(2, Runtime.getRuntime().availableProcessors());

    
    // For local testing without multipart
    private static final Path DEFAULT_LOCAL_PATH = Paths.get("C:/Users/R751034/Downloads/bu.xlsx");

    /** Entry used by controller when a MultipartFile is uploaded */
    public void handleMultipart(String type, MultipartFile file) {
        Instant t0 = Instant.now();
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Multipart file is required");
        }
        String name = file.getOriginalFilename();
        String suffix = (name != null && name.toLowerCase().endsWith(".xlsm")) ? ".xlsm" : ".xlsx";
        Path tmp = null;
        try {
            tmp = Files.createTempFile("lookup-upload-", suffix);
            Instant tSave = Instant.now();
            file.transferTo(tmp);
            log.info("[IMPORT] saved upload to {} in {}ms", tmp, msSince(tSave));
            handleXlsxImportFromPath(type, tmp);
        } catch (Exception e) {
            log.error("[IMPORT] multipart import failed", e);
            throw new RuntimeException(e);
        } finally {
            if (tmp != null) try { Files.deleteIfExists(tmp); } catch (Exception ignore) {}
            log.info("[IMPORT] multipart total took={}ms", msSince(t0));
        }
    }

    /** Dev helper: process a local fixed file */
    public void handleLocal(String type) { handleXlsxImportFromPath(type, DEFAULT_LOCAL_PATH); }

    /** Main path-based importer (multi-threaded writers) */
    public void handleXlsxImportFromPath(String type, Path filePath) {
        Instant t0 = Instant.now();
        log.info("[IMPORT] type={} path={} workers={} batch={} queueCap={}", type, filePath, WORKERS, BATCH_SIZE, QUEUE_CAPACITY);
        ZipSecureFile.setMinInflateRatio(0.0d);

        // Step 0: delete existing of this type
        Instant tDel = Instant.now();
        DeleteResult del = customCostsRepository.remove(COLLECTION, Query.query(Criteria.where("type").is(type)));
        log.info("[IMPORT] delete type='{}' -> deleted={} took={}ms", type, del.getDeletedCount(), msSince(tDel));

        // Step 1: parse + concurrent write
        try {
            processSingleSheetConcurrent(filePath, type);
        } catch (Exception e) {
            log.error("[IMPORT] parse failed type={} path={}", type, filePath, e);
            throw new RuntimeException(e);
        }
        log.info("[IMPORT] total took={}ms", msSince(t0));
    }

    // ---------------- core concurrent parser ----------------

    private void processSingleSheetConcurrent(Path filePath, String type) throws Exception {
        // shared metrics
        Metrics metrics = new Metrics();
        metrics.start = Instant.now();

        // bounded queue for backpressure
        final Document POISON = new Document("__poison", true);
        BlockingQueue<Document> q = new ArrayBlockingQueue<>(QUEUE_CAPACITY);

        // start writer pool
        ExecutorService pool = Executors.newFixedThreadPool(WORKERS);
        CountDownLatch writersDone = new CountDownLatch(WORKERS);
        for (int i = 0; i < WORKERS; i++) {
            pool.submit(new WriterWorker(q, POISON, writersDone, metrics));
        }

        // ---- parse on this thread and feed queue ----
        Instant tOpen0 = Instant.now();
        try (OPCPackage pkg = OPCPackage.open(filePath.toFile())) {
            log.info("[IMPORT] OPCPackage.open done in {}ms", msSince(tOpen0));

            XSSFReader reader = new XSSFReader(pkg);
            StylesTable styles = reader.getStylesTable();
            SharedStrings sst = reader.getSharedStringsTable();

            DataFormatter fmt = new DataFormatter();
            XMLReader parser = XMLReaderFactory.createXMLReader();
            parser.setContentHandler(new XSSFSheetXMLHandler(styles, null, sst,
                    new ConcurrentBuSheetHandler(type, q, metrics), fmt, false));

            Iterator<InputStream> sheets = reader.getSheetsData();
            if (!sheets.hasNext()) {
                log.warn("[IMPORT] no sheets found in {}", filePath);
                // signal writers to finish with no work
                for (int i = 0; i < WORKERS; i++) q.put(POISON);
                writersDone.await();
                pool.shutdown();
                return;
            }

            Instant tParse0 = Instant.now();
            try (InputStream sheet1 = sheets.next()) {
                parser.parse(new InputSource(sheet1));
            }
            metrics.parseMillis.add(msSince(tParse0));
            log.info("[IMPORT] sheet parsed in {}ms (rows parsed={})", msSince(tParse0), metrics.rowsParsed.sum());
        }

        // send poison pills to stop workers
        for (int i = 0; i < WORKERS; i++) q.put(POISON);
        writersDone.await();
        pool.shutdown();

        log.info("[IMPORT] written={} batches={} writeTime={}ms queueMax={} rowsParsed={}",
                metrics.rowsWritten.sum(), metrics.batches.sum(), metrics.writeMillis.sum(), metrics.maxQueue, metrics.rowsParsed.sum());
    }

    // ---------------- SAX row handler (producer) ----------------

    private class ConcurrentBuSheetHandler implements XSSFSheetXMLHandler.SheetContentsHandler {
        private final String type;
        private final BlockingQueue<Document> q;
        private final Metrics m;

        private String id, alias, name;
        private long lastLogged = 0;

        ConcurrentBuSheetHandler(String type, BlockingQueue<Document> q, Metrics metrics) {
            this.type = type; this.q = q; this.m = metrics;
        }

        @Override public void startRow(int rowNum) { id = alias = name = null; }
        @Override public void headerFooter(String text, boolean isHeader, String tagName) { }

        @Override
        public void cell(String cellRef, String v, XSSFComment c) {
            switch (columnIndex(cellRef)) {
                case 0 -> id = v;      // ID as-is
                case 1 -> alias = v;   // SNODE_ALIAS
                case 2 -> name = v;    // NME
                default -> { }
            }
        }

        @Override
        public void endRow(int rowNum) {
            if (rowNum == 0 && looksLikeHeader(id, alias, name)) return; // header
            if (isBlank(id)) return; // require ID

            Document value = new Document();
            if (name != null) value.append("name", name);
            List<String> sdmls = extractSdmls(alias);
            for (int i = 0; i < sdmls.size(); i++) value.append("sdml" + (i + 1), sdmls.get(i));

            Document doc = new Document("type", type).append("id", id).append("value", value);

            try {
                q.put(doc); // backpressure
                m.rowsParsed.increment();
                int size = q.size();
                if (size > m.maxQueue) m.maxQueue = size;
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                throw new RuntimeException(ie);
            }

            long parsed = m.rowsParsed.sum();
            if (parsed - lastLogged >= 100_000) {
                lastLogged = parsed;
                log.info("[IMPORT] parsed rows={} elapsed={}ms queueSize={}", parsed, msSince(m.start), q.size());
            }
        }
    }

    // ---------------- writer worker (consumer) ----------------

    private class WriterWorker implements Runnable {
        private final BlockingQueue<Document> q;
        private final Document poison;
        private final CountDownLatch done;
        private final Metrics m;

        WriterWorker(BlockingQueue<Document> q, Document poison, CountDownLatch done, Metrics m) {
            this.q = q; this.poison = poison; this.done = done; this.m = m;
        }

        @Override
        public void run() {
            List<WriteModel<Document>> batch = new ArrayList<>(BATCH_SIZE);
            try {
                while (true) {
                    Document d = q.take();
                    if (d == poison) break;
                    batch.add(new InsertOneModel<>(d));
                    if (batch.size() >= BATCH_SIZE) flush(batch);
                }
                flush(batch); // final partial
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                done.countDown();
            }
        }

        private void flush(List<WriteModel<Document>> batch) {
            if (batch.isEmpty()) return;
            Instant t0 = Instant.now();
            customCostsRepository.bulkWrite(COLLECTION, new ArrayList<>(batch));
            long took = msSince(t0);
            m.writeMillis.add(took);
            m.batches.increment();
            m.rowsWritten.add(batch.size());
            log.info("[IMPORT] worker {} wrote {} docs in {}ms (q={})", Thread.currentThread().getName(), batch.size(), took, q.size());
            batch.clear();
        }
    }

    // ---------------- utils ----------------

    private static boolean looksLikeHeader(String id, String alias, String name) {
        return eq(id, "ID") || eq(alias, "SNODE_ALIAS") || eq(name, "NME");
    }
    private static boolean isBlank(String s){ return s == null || s.isEmpty(); }
    private static boolean eq(String a,String b){ return a!=null && a.equalsIgnoreCase(b); }
    private static int columnIndex(String ref){ int idx=0; for(int i=0;i<ref.length();i++){ char ch=ref.charAt(i); if(ch>='A'&&ch<='Z') idx=idx*26+(ch-'A'+1); else if(ch>='a'&&ch<='z') idx=idx*26+(ch-'a'+1); else break; } return idx-1; }
    private static long msSince(Instant start){ return Duration.between(start, Instant.now()).toMillis(); }
    private static List<String> extractSdmls(String alias) {
    if (alias == null) return Collections.emptyList();
    String[] parts = alias.split(Pattern.quote("<-->"), -1); // keep empties, no trim
    if (parts.length <= 1) return Collections.emptyList();    // nothing after the first
    List<String> out = new ArrayList<>(parts.length - 1);
    for (int i = 1; i < parts.length; i++) out.add(parts[i]); // skip index 0
    return out;
}

    private static class Metrics {
        Instant start;
        final LongAdder rowsParsed = new LongAdder();
        final LongAdder rowsWritten = new LongAdder();
        final LongAdder batches = new LongAdder();
        final LongAdder writeMillis = new LongAdder();
        final LongAdder parseMillis = new LongAdder();
        volatile int maxQueue = 0;
    }
}


    private static class Metrics {
        Instant start;
        final LongAdder rowsParsed = new LongAdder();
        final LongAdder rowsWritten = new LongAdder();
        final LongAdder batches = new LongAdder();
        final LongAdder writeMillis = new LongAdder();
        final LongAdder parseMillis = new LongAdder();
        volatile int maxQueue = 0;
    }
}
