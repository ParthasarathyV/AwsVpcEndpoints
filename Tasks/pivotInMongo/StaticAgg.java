import org.springframework.data.mongodb.core.aggregation.*;
import org.springframework.data.mongodb.core.aggregation.AggregationOperation;
import java.util.ArrayList;
import java.util.List;

import static org.springframework.data.mongodb.core.aggregation.Aggregation.*;

public class MongoAggregationExample {
    public static void main(String[] args) {
        List<AggregationOperation> aggOps = new ArrayList<>();

        // $group stage
        GroupOperation groupStage = group(Fields.fields("type", "benefitsReportingLevel", "state", "rag"))
                .sum("forecastTotalCostNextYear").as("forecastTotalCostNextYear")
                .sum("totalCostNextYear").as("totalCostNextYear");
        aggOps.add(groupStage);

        // $addFields stage for pivotField1 and pivotField2
        ProjectionOperation addFieldsStage1 = project()
                .andExpression("concat($_id.state, '-', $_id.rag, '-forecastTotalCostNextYear)").as("pivotField1")
                .andExpression("concat($_id.state, '-', $_id.rag, '-totalCostNextYear)").as("pivotField2")
                .andExclude("_id");
        aggOps.add(addFieldsStage1);

        // $addFields stage for rowData
        ProjectionOperation addFieldsStage2 = project()
                .and("$_id.type").as("rowData.type")
                .and("$_id.benefitsReportingLevel").as("rowData.benefitsReportingLevel")
                .andExpression(
                        "{ $arrayToObject: [[{ k: pivotField1, v: forecastTotalCostNextYear }]] }"
                ).as("rowData.forecastData")
                .andExpression(
                        "{ $arrayToObject: [[{ k: pivotField2, v: totalCostNextYear }]] }"
                ).as("rowData.totalCostData");
        aggOps.add(addFieldsStage2);

        // $group stage for aggregating pivotFields and rows
        GroupOperation groupStage2 = group()
                .push("pivotField1").as("pivotFields1")
                .push("pivotField2").as("pivotFields2")
                .push("rowData").as("rows");
        aggOps.add(groupStage2);

        // $project stage to construct the final response
        ProjectionOperation projectStage = project()
                .and(ArrayOperators.ArrayConcat.concat("pivotFields1", "pivotFields2")).as("response.pivotFields")
                .and("rows").as("response.rows");
        aggOps.add(projectStage);

        // Use aggOps as needed in your MongoTemplate query
        System.out.println("Aggregation pipeline stages created.");
    }
}
