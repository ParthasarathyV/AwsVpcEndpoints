public Aggregation fetchL1ToL2aggregation(String proposalId) throws IOException {
    String path = "mongqueries/L1ToL2.js";
    InputStream is = getClass().getClassLoader().getResourceAsStream(path);
    String json = new BufferedReader(new InputStreamReader(is))
                      .lines().collect(Collectors.joining("\n"));

    List<AggregationOperation> stages = Stream.concat(
        Stream.of(Aggregation.match(Criteria.where("ipLongId").is(proposalId))),
        BsonArray.parse(json).stream()
            .map(BsonValue::asDocument)
            .map(Document::parse)
            .map(doc -> (AggregationOperation) context -> doc)
    ).collect(Collectors.toList());

    return Aggregation.newAggregation(stages);
}
