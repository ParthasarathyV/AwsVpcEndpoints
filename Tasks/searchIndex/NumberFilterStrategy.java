@Service
public class NumberFilterStrategy implements FilterStrategy<NumberFilter> {

    @Override
    public List<AggregationOperation> toAggregationOperations(String fieldName, NumberFilter filter) {
        final List<AggregationOperation> aggOps = new ArrayList<>();
        final Document singleCondition = getAtlasSearchCondition(fieldName, filter);
        aggOps.add(contextualSearchOperation(singleCondition));
        return aggOps;
    }

    protected Document getAtlasSearchCondition(String fieldName, NumberFilter filter) {
        final BigDecimal filterValue = filter.getFilter() != null
            ? new BigDecimal(filter.getFilter())
            : BigDecimal.ZERO;

        final BigDecimal filterToValue = filter.getFilterTo() != null
            ? new BigDecimal(filter.getFilterTo())
            : BigDecimal.ZERO;

        final NumberFilter.TypeEnum filterType = filter.getType();
        return switch (filterType) {
            case EQUALS -> new Document("must",
                List.of(
                    new Document("range",
                        new Document("path", fieldName)
                            .append("gte", filterValue)
                            .append("lte", filterValue))
                ));

            case NOT_EQUAL -> new Document("mustNot",
                List.of(
                    new Document("range",
                        new Document("path", fieldName)
                            .append("gte", filterValue)
                            .append("lte", filterValue))
                ));

            case GREATER_THAN -> new Document("must",
                List.of(
                    new Document("range",
                        new Document("path", fieldName)
                            .append("gt", filterValue))
                ));

            case LESS_THAN -> new Document("must",
                List.of(
                    new Document("range",
                        new Document("path", fieldName)
                            .append("lt", filterValue))
                ));

            case LESS_THAN_OR_EQUAL -> new Document("must",
                List.of(
                    new Document("range",
                        new Document("path", fieldName)
                            .append("lte", filterValue))
                ));

            case IN_RANGE -> new Document("must",
                List.of(
                    new Document("range",
                        new Document("path", fieldName)
                            .append("gte", filterValue)
                            .append("lte", filterToValue))
                ));

            case BLANK -> new Document("mustNot",
                List.of(
                    new Document("exists",
                        new Document("path", fieldName))
                ));

            case NOT_BLANK -> new Document("must",
                List.of(
                    new Document("exists",
                        new Document("path", fieldName))
                ));
        };
    }

    private AggregationOperation contextualSearchOperation(Document searchQuery) {
        Document searchWithIndex = new Document("$search",
            new Document("index", "filter_index") // Specify your Atlas Search index name here
                .append("compound", searchQuery));
        return context -> searchWithIndex;
    }
}
