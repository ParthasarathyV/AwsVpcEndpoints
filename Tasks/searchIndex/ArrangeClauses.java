public static AggregationOperation contextualSearchOperation(List<Document> searchQuery) {
    // Group the clauses into separate lists
    final List<Document> mustClauses = searchQuery.stream()
        .filter(doc -> doc.containsKey("must"))
        .map(doc -> (Document) doc.get("must"))
        .toList();

    final List<Document> mustNotClauses = searchQuery.stream()
        .filter(doc -> doc.containsKey("mustNot"))
        .map(doc -> (Document) doc.get("mustNot"))
        .toList();

    final List<Document> shouldClauses = searchQuery.stream()
        .filter(doc -> doc.containsKey("should"))
        .map(doc -> (Document) doc.get("should"))
        .toList();

    // Create the compound query using only final variables
    final Document compoundQuery = new Document();
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
