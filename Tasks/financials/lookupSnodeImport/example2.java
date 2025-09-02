package com.jpmorgan.myig.service;

import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.S3Object;
import com.jpmorgan.myig.repository.CustomCostsRepository;
import com.mongodb.client.model.InsertOneModel;
import com.mongodb.client.model.WriteModel;
import com.mongodb.client.result.DeleteResult;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.openxml4j.opc.OPCPackage;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.xssf.eventusermodel.ReadOnlySharedStringsTable;
import org.apache.poi.xssf.eventusermodel.XSSFReader;
import org.apache.poi.xssf.model.StylesTable;
import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.xml.sax.Attributes;
import org.xml.sax.InputSource;
import org.xml.sax.XMLReader;
import org.xml.sax.helpers.DefaultHandler;
import org.xml.sax.helpers.XMLReaderFactory;

import java.io.FileInputStream;
import java.io.InputStream;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Slf4j
public class XlsxImportHandler {

    @Autowired
    private AmazonS3 s3Client;

    @Autowired
    private CustomCostsRepository customCostsRepository;

    private static final int BATCH_SIZE = 1000;
    private static final String DEFAULT_LOCAL_PATH = "C:\\Users\\R751034\\Downloads\\bu.xlsx";

    public void handleXlsxImport(String dbName, String collectionName, String s3Link) {
        try (InputStream in = resolveInputStream(s3Link)) {
            Query deleteQuery = Query.query(Criteria.where("type").is("bu"));
            DeleteResult deleteResult = customCostsRepository.remove(collectionName, deleteQuery);
            log.info("Deleted {} existing documents with type 'bu'", deleteResult.getDeletedCount());
            processWithSax(in, collectionName);
        } catch (Exception e) {
            log.error("Error during XLSX import", e);
        }
    }

    private InputStream resolveInputStream(String s3Link) throws Exception {
        if (s3Link != null && s3Link.startsWith("s3://")) {
            String[] parts = s3Link.substring(5).split("/", 2);
            return s3Client.getObject(parts[0], parts[1]).getObjectContent();
        } else {
            return new FileInputStream(DEFAULT_LOCAL_PATH);
        }
    }

    private void processWithSax(InputStream in, String collectionName) throws Exception {
        OPCPackage pkg = OPCPackage.open(in);
        XSSFReader reader = new XSSFReader(pkg);
        StylesTable styles = reader.getStylesTable();
        ReadOnlySharedStringsTable strings = new ReadOnlySharedStringsTable(pkg);

        XMLReader parser = XMLReaderFactory.createXMLReader();
        SheetHandler handler = new SheetHandler(strings, collectionName);
        parser.setContentHandler(handler);

        try (InputStream sheet = reader.getSheetsData().next()) {
            parser.parse(new InputSource(sheet));
        }
    }

    private class SheetHandler extends DefaultHandler {
        private final ReadOnlySharedStringsTable sst;
        private final List<WriteModel<Document>> batch = new ArrayList<>();
        private final String collectionName;
        private final DataFormatter formatter = new DataFormatter();

        private String currentCellValue;
        private boolean isString;
        private int colIndex = 0;
        private List<String> rowValues = new ArrayList<>();

        public SheetHandler(ReadOnlySharedStringsTable sst, String collectionName) {
            this.sst = sst;
            this.collectionName = collectionName;
        }

        @Override
        public void startElement(String uri, String localName, String qName, Attributes attributes) {
            if ("c".equals(qName)) {
                isString = "s".equals(attributes.getValue("t"));
                currentCellValue = "";
            }
        }

        @Override
        public void characters(char[] ch, int start, int length) {
            currentCellValue += new String(ch, start, length);
        }

        @Override
        public void endElement(String uri, String localName, String qName) {
            if ("v".equals(qName)) {
                String value = isString ? sst.getItemAt(Integer.parseInt(currentCellValue)).getString() : currentCellValue;
                rowValues.add(value.trim());
                colIndex++;
            }

            if ("row".equals(qName)) {
                if (rowValues.size() >= 3 && !"ID".equalsIgnoreCase(rowValues.get(0))) {
                    String id = rowValues.get(0);
                    String alias = rowValues.get(1);
                    String name = rowValues.get(2);

                    Document doc = new Document("type", "bu")
                            .append("id", "S" + id)
                            .append("value", new Document("name", name));

                    List<String> sdmls = extractSdmls(alias);
                    for (int i = 0; i < sdmls.size(); i++) {
                        doc.get("value", Document.class).append("sdml" + (i + 1), sdmls.get(i));
                    }

                    batch.add(new InsertOneModel<>(doc));
                    if (batch.size() == BATCH_SIZE) {
                        customCostsRepository.bulkWrite(collectionName, new ArrayList<>(batch));
                        batch.clear();
                    }
                }
                rowValues.clear();
                colIndex = 0;
            }
        }

        @Override
        public void endDocument() {
            if (!batch.isEmpty()) {
                customCostsRepository.bulkWrite(collectionName, batch);
                log.info("Final batch write complete. Total documents written: {}", batch.size());
            }
        }

        private List<String> extractSdmls(String alias) {
            List<String> result = new ArrayList<>();
            Matcher matcher = Pattern.compile("S\\d+-[^<]+?").matcher(alias);
            while (matcher.find()) result.add(matcher.group().trim());
            return result;
        }
    }
}
