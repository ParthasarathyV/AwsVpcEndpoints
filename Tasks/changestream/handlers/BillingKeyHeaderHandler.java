package com.jpmchase.myig.handler;

import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;
import java.util.List;

import static org.springframework.data.mongodb.core.query.Criteria.where;
import static org.springframework.data.mongodb.core.query.Query.query;

@Component
public class BillingKeyHeaderHandler {

    @Autowired 
    private MongoTemplate mongoTemplate;

    public Document buildUpdateSection(Document doc, double cost) {
        String ipLongId = doc.getString("ipLongId");
        Integer year = doc.getInteger("year");

        Document billingDoc = mongoTemplate.findOne(
            query(where("ipLongId").is(ipLongId).and("year").is(year)),
            Document.class,
            "billingKeyHeader"
        );
        if (billingDoc == null || !billingDoc.containsKey("allocations")) {
            return new Document();
        }
        List<Document> allocations = (List<Document>) billingDoc.get("allocations");
        for (Document alloc : allocations) {
            double percent = alloc.getDouble("ALLOC_PERCENT");
            alloc.put("allocCost", percent * cost);
        }
        return new Document("allocations", allocations);
    }

    // Isolated update: only update billingKeyHeader section in FinGrid.
    public void updateOnlyBillingKey(Document doc) {
        String ipLongId = doc.getString("ipLongId");
        String scenario = doc.getString("scenario");
        Integer year = doc.getInteger("year");
        String dfKey = scenario + year;

        // Retrieve current FinGrid document
        Document finGridDoc = mongoTemplate.findOne(
            query(where("longId").is(ipLongId)),
            Document.class,
            "FinGrid"
        );
        if (finGridDoc == null) return;
        Document detailedFinancials = (Document) finGridDoc.get("detailedFinancials");
        if (detailedFinancials == null || !detailedFinancials.containsKey(dfKey)) return;
        Document dfSection = (Document) detailedFinancials.get(dfKey);
        Double currentCost = dfSection.getDouble("cost");
        if (currentCost == null) return;
        
        Document newBillingKey = buildUpdateSection(doc, currentCost);
        
        // Update only the billingKeyHeader portion
        mongoTemplate.updateFirst(
            query(where("longId").is(ipLongId)),
            new org.springframework.data.mongodb.core.query.Update().set("detailedFinancials." + dfKey + ".billingKeyHeader", newBillingKey),
            "FinGrid"
        );
        
        System.out.printf("[BillingKeyHandler] Updated billingKeyHeader for %s | %s | %d%n", ipLongId, scenario, year);
    }
}
