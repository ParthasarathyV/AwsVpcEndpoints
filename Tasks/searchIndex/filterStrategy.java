@Service
public class TextFilterStrategy implements FilterStrategy<TextFilter> {

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

        return aggOps;
    }

    protected Document getAtlasSearchCondition(String fieldName, TextFilter filter) {
        final String filterValue = filter.getFilter();
        final TextFilter.TypeEnum filterType = filter.getType();

        return switch (filterType) {
            case EQUALS -> new Document("text",
                new Document("query", filterValue)
                    .append("path", fieldName)
                    .append("score", new Document("boost", new Document("value", 1))));
            case NOT_EQUAL -> new Document("compound",
                new Document("mustNot", List.of(
                    new Document("text",
                        new Document("query", filterValue)
                            .append("path", fieldName)))));
            case CONTAINS -> new Document("text",
                new Document("query", filterValue)
                    .append("path", fieldName));
            case NOT_CONTAINS -> new Document("compound",
                new Document("mustNot", List.of(
                    new Document("text",
                        new Document("query", filterValue)
                            .append("path", fieldName)))));
            case STARTS_WITH -> new Document("autocomplete",
                new Document("query", filterValue)
                    .append("path", fieldName)
                    .append("tokenOrder", "sequential"));
            case ENDS_WITH -> new Document("regex",
                new Document("query", ".*" + filterValue + "$")
                    .append("path", fieldName)
                    .append("allowAnalyzedField", true));
            case BLANK -> new Document("exists",
                new Document("path", fieldName)
                    .append("query", false));
            case NOT_BLANK -> new Document("exists",
                new Document("path", fieldName)
                    .append("query", true));
        };
    }

 private AggregationOperation contextualSearchOperation(Document searchQuery) {
    // Add the 'index' parameter to the search query to use 'filter_index'
    Document searchWithIndex = new Document("$search", 
        new Document("index", "filter_index") // specify your index name here
            .append("compound", searchQuery)); // Include your search query
    return context -> searchWithIndex;
}

}
