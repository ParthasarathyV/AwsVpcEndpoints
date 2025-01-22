public static AggregationOperation contextualSearchOperation(List<Document> searchQuery) {
    // Create lists to hold grouped clauses for must, mustNot, and should
    List<Document> mustClauses = new ArrayList<>();
    List<Document> mustNotClauses = new ArrayList<>();
    List<Document> shouldClauses = new ArrayList<>();

    // Iterate through the list of documents
    for (Document clause : searchQuery) {
        clause.forEach((key, value) -> {
            switch (key) {
                case "must":
                    mustClauses.add((Document) value);
                    break;
                case "mustNot":
                    mustNotClauses.add((Document) value);
                    break;
                case "should":
                    shouldClauses.add((Document) value);
                    break;
                default:
                    throw new IllegalArgumentException("Unexpected key: " + key);
            }
        });
    }

    // Create the compound query
    Document compoundQuery = new Document();
    if (!mustClauses.isEmpty()) {
        compoundQuery.append("must", mustClauses);
    }
    if (!mustNotClauses.isEmpty()) {
        compoundQuery.append("mustNot", mustNotClauses);
    }
    if (!shouldClauses.isEmpty()) {
        compoundQuery.append("should", shouldClauses);
    }

    // Final $search stage
    final Document searchWithIndex = new Document("$search",
            new Document("index", "filter_index_keyword") // Specify your Atlas Search index name
                    .append("compound", compoundQuery));

    return context -> searchWithIndex;
}
