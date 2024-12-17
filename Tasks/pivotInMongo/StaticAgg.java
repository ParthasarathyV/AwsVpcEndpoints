import org.springframework.data.mongodb.core.aggregation.*;
import org.springframework.data.mongodb.core.aggregation.AggregationOperation;
import java.util.ArrayList;
import java.util.List;

import static org.springframework.data.mongodb.core.aggregation.Aggregation.*;

public class MongoAggregationExample {
    public static void main(String[] args) {
        List<AggregationOperation> aggOps = new ArrayList<>();

        // $group stage
        GroupOperation groupStage = group(
                Fields.fields("type", "benefitsReportingLevel", "state", "rag"))
                .sum("forecastTotalCostNextYear").as("forecastTotalCostNextYear")
                .sum("totalCostNextYear").as("totalCostNextYear");
        aggOps.add(groupStage);

        // $addFields stage for pivotField1 and pivotField2
        AddFieldsOperation addFieldsStage1 = AddFieldsOperation.builder()
                .addField("pivotField1",
                        ValueOperators.Concat.valueOf("_id.state")
                                .concat("-")
                                .concat(ValueOperators.Concat.valueOf("_id.rag"))
                                .concat("-forecastTotalCostNextYear"))
                .addField("pivotField2",
                        ValueOperators.Concat.valueOf("_id.state")
                                .concat("-")
                                .concat(ValueOperators.Concat.valueOf("_id.rag"))
                                .concat("-totalCostNextYear"))
                .build();
        aggOps.add(addFieldsStage1);

        // $addFields stage for rowData
        AddFieldsOperation addFieldsStage2 = AddFieldsOperation.builder()
                .addField("rowData", AccumulatorOperators.MergeObjects.merge(
                        List.of(
                                ValueOperators.ObjectLiteral.newObjectLiteral()
                                        .field("type", "_id.type").build(),
                                ValueOperators.ObjectLiteral.newObjectLiteral()
                                        .field("benefitsReportingLevel", "_id.benefitsReportingLevel").build(),
                                AccumulatorOperators.ArrayToObject.arrayToObject(
                                        ArrayOperators.ArrayOf.arrayOf(
                                                List.of(
                                                        ValueOperators.ObjectLiteral.newObjectLiteral()
                                                                .field("k", "pivotField1")
                                                                .field("v", "forecastTotalCostNextYear").build()
                                                )
                                        )
                                ),
                                AccumulatorOperators.ArrayToObject.arrayToObject(
                                        ArrayOperators.ArrayOf.arrayOf(
                                                List.of(
                                                        ValueOperators.ObjectLiteral.newObjectLiteral()
                                                                .field("k", "pivotField2")
                                                                .field("v", "totalCostNextYear").build()
                                                )
                                        )
                                )
                        )
                )).build();
        aggOps.add(addFieldsStage2);

        // $group stage for aggregating pivotFields and rows
        GroupOperation groupStage2 = group()
                .push("pivotField1").as("pivotFields1")
                .push("pivotField2").as("pivotFields2")
                .push("rowData").as("rows");
        aggOps.add(groupStage2);

        // $project stage to construct the final response
        ProjectionOperation projectStage = project()
                .and(
                        ArrayOperators.ConcatArrays.concatArrays("pivotFields1", "pivotFields2")
                ).as("response.pivotFields")
                .and("rows").as("response.rows");
        aggOps.add(projectStage);

        // Use aggOps as needed in your MongoTemplate query
        System.out.println("Aggregation pipeline stages created.");
    }
}
