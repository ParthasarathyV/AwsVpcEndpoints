package com.jpmchase.myig.handler;

import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;
import java.util.*;

@Component
public class FinancialsLevel3Handler {

    @Autowired 
    private MongoTemplate mongoTemplate;
    
    @Autowired 
    private AppMappingHandler appMappingHandler;
    
    @Autowired 
    private BillingKeyHandler billingKeyHandler;

    /**
     * Process changes in the financialLevel3 collection.
     * Aggregates cost, monthCost, and monthHC from matching financialLevel3 documents and
     * then composes a single atomic update for FinGrid.
     */
    public void process(Document changedDoc) {
        String ipLongId = changedDoc.getString("ipLongId");
        String scenario = changedDoc.getString("scenario");
        Integer year = changedDoc.getInteger("year");
        String dfKey = scenario + year;

        // Fetch all matching documents
        List<Document> f3Docs = mongoTemplate.find(
            org.springframework.data.mongodb.core.query.Query.query(
                org.springframework.data.mongodb.core.query.Criteria.where("ipLongId").is(ipLongId)
                        .and("scenario").is(scenario)
                        .and("year").is(year)
            ),
            Document.class,
            "financialLevel3"
        );

        List<Double> monthCost = new ArrayList<>(Collections.nCopies(12, 0.0));
        List<Double> monthHC = new ArrayList<>(Collections.nCopies(12, 0.0));
        double totalCost = 0;

        for (Document doc : f3Docs) {
            List<Double> mc = (List<Double>) doc.get("monthCost");
            Double fy = doc.getDouble("fyCost");
            if (fy != null) {
                totalCost += fy;
            }
            if (mc != null && mc.size() == 12) {
                for (int i = 0; i < 12; i++) {
                    monthCost.set(i, monthCost.get(i) + mc.get(i));
                    monthHC.set(i, monthHC.get(i) + mc.get(i)); // Adjust if monthHC is calculated differently
                }
            }
        }

        // Create a stub document for routing information
        Document routingStub = new Document()
                .append("ipLongId", ipLongId)
                .append("scenario", scenario)
                .append("year", year);

        // Build the sub-sections using helper handlers
        Document appMappingsSection = appMappingHandler.buildUpdateSection(routingStub, monthCost);
        Document billingKeySection = billingKeyHandler.buildUpdateSection(routingStub, totalCost);

        // Compose the full update document
        Document updateDoc = new Document()
                .append("cost", totalCost)
                .append("monthCost", monthCost)
                .append("monthHC", monthHC)
                .append("appMappings", appMappingsSection)
                .append("billingKeyHeader", billingKeySection);
                // Taxonomy section can be appended here later

        // Execute a single atomic update in FinGrid
        mongoTemplate.updateFirst(
            org.springframework.data.mongodb.core.query.Query.query(
                org.springframework.data.mongodb.core.query.Criteria.where("longId").is(ipLongId)
            ),
            new org.springframework.data.mongodb.core.query.Update().set("detailedFinancials." + dfKey, updateDoc),
            "FinGrid"
        );

        System.out.printf("[FinancialLevel3Handler] One-shot FinGrid update done for %s | %s | %d%n", ipLongId, scenario, year);
    }
}