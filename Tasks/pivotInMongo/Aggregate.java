import com.mongodb.client.Aggregates;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.model.Aggregates;
import org.bson.Document;

import java.util.ArrayList;
import java.util.List;

public class MongoAggregation {
    public static void main(String[] args) {
        // Replace with your MongoDB collection
        MongoCollection<Document> collection = getMongoCollection();

        List<Document> groupFields = List.of("type", "benefitsReportingLevel", "state", "rag"); // Example list of group fields
        List<Document> pivotFields = List.of("state", "rag"); // Example list of pivot fields
        List<Document> valueFields = List.of("forecastTotalCostNextYear", "totalCostNextYear"); // Example list of value fields

        // Constructing the _id field dynamically
        Document idFields = new Document();
        for (String field : groupFields) {
            idFields.append(field, "$" + field);
        }
        for (String pivotField : pivotFields) {
            idFields.append(pivotField, "$" + pivotField);
        }

        // Constructing the sum fields dynamically
        List<Document> sumFields = new ArrayList<>();
        for (String field : valueFields) {
            sumFields.add(new Document("sum" + field, new Document("$sum", "$" + field)));
        }

        // Aggregation Pipeline
        List<Document> pipeline = new ArrayList<>();
        pipeline.add(Aggregates.group(idFields));
        pipeline.addAll(sumFields);

        // Execute the aggregation
        for (Document result : collection.aggregate(pipeline)) {
            System.out.println(result.toJson());
        }
    }

    private static MongoCollection<Document> getMongoCollection() {
        // Implement this method to return your MongoDB collection
        return null;
    }
}
