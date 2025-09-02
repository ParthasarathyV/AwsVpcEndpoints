package com.jpmorgan.myig.service;

import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.S3Object;
import com.jpmorgan.myig.repository.CustomCostsRepository;
import com.mongodb.client.result.DeleteResult;
import com.mongodb.client.result.BulkWriteResult;
import com.monitorjbl.xlsx.StreamingReader;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import com.mongodb.client.model.InsertOneModel;
import com.mongodb.client.model.WriteModel;

import java.io.*;
import java.util.*;
import java.util.regex.*;

@Service
@Slf4j
public class XlsxImportHandler {

    @Autowired
    private AmazonS3 s3Client;

    @Autowired
    private CustomCostsRepository customCostsRepository;

    private static final int BATCH_SIZE = 1000;
    private static final String DEFAULT_LOCAL_PATH = "C:\\Users\\R751034\\Downloads\\bu.xlsx";

    public void handleXlsxImport(final String dbName, final String collectionName, final String s3Link) {
        log.info("Starting XLSX import for collection '{}'", collectionName);

        try (InputStream inputStream = resolveInputStream(s3Link)) {

            // Step 0: Delete existing documents with type = 'bu'
            Query deleteQuery = Query.query(Criteria.where("type").is("bu"));
            DeleteResult deleteResult = customCostsRepository.remove(collectionName, deleteQuery);
            log.info("Deleted {} documents with type 'bu'", deleteResult.getDeletedCount());

            // Step 1: Process Excel and insert new data
            processExcelStream(inputStream, collectionName);
            log.info("XLSX import completed successfully for collection '{}'", collectionName);

        } catch (Exception e) {
            log.error("Error during XLSX import for collection '{}'", collectionName, e);
        }
    }

    private InputStream resolveInputStream(String s3Link) throws IOException {
        if (s3Link != null && s3Link.startsWith("s3://")) {
            log.info("Reading file from S3: {}", s3Link);
            String[] parts = s3Link.substring(5).split("/", 2);
            String bucket = parts[0];
            String key = parts[1];
            S3Object s3Object = s3Client.getObject(bucket, key);
            return s3Object.getObjectContent();
        } else {
            log.info("No valid S3 link provided. Falling back to local file: {}", DEFAULT_LOCAL_PATH);
            return new FileInputStream(DEFAULT_LOCAL_PATH);
        }
    }

    private void processExcelStream(InputStream inputStream, String collectionName) throws IOException {
        try (Workbook workbook = StreamingReader.builder()
                .rowCacheSize(100)
                .bufferSize(4096)
                .open(inputStream)) {

            Sheet sheet = workbook.getSheetAt(0);
            List<WriteModel<Document>> batchOps = new ArrayList<>();
            int rowCount = 0;

            for (Row row : sheet) {
                if (row.getRowNum() == 0) continue; // skip header row

                String id = getCellValue(row.getCell(0));
                String alias = getCellValue(row.getCell(1));
                String name = getCellValue(row.getCell(2));

                Document doc = toJson(id, alias, name);
                batchOps.add(new InsertOneModel<>(doc));

                if (++rowCount % BATCH_SIZE == 0) {
                    BulkWriteResult result = customCostsRepository.bulkWrite(collectionName, batchOps);
                    log.debug("Inserted batch of {} documents", result.getInsertedCount());
                    batchOps.clear();
                }
            }

            if (!batchOps.isEmpty()) {
                BulkWriteResult result = customCostsRepository.bulkWrite(collectionName, batchOps);
                log.debug("Inserted final batch of {} documents", result.getInsertedCount());
            }

            log.info("Processed total {} rows from Excel", rowCount);
        }
    }

    private Document toJson(String id, String alias, String name) {
        Document doc = new Document("type", "bu")
                .append("id", "S" + id);

        Document value = new Document("name", name);
        List<String> sdmls = extractSdmls(alias);
        for (int i = 0; i < sdmls.size(); i++) {
            value.append("sdml" + (i + 1), sdmls.get(i));
        }

        doc.append("value", value);
        return doc;
    }

    private List<String> extractSdmls(String alias) {
        List<String> result = new ArrayList<>();
        Matcher matcher = Pattern.compile("S\\d+-[^<]+").matcher(alias);
        while (matcher.find()) {
            result.add(matcher.group().trim());
        }
        return result;
    }

    private String getCellValue(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> String.valueOf((long) cell.getNumericCellValue()); // assume it's an ID
            default -> "";
        };
    }
}
