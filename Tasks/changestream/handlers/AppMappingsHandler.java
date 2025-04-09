package com.jpmchase.myig.handler;

import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;
import java.util.*;

import static org.springframework.data.mongodb.core.query.Criteria.where;
import static org.springframework.data.mongodb.core.query.Query.query;
import static org.springframework.data.mongodb.core.query.Update.update;

@Component
public class AppMappingsHandler {

    @Autowired 
    private MongoTemplate mongoTemplate;

    public Document buildUpdateSection(Document doc, List<Double> monthCost) {
        String ipLongId = doc.getString("ipLongId");
        String scenario = doc.getString("scenario");
        Integer year = doc.getInteger("year");

        List<Document> relatedMappings = mongoTemplate.find(
            query(where("ipLongId").is(ipLongId)
                  .and("scenario").is(scenario)
                  .and("year").is(year)),
            Document.class,
            "appMappings"
        );

        List<Document> monthValues = new ArrayList<>();
        for (int i = 0; i < 12; i++) {
            List<Document> apps = new ArrayList<>();
            for (Document mapping : relatedMappings) {
                List<Document> months = (List<Document>) mapping.get("months");
                if (months != null && months.size() > i) {
                    Document month = months.get(i);
                    List<Document> appList = (List<Document>) month.get("application");
                    if (appList != null) {
                        for (Document app : appList) {
                            double cost = monthCost.get(i);
                            double capPercent = app.getDouble("ip_cap_percent");
                            double appPercent = app.getDouble("app_percentage");
                            Document enriched = new Document(app)
                                    .append("cap_cost", capPercent * cost)
                                    .append("app_cost", appPercent * cost);
                            apps.add(enriched);
                        }
                    }
                }
            }
            monthValues.add(new Document("month", String.format("%02d", i + 1))
                    .append("application", apps));
        }

        Map<String, Document> yearlyMap = new HashMap<>();
        for (Document mv : monthValues) {
            List<Document> apps = (List<Document>) mv.get("application");
            if (apps != null) {
                for (Document app : apps) {
                    String id = app.getString("app_id");
                    yearlyMap.computeIfAbsent(id, k -> new Document("app_id", id)
                            .append("ip_cap_percent", 0.0)
                            .append("app_percentage", 0.0)
                            .append("cap_cost", 0.0)
                            .append("app_cost", 0.0));
                    Document agg = yearlyMap.get(id);
                    agg.put("ip_cap_percent", agg.getDouble("ip_cap_percent") + app.getDouble("ip_cap_percent"));
                    agg.put("app_percentage", agg.getDouble("app_percentage") + app.getDouble("app_percentage"));
                    agg.put("cap_cost", agg.getDouble("cap_cost") + app.getDouble("cap_cost"));
                    agg.put("app_cost", agg.getDouble("app_cost") + app.getDouble("app_cost"));
                }
            }
        }
        List<Document> yearlyValues = new ArrayList<>(yearlyMap.values());
        return new Document("monthValues", monthValues)
                .append("yearlyValues", yearlyValues);
    }

    // Isolated update: Only update the appMappings field in FinGrid.
    public void updateOnlyAppMappings(Document doc) {
        String ipLongId = doc.getString("ipLongId");
        String scenario = doc.getString("scenario");
        Integer year = doc.getInteger("year");
        String dfKey = scenario + year;

        // Retrieve existing FinGrid document
        Document finGridDoc = mongoTemplate.findOne(
            query(where("longId").is(ipLongId)), 
            Document.class,
            "FinGrid"
        );
        if (finGridDoc == null) return;
        Document detailedFinancials = (Document) finGridDoc.get("detailedFinancials");
        if (detailedFinancials == null || !detailedFinancials.containsKey(dfKey)) return;
        Document dfSection = (Document) detailedFinancials.get(dfKey);
        List<Double> currentMonthCost = (List<Double>) dfSection.get("monthCost");
        if (currentMonthCost == null || currentMonthCost.size() != 12) return;
        
        Document newAppMappings = buildUpdateSection(doc, currentMonthCost);
        
        // Update only the appMappings part of FinGrid
        mongoTemplate.updateFirst(
            query(where("longId").is(ipLongId)),
            new org.springframework.data.mongodb.core.query.Update().set("detailedFinancials." + dfKey + ".appMappings", newAppMappings),
            "FinGrid"
        );
        
        System.out.printf("[AppMappingHandler] Updated appMappings for %s | %s | %d%n", ipLongId, scenario, year);
    }
}
