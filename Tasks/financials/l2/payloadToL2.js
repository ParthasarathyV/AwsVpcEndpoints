function updateScenarioNode(doc) {
  const scenarioKey = doc.scenario; // "outlook", "live", or "budget"

  const updateField = {
    scenario: doc.scenario,
    planId: doc.planId,
    total: doc.total,
    absTotal: doc.absTotal,
    asOfCurrentMonth: doc.asOfCurrentMonth,
    lastUpdatedAt: doc.lastUpdatedAt,
    years: doc.years,
    costLast: doc.costLast,
    actualsFirst: doc.actualsFirst,
    actualsLast: doc.actualsLast,
    costCenters: doc.costCenters
  };

  // Only update the specific scenario node
  const updatePayload = {};
  updatePayload[scenarioKey] = updateField;

  db.financialsSummary.updateOne(
    { proposalId: doc.proposalId },
    { $set: updatePayload },
    { upsert: true }
  );
}
