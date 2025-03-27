// Suppose gridRequest.getQuickFilter() returns a string like "isha fhhf"
String quickFilter = gridRequest.getQuickFilter(); 

// Split on whitespace to get individual tokens
String[] tokens = quickFilter.split("\\s+");  // e.g. ["isha", "fhhf"]

// Join the tokens with an OR (|) to form a single regex pattern
// For safety, escape each token to avoid special regex chars
String joinedTokens = Arrays.stream(tokens)
    .map(Pattern::quote)           // escape any regex metacharacters
    .collect(Collectors.joining("|")); // => "isha|fhhf" (escaped)

// Wrap with .*().* so that it matches partial substrings
String fullRegex = ".*(" + joinedTokens + ").*";  
// => ".*(isha|fhhf).*"

// Build the Atlas Search stage
Document regexQuery = new Document("query", fullRegex)
    .append("path", Arrays.asList(
        "piBusinessCase",
        "productName",
        "areaProduct",
        "productOwner",
        "coOwners",
        "agreementApprovers",
        "cto",
        "cbt",
        // etc. -- match the fields defined in your "quickFilter" index
        "overview",
        "benefitsSummary"
    ))
    .append("allowAnalyzedField", true);

Document searchStage = new Document("$search",
    new Document("index", "quickFilter")  // name of your Atlas Search index
        .append("regex", regexQuery)
);

// Convert to a Spring AggregationOperation or however you build your pipeline
AggregationOperation searchOp = (ctx) -> searchStage;

// Finally, add this stage to your aggregation pipeline
List<AggregationOperation> aggOps = new ArrayList<>();
aggOps.add(searchOp);
// ... add more stages if needed ...



// Suppose the user typed: "isha fhhf"
String[] tokens = quickFilter.split("\\s+"); // ["isha", "fhhf"]

List<Document> shouldClauses = new ArrayList<>();
for (String token : tokens) {
    // For partial substring matching, wrap in '*' on both sides
    String wildcardQuery = "*" + token + "*";
    Document wildcardDoc = new Document("wildcard", new Document()
        .append("query", wildcardQuery)
        .append("path", indexFields)        // the array of fields
        .append("allowAnalyzedField", true)
    );
    shouldClauses.add(wildcardDoc);
}

Document compoundDoc = new Document("compound", new Document()
    .append("should", shouldClauses)
    .append("minimumShouldMatch", 1)
);

Document searchStage = new Document("$search", new Document()
    .append("index", "quickFilter")
    .appendAll(compoundDoc)
);
