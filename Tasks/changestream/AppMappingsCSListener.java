package com.jpmchase.myig.changestream;

import com.mongodb.client.*;
import com.mongodb.client.model.Aggregates;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.changestream.ChangeStreamDocument;
import org.bson.Document;
import org.bson.conversions.Bson;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.util.*;

@Component
public class AppMappingsChangeStreamListener {

    @Autowired
    private MongoTemplate mongoTemplate;

    @PostConstruct
    public void initChangeStream() {
        System.out.println("\n[ChangeStream] Starting listener on 'appMappings'...\n");

        MongoCollection<Document> appMappings =
                mongoTemplate.getCollection("appMappings");

        List<Bson> pipeline = List.of(Aggregates.match(Filters.eq("operationType", "update")));

        new Thread(() -> {
            try (MongoChangeStreamCursor<ChangeStreamDocument<Document>> cursor =
                         appMappings.watch(pipeline).cursor()) {

                System.out.println("[ChangeStream] Connected to MongoDB.");
                System.out.println("[ChangeStream] Watching for updates in 'appMappings'...");

                while (cursor.hasNext()) {
                    ChangeStreamDocument<Document> change = cursor.next();
                    Document updatedDoc = appMappings.find(
                            Filters.eq("_id", change.getDocumentKey().getObjectId("_id"))
                    ).first();

                    System.out.println("[ChangeStream] Update detected → _id: " + change.getDocumentKey().getObjectId("_id"));

                    handleAppMappingUpdate(updatedDoc);
                }

            } catch (Exception e) {
                System.err.println("[ChangeStream] Listener error:");
                e.printStackTrace();
            }
        }).start();
    }

    private void handleAppMappingUpdate(Document updatedDoc) {
        if (updatedDoc == null) return;

        String ipLongId = updatedDoc.getString("ipLongId");
        String scenario = updatedDoc.getString("scenario");
        Integer year = updatedDoc.getInteger("year");
        String dfKey = scenario + year;

        List<Document> relatedMappings = mongoTemplate.find(
                org.springframework.data.mongodb.core.query.Query.query(
                        org.springframework.data.mongodb.core.query.Criteria.where("ipLongId").is(ipLongId)
                                .and("scenario").is(scenario)
                                .and("year").is(year)
                ),
                Document.class,
                "appMappings"
        );

        Document finDoc = mongoTemplate.findOne(
                org.springframework.data.mongodb.core.query.Query.query(
                        org.springframework.data.mongodb.core.query.Criteria.where("longId").is(ipLongId)
                ),
                Document.class,
                "FinGrid"
        );

        if (finDoc == null) {
            System.out.println("[ChangeStream] No matching FinGrid document found for longId: " + ipLongId);
            return;
        }

        List<Double> monthCost = Optional.ofNullable(finDoc)
                .map(fd -> (Document) fd.get("detailedFinancials"))
                .map(df -> (Document) df.get(dfKey))
                .map(dfYear -> (List<Double>) dfYear.get("monthCost"))
                .orElse(Collections.emptyList());

        if (monthCost.size() != 12) {
            System.out.println("[ChangeStream] Invalid or missing monthCost in FinGrid for longId: " + ipLongId);
            return;
        }

        List<Document> monthValues = new ArrayList<>();
        for (int i = 0; i < 12; i++) {
            List<Document> apps = new ArrayList<>();
            for (Document doc : relatedMappings) {
                List<Document> months = (List<Document>) doc.get("months");
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

        mongoTemplate.updateFirst(
                org.springframework.data.mongodb.core.query.Query.query(
                        org.springframework.data.mongodb.core.query.Criteria.where("longId").is(ipLongId)
                ),
                new org.springframework.data.mongodb.core.query.Update()
                        .set("detailedFinancials." + dfKey + ".appMappings.monthValues", monthValues)
                        .set("detailedFinancials." + dfKey + ".appMappings.yearlyValues", yearlyValues),
                "FinGrid"
        );

        System.out.printf("[ChangeStream] FinGrid updated for longId=%s | scenario=%s | year=%d%n",
                ipLongId, scenario, year);
    }
}
