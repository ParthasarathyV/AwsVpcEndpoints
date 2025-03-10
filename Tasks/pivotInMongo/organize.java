protected List<AggregationOperation> getPivotingOperations(GridRequest gridRequest) {
    final List<AggregationOperation> aggOps = new ArrayList<>();
    final List<String> groupingFields = getGroupingFields(gridRequest);
    final List<String> pivotingFields = getPivotingFields(gridRequest);
    final List<String> pivotGroupingFields = buildPivotGroupingFields(groupingFields, pivotingFields);

    AggregationOperation addOp1 = buildAddOp1(pivotingFields);
    AggregationOperation groupOp2 = buildGroupOp2(pivotGroupingFields);
    AggregationOperation addOp3 = buildAddOp3();
    AggregationOperation addOp4 = buildAddOp4(groupingFields);
    AggregationOperation groupOp5 = buildGroupOp5(groupingFields, gridRequest);
    AggregationOperation projectOp6 = buildProjectOp6(groupingFields, gridRequest);
    AggregationOperation groupOp7 = buildGroupOp7();
    AggregationOperation projectOp8 = buildProjectOp8();

    aggOps.add(addOp1);
    aggOps.add(groupOp2);
    aggOps.add(addOp3);
    aggOps.add(addOp4);
    aggOps.add(groupOp5);
    aggOps.add(projectOp6);
    aggOps.add(groupOp7);
    aggOps.add(projectOp8);

    return aggOps;
}

private List<String> buildPivotGroupingFields(List<String> groupingFields, List<String> pivotingFields) {
    List<String> pivotGroupingFields = new ArrayList<>();
    pivotGroupingFields.addAll(groupingFields);
    pivotGroupingFields.addAll(pivotingFields);
    return pivotGroupingFields;
}

private AggregationOperation buildAddOp1(List<String> pivotingFields) {
    var addOp1 = Aggregation.addFields();
    pivotingFields.forEach(field ->
        addOp1.addField(field)
              .withValue(new Document("$ifNull", List.of("$" + field, "")))
    );
    return addOp1.build();
}

private AggregationOperation buildGroupOp2(List<String> pivotGroupingFields) {
    return Aggregation.group(pivotGroupingFields.toArray(String[]::new))
                      .count().as("childCount");
}

private AggregationOperation buildAddOp3() {
    return Aggregation.addFields().build();
}

private AggregationOperation buildAddOp4(List<String> groupingFields) {
    List<Document> mergeObjectList = new ArrayList<>();
    groupingFields.forEach(field ->
        mergeObjectList.add(new Document(field, "$_id." + field))
    );
    var addOp4 = Aggregation.addFields();
    addOp4.addField("rowData")
          .withValue(new Document("$mergeObjects", mergeObjectList));
    return addOp4.build();
}

private AggregationOperation buildGroupOp5(List<String> groupingFields, GridRequest gridRequest) {
    List<String> groupOp5Ids = new ArrayList<>();
    groupingFields.forEach(field ->
        groupOp5Ids.add("$rowData." + field)
    );
    var groupOp5 = Aggregation.group(groupOp5Ids.toArray(String[]::new))
                            .push("rowData").as("rows");

    for (int i = 0; i < gridRequest.getValueCols().size(); i++) {
        var valueCol = gridRequest.getValueCols().get(i);
        final var fieldAlias = valueCol.getField();
        groupOp5 = switch (valueCol.getAggFunc()) {
            case SUM -> groupOp5.push(fieldAlias + "Key").as(fieldAlias);
            default -> throw new IllegalArgumentException(
                "Unsupported aggregation function: " + valueCol.getAggFunc()
            );
        };
    }
    return groupOp5;
}

private AggregationOperation buildProjectOp6(List<String> groupingFields, GridRequest gridRequest) {
    List<String> setOperationFields = new ArrayList<>();
    AggregationExpression mergeObjectsExpression = context ->
        new Document("$mergeObjects", Arrays.asList("$$value", "$$this"));

    var projectOp6 = Aggregation.project()
        .andInclude(groupingFields.toArray(String[]::new))
        .andExclude("_id")
        .and(ArrayOperators.Reduce.arrayOf("$rows")
                .withInitialValue(new Document())
                .reduce(mergeObjectsExpression))
        .as("data");

    for (int i = 0; i < gridRequest.getValueCols().size(); i++) {
        var valueCol = gridRequest.getValueCols().get(i);
        final var fieldAlias = valueCol.getField();
        if (i != 0) {
            setOperationFields.add(fieldAlias + "Key");
        }
    }
    SetOperators.SetOperatorFactory projectOp6Factory =
        new SetOperators.SetOperatorFactory(
            gridRequest.getValueCols().getFirst().getField() + "Key"
        );
    SetOperators.SetUnion projectOp6Union =
        projectOp6Factory.union(setOperationFields.toArray(String[]::new));
    projectOp6 = projectOp6.and(projectOp6Union).as("pivotFields");

    return projectOp6;
}

private AggregationOperation buildGroupOp7() {
    return Aggregation.group()
                      .push("pivotFields").as("pivotFields")
                      .push("data").as("data");
}

private AggregationOperation buildProjectOp8() {
    AggregationExpression projectOp8Expression = context ->
        new Document("$setUnion", Arrays.asList("$$value", "$$this"));
    return Aggregation.project()
                      .andExclude("_id")
                      .andInclude("data")
                      .and(ArrayOperators.Reduce.arrayOf("$pivotFields")
                              .withInitialValue(Collections.emptyList())
                              .reduce(projectOp8Expression))
                      .as("pivotFields");
}
