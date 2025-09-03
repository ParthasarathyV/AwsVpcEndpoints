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
import org.apache.poi.xssf.model.SharedStringsTable;
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
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * XLSX/XLSM importer for BU lookup rows (ID, SNODE_ALIAS, NME) -> {type, id, value:{name, sdml1..}}
 * - Target collection is hardcoded to "lookup"
 * - Deletes existing {type:<type>} before insert
 * - Multipart uploads are written to a temp file then parsed using POI event API
 * - S3 is intentionally NOT implemented (by request)
 * - Detailed timing logs at each major step
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class XlsxBuImportHandler {

    private final CustomCostsRepository customCostsRepository;

    private static final String COLLECTION = "lookup";
    private static final int BATCH_SIZE = 1000;

    // For local testing without multipart
    private static final Path DEFAULT_LOCAL_PATH = Paths.get("C:/Users/R751034/Downloads/bu.xlsx");

    /** Entry used by controller when a MultipartFile is uploaded */
    public void handleMultipart(String type, MultipartFile file) {
        Instant t0 = Instant.now();
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Multipart file is required");
        }
        String suffix = (file.getOriginalFilename() != null && file.getOriginalFilename().toLowerCase().endsWith(".xlsm")) ? ".xlsm" : ".xlsx";
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

    /** Main path-based importer */
    public void handleXlsxImportFromPath(String type, Path filePath) {
        Instant t0 = Instant.now();
        log.info("[IMPORT] type={} path={}", type, filePath);
        ZipSecureFile.setMinInflateRatio(0.0d);

        Instant tDel = Instant.now();
        DeleteResult del = customCostsRepository.remove(COLLECTION, Query.query(Criteria.where("type").is(type)));
        log.info("[IMPORT] delete type='{}' -> deleted={} took={}ms", type, del.getDeletedCount(), msSince(tDel));

        Instant tParse = Instant.now();
        try {
            processSingleSheet(filePath, type);
        } catch (Exception e) {
            log.error("[IMPORT] parse failed type={} path={}", type, filePath, e);
            throw new RuntimeException(e);
        }
        log.info("[IMPORT] parse+write took={}ms", msSince(tParse));
        log.info("[IMPORT] total took={}ms", msSince(t0));
    }

    // ---------- Core parser ----------

    private void processSingleSheet(Path filePath, String type) throws Exception {
        Instant tOpen0 = Instant.now();
        try (OPCPackage pkg = OPCPackage.open(filePath.toFile())) {
            log.info("[IMPORT] OPCPackage.open done in {}ms", msSince(tOpen0));

            Instant tReader0 = Instant.now();
            XSSFReader reader = new XSSFReader(pkg);
            log.info("[IMPORT] XSSFReader created in {}ms", msSince(tReader0));

            StylesTable styles = reader.getStylesTable();
            SharedStringsTable sst = reader.getSharedStringsTable();
            log.info("[IMPORT] styles+sst ready");

            BuSheetHandler handler = new BuSheetHandler(type);
            DataFormatter fmt = new DataFormatter();
            XSSFSheetXMLHandler sheetParser = new XSSFSheetXMLHandler(styles, null, sst, handler, fmt, false);

            XMLReader parser = XMLReaderFactory.createXMLReader();
            parser.setContentHandler(sheetParser);

            Iterator<InputStream> sheets = reader.getSheetsData();
            if (!sheets.hasNext()) {
                log.warn("[IMPORT] no sheets found in {}", filePath);
                return;
            }

            Instant tParse0 = Instant.now();
            try (InputStream sheet1 = sheets.next()) {
                parser.parse(new InputSource(sheet1));
                handler.flushRemaining();
            }
            log.info("[IMPORT] sheet parsed in {}ms", msSince(tParse0));

            if (sheets.hasNext()) {
                log.warn("[IMPORT] multiple sheets detected; only first processed");
            }
        }
    }

    // ---------- Inner handler ----------

    private class BuSheetHandler implements XSSFSheetXMLHandler.SheetContentsHandler {
        private final String type;
        private final List<WriteModel<Document>> batch = new ArrayList<>();
        private long rows; private long lastLogRows;
        private Instant batchStart = Instant.now();
        private Instant parseStart = Instant.now();
        private String id, alias, name;

        BuSheetHandler(String type) { this.type = type; this.parseStart = Instant.now(); }

        @Override public void startRow(int rowNum) { id = alias = name = null; }
        @Override public void headerFooter(String text, boolean isHeader, String tagName) { }
        @Override public void cell(String cellRef, String v, XSSFComment c) {
            switch (columnIndex(cellRef)) {
                case 0 -> id = trim(v);    // A: ID
                case 1 -> alias = trim(v); // B: SNODE_ALIAS
                case 2 -> name = trim(v);  // C: NME
                default -> { }
            }
        }
        @Override public void endRow(int rowNum) {
            rows++;
            if (rowNum == 0 && looksLikeHeader(id, alias, name)) return;
            if (isBlank(id)) return;

            List<String> sdmls = extractSdmls(safe(alias));
            Document value = new Document("name", safe(name));
            for (int i = 0; i < sdmls.size(); i++) value.append("sdml" + (i + 1), sdmls.get(i));

            Document doc = new Document("type", type)
                    .append("id", "S" + safe(id))
                    .append("value", value);

            batch.add(new InsertOneModel<>(doc));
            if (batch.size() >= BATCH_SIZE) flushBatch();

            if (rows - lastLogRows >= 100_000) { lastLogRows = rows; log.info("[IMPORT] parsed rows={} elapsed={}ms", rows, msSince(parseStart)); }
        }
        void flushRemaining() { flushBatch(); }
        private void flushBatch() {
            if (batch.isEmpty()) return;
            long cnt = batch.size(); Instant t0 = Instant.now();
            customCostsRepository.bulkWrite(COLLECTION, new ArrayList<>(batch));
            log.info("[IMPORT] batch write docs={} took={}ms (since last {})", cnt, msSince(t0), msSince(batchStart));
            batch.clear(); batchStart = Instant.now();
        }
        // utils
        private boolean looksLikeHeader(String id, String alias, String name) { return eq(id,"ID")||eq(alias,"SNODE_ALIAS")||eq(name,"NME"); }
        private int columnIndex(String ref){int idx=0;for(int i=0;i<ref.length();i++){char ch=ref.charAt(i);if(ch>='A'&&ch<='Z')idx=idx*26+(ch-'A'+1);else if(ch>='a'&&ch<='z')idx=idx*26+(ch-'a'+1);else break;}return idx-1;}
        private boolean isBlank(String s){return s==null||s.trim().isEmpty();}
        private String trim(String s){return s==null?null:s.trim();}
        private boolean eq(String a,String b){return a!=null&&a.equalsIgnoreCase(b);}    
        private String safe(String s){return s==null?"":s;}
        private List<String> extractSdmls(String alias){List<String> out=new ArrayList<>();if(alias==null)return out;Matcher m=Pattern.compile("S\d+-[^<]+").matcher(alias);while(m.find())out.add(m.group().trim());return out;}
    }

    private static long msSince(Instant start) { return Duration.between(start, Instant.now()).toMillis(); }
}
