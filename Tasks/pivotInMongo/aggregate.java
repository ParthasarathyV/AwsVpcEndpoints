import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationOperation;
import org.springframework.data.mongodb.core.aggregation.Fields;
import org.springframework.data.mongodb.core.aggregation.AggregationOperators;
import org.springframework.data.mongodb.core.query.Criteria;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class DynamicAggregationBuilder {

    public static List<AggregationOperation> buildAggregation(GridRequest gridRequest) {
        List<AggregationOperation> operations = new ArrayList<>();

        // Extract group fields, pivot fields, and value fields from gridRequest
        List<String> groupFields = gridRequest.getRowGroupCols()
                                              .stream()
                                              .map(GroupField::getField)
                                              .collect(Collectors.toList());

        List<String> pivotFields = gridRequest.getPivotCols()
                                              .stream()
                                              .map(PivotField::getField)
                                              .collect(Collectors.toList());

        List<String> valueFields = gridRequest.getValueCols()
                                              .stream()
                                              .map(ValueField::getField)
                                              .collect(Collectors.toList());

        // Construct the $group stage
        Map<String, Object> groupId = new HashMap<>();
        for (String groupField : groupFields) {
            groupId.put(groupField, "$" + groupField);
        }
        for (String pivotField : pivotFields) {
            groupId.put(pivotField, "$" + pivotField);
        }

        Map<String, String> sumFields = new HashMap<>();
        for (String valueField : valueFields) {
            sumFields.put("sum_" + valueField, "$" + valueField);
        }

        AggregationOperation groupOperation = Aggregation.group(groupId)
                                                          .sum(sumFields);
        operations.add(groupOperation);

        // Construct the $addFields stage for pivot concatenation
        Map<String, Object> addFields = new HashMap<>();
        for (String pivotField : pivotFields) {
            addFields.put("pivotField_" + pivotField, AggregationOperators.concat(groupId.keySet()));
        }

        AggregationOperation addFieldsOperation = Aggregation.addFields(addFieldOutPut);

        //aggumentg
