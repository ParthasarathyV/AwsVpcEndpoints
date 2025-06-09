public Aggregation fetchL1ToL2aggregation(String proposalId) throws IOException {
    String path = "mongqueries/L1ToL2.js";

    try (InputStream is = getClass().getClassLoader().getResourceAsStream(path)) {
        if (is == null) {
            throw new FileNotFoundException("Resource not found: " + path);
        }

        String json = new BufferedReader(
                new InputStreamReader(is, StandardCharsets.UTF_8))
                .lines()
                .collect(Collectors.joining("\n"));

        List<AggregationOperation> stages = Stream.concat(
                Stream.of(Aggregation.match(Criteria.where("ipLongId").is(proposalId))),
                BsonArray.parse(json).stream()
                        .map(bv -> Document.parse(bv.asDocument().toJson()))
                        .map(doc -> (AggregationOperation) ctx -> doc)
        ).collect(Collectors.toList());

        return Aggregation.newAggregation(stages);
    }
}
