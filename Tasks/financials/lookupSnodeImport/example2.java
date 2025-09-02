package com.jpmorgan.myig.service;

import com.jpmorgan.myig.repository.CustomCostsRepository;
import com.mongodb.client.model.InsertOneModel;
import com.mongodb.client.model.WriteModel;
import com.mongodb.client.result.DeleteResult;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.openxml4j.opc.OPCPackage;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.xssf.eventusermodel.ReadOnlySharedStringsTable;
import org.apache.poi.xssf.eventusermodel.XSSFReader;
import org.apache.poi.xssf.eventusermodel.XSSFSheetXMLHandler;
import org.apache.poi.xssf.model.StylesTable;
import org.apache.poi.xssf.usermodel.XSSFComment;
import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.xml.sax.InputSource;
import org.xml.sax.XMLReader;
import org.xml.sax.helpers.XMLReaderFactory;

import java.io.FileInputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Minimal Excel importer for a single-sheet XLSX/XLSM with 3 columns: ID, SNODE_ALIAS, NME.
 * - Hardcoded target collection: "lookup"
 * - API: handleXlsxImport(String type, String s3Link)
 * - Deletes existing {type:<type>} and inserts new docs with the same type
 * - S3 link is NOT implemented yet; always reads from local DEFAULT_LOCAL_PATH
 */
@Service
@Slf4j
public class XlsxImportHandler {

    @Autowired
    private CustomCostsRepository customCostsRepository;

    private static final int BATCH_SIZE = 1000;
    private static final String DEFAULT_LOCAL_PATH = "C:\\Users\\R751034\\Downloads\\bu.xlsx";
    private static final String COLLECTION = "lookup";

    /**
     * Entry point. Example: handleXlsxImport("bu", null)
     */
    public void handleXlsxImport(String type, String s3Link) {
        log.info("Starting XLSX import. type={}, collection={}", type, COLLECTION);
        try (InputStream in = resolveLocalInputStream(s3Link)) {
            // 0) Delete existing documents for this type
            Query deleteQuery = Query.query(Criteria.where("type").is(type));
            DeleteResult del = customCostsRepository.remove(COLLECTION, deleteQuery);
            log.info("Deleted {} existing documents with type '{}' in '{}'", del.getDeletedCount(), type, COLLECTION);

            // 1) Parse single sheet and write in batches
            processSingleSheet(in, type);
            log.info("Import completed. type={}, collection={}", type, COLLECTION);
        } catch (Exception e) {
            log.error("XLSX import failed. type=" + type + ", collection=" + COLLECTION, e);
        }
    }

    /**
     * S3 processing is NOT implemented yet. Always use local file.
     */
    private InputStream resolveLocalInputStream(String s3Link) throws Exception {
        if (s3Link != null && !s3Link.isBlank()) {
            log.warn("S3 link provided but not implemented yet ({}). Falling back to local file.", s3Link);
        }
        log.info("Reading local file: {}", DEFAULT_LOCAL_PATH);
        return new FileInputStream(DEFAULT_LOCAL_PATH);
    }

    private void processSingleSheet(InputStream in, String type) throws Exception {
        try (OPCPackage pkg = OPCPackage.open(in)) {
            XSSFReader reader = new XSSFReader(pkg);
            StylesTable styles = reader.getStylesTable();
            ReadOnlySharedStringsTable strings = new ReadOnlySharedStringsTable(pkg);

            // Minimal handler for 3 columns on a single sheet
            BuSheetHandler handler = new BuSheetHandler(type);
            DataFormatter formatter = new DataFormatter();
            XSSFSheetXMLHandler sheetParser = new XSSFSheetXMLHandler(styles, null, strings, handler, formatter, false);

            XMLReader parser = XMLReaderFactory.createXMLReader();
            parser.setContentHandler(sheetParser);

            Iterator<InputStream> sheets = reader.getSheetsData();
            if (!sheets.hasNext()) {
                log.warn("No sheets found in workbook");
                return;
            }
            try (InputStream sheet1 = sheets.next()) {
                parser.parse(new InputSource(sheet1));
            }
            if (sheets.hasNext()) {
                log.warn("Multiple sheets detected; only Sheet 1 was processed.");
            }
        }
    }

    /**
     * Reads only columns A,B,C -> ID, SNODE_ALIAS, NME and writes batched inserts into the fixed collection.
     */
    private class BuSheetHandler implements XSSFSheetXMLHandler.SheetContentsHandler {
        private final String type;
        private final List<WriteModel<Document>> batch = new ArrayList<>();

        // Row state
        private String id;
        private String alias;
        private String name;

        BuSheetHandler(String type) { this.type = type; }

        @Override public void startRow(int rowNum) { id = alias = name = null; }

        @Override
        public void endRow(int rowNum) {
            // Skip header row if present
            if (rowNum == 0 && looksLikeHeader(id, alias, name)) return;
            if (isBlank(id) && isBlank(alias) && isBlank(name)) return;
            if (isBlank(id)) return; // require ID

            Document value = new Document("name", safe(name));
            List<String> sdmls = extractSdmls(safe(alias));
            for (int i = 0; i < sdmls.size(); i++) value.append("sdml" + (i + 1), sdmls.get(i));

            Document doc = new Document("type", type)
                    .append("id", "S" + safe(id))
                    .append("value", value);

            batch.add(new InsertOneModel<>(doc));
            if (batch.size() >= BATCH_SIZE) flushBatch();
        }

        @Override public void headerFooter(String text, boolean isHeader, String tag) { /* ignore */ }

        @Override
        public void cell(String cellRef, String formattedValue, XSSFComment comment) {
            int col = columnIndex(cellRef);
            switch (col) {
                case 0 -> id = trim(formattedValue);    // A: ID
                case 1 -> alias = trim(formattedValue); // B: SNODE_ALIAS
                case 2 -> name = trim(formattedValue);  // C: NME
                default -> { /* ignore */ }
            }
        }

        @Override public void endSheet() { flushBatch(); }

        private void flushBatch() {
            if (batch.isEmpty()) return;
            customCostsRepository.bulkWrite(COLLECTION, new ArrayList<>(batch));
            batch.clear();
        }

        private boolean looksLikeHeader(String id, String alias, String name) {
            return equalsIgnoreCase(id, "ID") || equalsIgnoreCase(alias, "SNODE_ALIAS") || equalsIgnoreCase(name, "NME");
        }

        private List<String> extractSdmls(String alias) {
            List<String> result = new ArrayList<>();
            if (alias == null) return result;
            Matcher m = Pattern.compile("S\\d+-[^<]+").matcher(alias);
            while (m.find()) result.add(m.group().trim());
            return result;
        }

        private int columnIndex(String cellRef) {
            // Convert cell ref like "A1" -> 0, "B1" -> 1, "AA1" -> 26
            int idx = 0;
            for (int i = 0; i < cellRef.length(); i++) {
                char ch = cellRef.charAt(i);
                if (ch >= 'A' && ch <= 'Z') idx = idx * 26 + (ch - 'A' + 1);
                else if (ch >= 'a' && ch <= 'z') idx = idx * 26 + (ch - 'a' + 1);
                else break; // digits reached
            }
            return idx - 1;
        }

        private boolean isBlank(String s) { return s == null || s.trim().isEmpty(); }
        private String trim(String s) { return s == null ? null : s.trim(); }
        private boolean equalsIgnoreCase(String a, String b) { return a != null && a.equalsIgnoreCase(b); }
        private String safe(String s) { return s == null ? "" : s; }
    }
}
