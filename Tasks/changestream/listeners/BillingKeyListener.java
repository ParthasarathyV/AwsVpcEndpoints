package com.jpmchase.myig.listener;

import com.jpmchase.myig.handler.FinGridUpdateCoordinator;
import com.mongodb.client.*;
import com.mongodb.client.model.Aggregates;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.changestream.ChangeStreamDocument;
import org.bson.Document;
import org.bson.conversions.Bson;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import javax.annotation.PostConstruct;
import java.util.List;

@Component
public class BillingKeyListener {

    @Autowired 
    private FinGridUpdateCoordinator coordinator;

    @PostConstruct
    public void initStream() {
        MongoClient mongoClient = MongoClients.create();
        MongoCollection<Document> collection = mongoClient
                .getDatabase("your_db")
                .getCollection("billingKeyHeader");

        List<Bson> pipeline = List.of(Aggregates.match(Filters.eq("operationType", "update")));
        
        new Thread(() -> {
            try (MongoChangeStreamCursor<ChangeStreamDocument<Document>> cursor = collection.watch(pipeline).cursor()) {
                while (cursor.hasNext()) {
                    ChangeStreamDocument<Document> change = cursor.next();
                    Document updatedDoc = collection.find(Filters.eq("_id", change.getDocumentKey().getObjectId("_id"))).first();
                    if (updatedDoc != null) {
                        coordinator.handleBillingKeyChange(updatedDoc);
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }).start();
    }
}