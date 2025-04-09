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

    @Autowired
    private AppMappingHandler appMappingHandler;

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

                    appMappingHandler.process(updatedDoc);  // 👈 DELEGATED
                }

            } catch (Exception e) {
                System.err.println("[ChangeStream] Listener error:");
                e.printStackTrace();
            }
        }).start();
    }
}
