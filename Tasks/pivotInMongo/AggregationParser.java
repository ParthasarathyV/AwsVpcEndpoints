import com.fasterxml.jackson.databind.ObjectMapper;
import org.bson.Document;
import org.springframework.data.mongodb.core.aggregation.AggregationOperation;
import org.springframework.data.mongodb.core.aggregation.AggregationOperationContext;
import org.springframework.data.mongodb.core.aggregation.TypedAggregation;

import java.util.ArrayList;
import java.util.List;

public class AggregationParser {

    public static List<AggregationOperation> parseAggregation(String aggQueryString) {
        List<AggregationOperation> aggOps = new ArrayList<>();
        try {
            // Parse the JSON string into a list of BSON documents
            ObjectMapper mapper = new ObjectMapper();
            List<Document> stages = mapper.readValue(aggQueryString, List.class);

            // Convert each BSON document into a Custom AggregationOperation
            for (Document stage : stages) {
                aggOps.add(new AggregationOperation() {
                    @Override
                    public Document toDocument(AggregationOperationContext context) {
                        return stage;
                    }
                });
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse aggregation query string", e);
        }
        return aggOps;
    }

    public static void main(String[] args) {
        // Example aggregation query string
        String aggQueryString = """
                [
                    { "$match": { "status": "A" } },
                    { "$group": { "_id": "$cust_id", "total": { "$sum": "$amount" } } },
                    { "$sort": { "total": -1 } }
                ]
                """;

        // Parse the aggregation query
        List<AggregationOperation> aggOps = parseAggregation(aggQueryString);

        // Use the parsed aggregation operations
        System.out.println("Parsed Aggregation Operations:");
        aggOps.forEach(System.out::println);
    }
}
