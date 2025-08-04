public Aggregation fetchIpAllocatedCostAggregation(List<String> bkIds) {

    // stage 1 – match any document that contains at least one requested bkId
    AggregationOperation matchStage =
        match(Criteria.where("years.bkId").in(bkIds));

    // stage 2 – keep only the matching elements inside years
    AggregationOperation setStage = ctx -> new Document("$set",
        new Document("years",
            new Document("$filter", new Document()
                .append("input", "$years")
                .append("as",    "y")
                .append("cond",  new Document("$in",
                        Arrays.asList("$$y.bkId", bkIds)))));

    // business-specific stages you already have
    Stream<AggregationOperation> enumStages =
        BsonArray.parse(IPAllocationAggrEnum.IP_ALLOCATION_COST.getValue())
                 .stream()
                 .map(bv -> Document.parse(bv.asDocument().toJson()))
                 .map(doc -> (AggregationOperation)(c -> doc));

    List<AggregationOperation> stages = Stream
        .concat(Stream.of(matchStage, setStage), enumStages)
        .collect(Collectors.toList());

    return Aggregation.newAggregation(stages);
}
