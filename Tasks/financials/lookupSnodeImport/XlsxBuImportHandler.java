package com.jpmorgan.myig.service;

import com.jpmorgan.myig.repository.CustomCostsRepository;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.ReplaceOneModel;
import com.mongodb.client.model.ReplaceOptions;
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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.xml.sax.InputSource;
import org.xml.sax.XMLReader;
import org.xml.sax.helpers.XMLReaderFactory;

import java.io.InputStream;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.Iterator;
import java.util.List;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.LongAdder;

@Service
@Slf4j
@RequiredArgsConstructor
public class XlsxBuImportHandler {

    private final CustomCostsRepository customCostsRepository;

    private static final String COLLECTION = "lookup";
    private static final String DOC_TYPE   = "bu";          // ensure type matches your cleanup filter

    private static final int BATCH_SIZE     = 10_000;       // tune as needed
    private static final int QUEUE_CAPACITY = 100_000;      // tune as needed

    @Value("${import.lookup.workers:10}")
    private int workers;                                    // default 10

    /**
     * Main entry: process a local file path.
     * - Sets a single run timestamp (updatedDt) used for all rows in this import.
     * - Upserts by (type,id).
     * - After processing, fires a background cleanup: { type: 'bu', updatedDt: { $ne: runTs } }.
     */
    public void handleXlsxImportFromPath(String ignoredTypeParam, Path filePath) {
        Instant t0 = Instant.now();
        Date runTs = new Date(); // one timestamp for the whole run

        log.info("[IMPORT] type={} path={} workers={} batch={} queueCap={} updatedDt={}",
                DOC_TYPE, filePath, workers, BATCH_SIZE, QUEUE_CAPACITY, runTs);

        ZipSecureFile.setMinInflateRatio(0.0d);

        try {
            processSingleSheetConcurrent(filePath, runTs);
        } catch (Exception e) {
            log.error("[IMPORT] parse failed type={} path={}", DOC_TYPE, filePath, e);
            throw new RuntimeException(e);
        }

        // Background cleanup AFTER import: delete docs not from this run
        CompletableFuture.runAsync(() -> {
            Instant tDel = Instant.now();
            Query q = new Query()
                    .addCriteria(Criteria.where("type").is(DOC_TYPE))
                    .addCriteria(Criteria.where("updatedDt").ne(runTs));
            DeleteResult dr = customCostsRepository.remove(COLLECTION, q);
            log.info("[CLEANUP] removed old docs type={} count={} took={}ms",
                    DOC_TYPE, dr.getDeletedCount(), msSince(tDel));
        });

        log.info("[IMPORT] total took={}ms", msSince(t0));
    }

    // ---------- parse + concurrent write ----------
    private void processSingleSheetConcurrent(Path filePath, Date runTs) throws Exception {
        Metrics metrics = new Metrics();
        metrics.start = Instant.now();

        final Document POISON = new Document("__poison", true);
        BlockingQueue<Document> q = new ArrayBlockingQueue<>(QUEUE_CAPACITY);

        ExecutorService pool = Executors.newFixedThreadPool(workers);
        CountDownLatch writersDone = new CountDownLatch(writers);
        for (int i = 0; i < workers; i++) {
            pool.submit(new WriterWorker(q, POISON, writersDone, metrics));
        }

        Instant tOpen0 = Instant.now();
        try (OPCPackage pkg = OPCPackage.open(filePath.toFile())) {
            log.info("[IMPORT] OPCPackage.open done in {}ms", msSince(tOpen0));

            XSSFReader reader = new XSSFReader(pkg);
            StylesTable styles = reader.getStylesTable();
            SharedStrings sst  = reader.getSharedStringsTable();

            DataFormatter fmt = new DataFormatter();
            XMLReader parser = XMLReaderFactory.createXMLReader();
            parser.setContentHandler(new XSSFSheetXMLHandler(
                    styles, null, sst,
                    new ConcurrentBuSheetHandler(q, metrics, runTs),
                    fmt,
                    false));

            Iterator<InputStream> sheets = reader.getSheetsData();
            if (!sheets.hasNext()) {
                log.warn("[IMPORT] no sheets found in {}", filePath);
                for (int i = 0; i < workers; i++) q.put(POISON);
                writersDone.await();
                pool.shutdown();
                return;
            }

            Instant tParse0 = Instant.now();
            try (InputStream sheet1 = sheets.next()) {
                parser.parse(new InputSource(sheet1));
            }
            metrics.parseMillis.add(msSince(tParse0));
            log.info("[IMPORT] sheet parsed in {}ms (rows parsed={})",
                    msSince(tParse0), metrics.rowsParsed.sum());
        }

        for (int i = 0; i < workers; i++) q.put(POISON);
        writersDone.await();
        pool.shutdown();

        log.info("[IMPORT] Consolidated Report: batches={} writeTime={}ms queueMax={} rowsParsed={}",
                metrics.batches.sum(), metrics.writeMillis.sum(), metrics.maxQueue, metrics.rowsParsed.sum());
    }

