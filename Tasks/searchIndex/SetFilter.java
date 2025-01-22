import org.bson.Document;
import org.springframework.stereotype.Service;

@Service
public class SetFilterStrategy implements FilterStrategy<SetFilter> {

    @Override
    public Document toAggregationOperations(String fieldName, SetFilter filter) {
        // Create the must clause as a BSON Document
        Document mustClause = new Document("must", List.of(
            new Document("term", new Document(fieldName, new Document("value", filter.getValues())))
        ));

        // Return the must clause
        return mustClause;
    }
}
