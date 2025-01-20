@Service
public class DateFilterStrategy implements FilterStrategy<DateFilter> {

    @Override
    public List<AggregationOperation> toAggregationOperations(String fieldName, DateFilter filter) {
        final List<AggregationOperation> aggOps = new ArrayList<>();
        final Document singleCondition = getAtlasSearchCondition(fieldName, filter);
        aggOps.add(contextualSearchOperation(singleCondition));
        return aggOps;
    }

    protected Document getAtlasSearchCondition(String fieldName, DateFilter filter) {
        final Instant now = Instant.now();
        final Instant dateFrom = filter.getDateFrom() != null
            ? CommonUtils.convertDateStringToInstant(filter.getDateFrom())
            : now;

        final DateFilter.TypeEnum filterType = filter.getType();
        return switch (filterType) {
            case EQUALS -> new Document("must",
                List.of(
                    new Document("range",
                        new Document("path", fieldName)
                            .append("gte", dateFrom)
                            .append("lte", dateFrom))
                ));

            case NOT_EQUAL -> new Document("mustNot",
                List.of(
                    new Document("range",
                        new Document("path", fieldName)
                            .append("gte", dateFrom)
                            .append("lte", dateFrom))
                ));

            case IN_RANGE -> new Document("must",
                List.of(
                    new Document("range",
                        new Document("path", fieldName)
                            .append("gte", dateFrom)
                            .append("lt", CommonUtils.convertDateStringToInstant(filter.getDateTo())))
                ));

            case GREATER_THAN -> new Document("must",
                List.of(
                    new Document("range",
                        new Document("path", fieldName)
                            .append("gt", dateFrom))
                ));

            case LESS_THAN -> new Document("must",
                List.of(
                    new Document("range",
                        new Document("path", fieldName)
                            .append("lt", dateFrom))
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
