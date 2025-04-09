package com.jpmchase.myig.handler;

import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;
import java.util.List;

@Component
public class BillingKeyHeaderHandler {

    @Autowired 
    private MongoTemplate mongoTemplate;

    public Document buildUpdateSection(Document doc, double cost) {
        String ipLongId = doc.getString("ipLongId");
        Integer year = doc.getInteger("year");

        Document billingDoc = mongoTemplate.findOne(
            org.springframework.data.mongodb.core.query.Query.query(
                org.springframework.data.mongodb.core.query.Criteria.where("ipLongId").is(ipLongId)
                        .and("year").is(year)
            ),
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
}