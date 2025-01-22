@Override
public List<AggregationOperation> toAggregationOperations(String fieldName, TextFilter filter) {
    final List<AggregationOperation> aggOps = new ArrayList<>();

    if (filter.getOperator() != null && !filter.getConditions().isEmpty()) {
        final List<Document> mustConditions = new ArrayList<>();
        filter.getConditions().forEach((conditionFilter) ->
            mustConditions.add(getAtlasSearchCondition(fieldName, conditionFilter))
        );

        Document compoundQuery = new Document("compound", new Document("must", mustConditions));
        aggOps.add(contextualSearchOperation(compoundQuery));
    } else {
        Document singleCondition = getAtlasSearchCondition(fieldName, filter);
        aggOps.add(contextualSearchOperation(singleCondition));
    }

    // Wrap aggOps with a $search clause and return the new list
    return wrapWithSearchClause(aggOps);
}

private List<AggregationOperation> wrapWithSearchClause(List<AggregationOperation> aggOps) {
    // Create the $search operation
    AggregationOperation searchOperation = context -> new Document("$search",
        new Document("index", "filter_index") // Specify your Atlas Search index name here
            .append("compound", new Document("must", aggOps.stream()
                .map(AggregationOperation::toDocument) // Convert aggOps to a list of Documents
                .toList())));

    // Add the $search operation at the beginning of the list
    List<AggregationOperation> wrappedOps = new ArrayList<>();
    wrappedOps.add(searchOperation);
    wrappedOps.addAll(aggOps);

    return wrappedOps;
}
