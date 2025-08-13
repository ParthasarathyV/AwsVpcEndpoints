public void upsertL2Scenario(String ipLongId,
                             String scenario,                    // "live" | "pendingApproval" | "budget" | "outlook"
                             List<org.bson.Document> aggregatedResults) {

    if (aggregatedResults == null || aggregatedResults.isEmpty()) return;

    // agg output has: { proposalId, live?, pendingApproval?, budget?, outlook? }
    Document agg = aggregatedResults.get(0);

    // payload to store for this scenario (likely an array from your pipeline)
    Object scenarioValue = agg.get(scenario);   // e.g., agg.get("live")

    // one L2 document per proposalId
    Query  q = Query.query(Criteria.where("proposalId").is(ipLongId));  // ipLongId == proposalId
    Update u = new Update()
            .set(scenario, scenarioValue)        // partial update of that scenario field only
            .setOnInsert("proposalId", ipLongId);

    mongoTemplate.upsert(q, u, "l2FinancialsSummary");
}