    // ---------- SAX handler (producer) ----------
    private static class ConcurrentBuSheetHandler implements XSSFSheetXMLHandler.SheetContentsHandler {
        private final BlockingQueue<Document> q;
        private final Metrics m;
        private final Date runTs;

        private String id, alias, name;
        private long lastLogged = 0;

        ConcurrentBuSheetHandler(BlockingQueue<Document> q, Metrics metrics, Date runTs) {
            this.q = q; this.m = metrics; this.runTs = runTs;
        }

        @Override public void startRow(int rowNum) { id = alias = name = null; }
        @Override public void headerFooter(String text, boolean isHeader, String tagName) { }

        @Override
        public void cell(String cellRef, String v, XSSFComment c) {
            switch (columnIndex(cellRef)) {
                case 0 -> id    = v;   // ID as-is
                case 1 -> alias = v;   // SNODE_ALIAS as-is
                case 2 -> name  = v;   // NME as-is
                default -> { }
            }
        }

        @Override
        public void endRow(int rowNum) {
            if (rowNum == 0 && looksLikeHeader(id, alias, name)) return; // header
            if (isBlank(id)) return; // require ID (no trim)

            Document value = new Document();
            if (name != null) value.append("name", name);

            // Split SNODE_ALIAS on "<-->" and DROP the first token
            List<String> sdmls = extractSdmls(alias);
            for (int i = 0; i < sdmls.size(); i++) value.append("sdml" + (i + 1), sdmls.get(i));

            Document doc = new Document("type", DOC_TYPE)
                    .append("id", id)
                    .append("value", value)
                    .append("updatedDt", runTs);  // same timestamp for this import

            try {
                q.put(doc);
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
                log.info("[IMPORT] parsed rows={} elapsed={}ms queueSize={}",
                        parsed, msSince(m.start), q.size());
            }
        }
    }

    // ---------- writer workers (consumers) ----------
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

                    // Upsert by (type, id), replacing entire document
                    var filter  = Filters.and(Filters.eq("type", d.getString("type")),
                                              Filters.eq("id",   d.getString("id")));
                    var replace = new ReplaceOneModel<>(filter, d, new ReplaceOptions().upsert(true));
                    batch.add(replace);

                    if (batch.size() >= BATCH_SIZE) batch = flush(batch);
                }
                batch = flush(batch); // final
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                done.countDown();
            }
        }

        private List<WriteModel<Document>> flush(List<WriteModel<Document>> batch) {
            if (batch.isEmpty()) return batch;
            Instant t0 = Instant.now();
            customCostsRepository.bulkWrite(COLLECTION, batch); // repository should use unordered+bypassValidation
            long took = msSince(t0);
            m.writeMillis.add(took);
            m.batches.increment();
            m.rowsWritten.add(batch.size());
            log.info("[IMPORT] {} upserted {} docs in {}ms (q={})",
                    Thread.currentThread().getName(), batch.size(), took, q.size());
            return new ArrayList<>(BATCH_SIZE);
        }
    }

    // ---------- utils ----------
    private static boolean looksLikeHeader(String id, String alias, String name) {
        return eq(id, "ID") || eq(alias, "SNODE_ALIAS") || eq(name, "NME");
    }
    private static boolean isBlank(String s){ return s == null || s.isEmpty(); }
    private static boolean eq(String a,String b){ return a != null && a.equalsIgnoreCase(b); }
    private static int columnIndex(String ref){
        int idx=0; for (int i=0;i<ref.length();i++){
            char ch=ref.charAt(i);
            if (ch>='A'&&ch<='Z') idx=idx*26+(ch-'A'+1);
            else if (ch>='a'&&ch<='z') idx=idx*26+(ch-'a'+1);
            else break;
        }
        return idx-1;
    }
    private static long msSince(Instant start){ return Duration.between(start, Instant.now()).toMillis(); }

    private static List<String> extractSdmls(String alias){
        if (alias == null) return Collections.emptyList();
        String[] parts = alias.split(java.util.regex.Pattern.quote("<-->"), -1); // keep empties
        if (parts.length <= 1) return Collections.emptyList();                   // nothing after the first
        List<String> out = new ArrayList<>(parts.length - 1);
        for (int i = 1; i < parts.length; i++) out.add(parts[i]);               // drop element[0]
        return out;
    }

    private static class Metrics {
        Instant start;
        final LongAdder rowsParsed  = new LongAdder();
        final LongAdder rowsWritten = new LongAdder();
        final LongAdder batches     = new LongAdder();
        final LongAdder writeMillis = new LongAdder();
        final LongAdder parseMillis = new LongAdder();
        volatile int    maxQueue    = 0;
    }
}
