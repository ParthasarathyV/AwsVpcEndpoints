// To Support verId
/* outlook ------------------------------------------------------------ */
db.lvl1FinancialsSummary.createIndex(
  { proposalId: 1, "outlook.planId": 1, "outlook.verId": -1 },
  { name: "idx_proposal_outlook_plan_verId_desc" }
);

/* budget ------------------------------------------------------------- */
db.lvl1FinancialsSummary.createIndex(
  { proposalId: 1, "budget.planId": 1, "budget.verId": -1 },
  { name: "idx_proposal_budget_plan_verId_desc" }
);

/* live --------------------------------------------------------------- */
db.lvl1FinancialsSummary.createIndex(
  { proposalId: 1, "live.planId": 1, "live.verId": -1 },
  { name: "idx_proposal_live_plan_verId_desc" }
);

/* pendingApproval ---------------------------------------------------- */
db.lvl1FinancialsSummary.createIndex(
  { proposalId: 1, "pendingApproval.planId": 1, "pendingApproval.verId": -1 },
  { name: "idx_proposal_pending_plan_verId_desc" }
);
