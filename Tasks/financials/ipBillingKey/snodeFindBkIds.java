import org.springframework.data.mongodb.core.aggregation.*;
import org.springframework.data.mongodb.core.query.Criteria;

import java.util.List;

public class BkRefAggregationBuilder {

    public static Aggregation getBkIdsBySnodes(List<String> snodes) {

        MatchOperation matchSnodes = Aggregation.match(
            Criteria.where("type").is("bkRef")
                    .and("value.cc.snode").in(snodes)
        );

        GroupOperation groupByAllBkIds = Aggregation.group()
            .addToSet("_id").as("bkIds");

        ProjectionOperation projectOnlyBkIds = Aggregation.project("bkIds").andExclude("_id");

        return Aggregation.newAggregation(
            matchSnodes,
            groupByAllBkIds,
            projectOnlyBkIds
        );
    }
}
