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
    // Extract the inner $search query from aggOps
    List<Document> compoundConditions = new ArrayList<>();
    for (AggregationOperation aggOp : aggOps) {
        // Apply each operation's context to create a Document and extract the $search condition
        Document operation = aggOp.toDocument(AggregationOperationContext.DEFAULT);
        if (operation.containsKey("$search")) {
            compoundConditions.add((Document) operation.get("$search"));
        }
    }

    // Create a new $search operation wrapping all conditions
    Document searchWithIndex = new Document("$search",
        new Document("index", "filter_index") // Specify your Atlas Search index
            .append("compound", new Document("must", compoundConditions)));

    AggregationOperation searchOperation = context -> searchWithIndex;

    // Return a new list with the $search operation at the beginning
    List<AggregationOperation> wrappedOps = new ArrayList<>();
    wrappedOps.add(searchOperation);
    return wrappedOps;
}
