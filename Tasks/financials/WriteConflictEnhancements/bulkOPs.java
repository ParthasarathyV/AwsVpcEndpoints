private List<Integer> saveAggregatedResults(String ipLongId, String planId, String scenario, List<Document> aggregatedResults) {
    String targetCollectionName = determineCollectionName(scenario, CollectionType.L3_MC);
    List<Integer> currentYears = new ArrayList<>();

    List<WriteModel<Document>> bulkOps = new ArrayList<>();

    for (Document aggregatedResult : aggregatedResults) {
        Integer year = aggregatedResult.get("year", Integer.class);
        currentYears.add(year);

        // Construct the filter for the upsert
        Document filter = new Document()
                .append(CommonEnums.IP_ID_KEY.getValue(), ipLongId)
                .append(CommonEnums.PLAN_ID_KEY.getValue(), planId)
                .append(CommonEnums.SCENARIO.getValue(), scenario)
                .append("year", year);

        // Create the upsert operation
        ReplaceOneModel<Document> replaceOneModel = new ReplaceOneModel<>(
                filter,
                aggregatedResult,
                new ReplaceOptions().upsert(true)
        );

        bulkOps.add(replaceOneModel);
    }

    // Perform the bulk write
    costRepository.bulkWrite(targetCollectionName, bulkOps);

    log.info("{} :: {}, {}, {} Aggregated results saved into collection: {}",
        EventType.IP_COST_DETAILS.getEventType(), ipLongId, planId, scenario, targetCollectionName);

    return currentYears;
}
