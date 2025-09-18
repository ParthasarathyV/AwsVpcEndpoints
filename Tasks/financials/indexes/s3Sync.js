// Taxonomy: unique on proposalId
db.S3SyncStatus.createIndex(
  { proposalId: 1 },
  {
    unique: true,
    partialFilterExpression: { type: "taxonomy" },
    name: "uniq_taxonomy_proposalId"
  }
);

// Benefits: unique on (proposalId + sysId + modelName)
db.S3SyncStatus.createIndex(
  { proposalId: 1, sysId: 1, modelName: 1 },
  {
    unique: true,
    partialFilterExpression: { type: "benefits" },
    name: "uniq_benefits_proposalId_sysId_modelName"
  }
);

// AppMappings: unique on (proposalId + planId + scenario)
db.S3SyncStatus.createIndex(
  { proposalId: 1, planId: 1, scenario: 1 },
  {
    unique: true,
    partialFilterExpression: { type: "appMappings" },
    name: "uniq_appMappings_proposalId_planId_scenario"
  }
);

// IPBKAllocations: unique on (proposalId + planId + scenario)
db.S3SyncStatus.createIndex(
  { proposalId: 1, planId: 1, scenario: 1 },
  {
    unique: true,
    partialFilterExpression: { type: "ipbkAllocations" },
    name: "uniq_ipbkAllocations_proposalId_planId_scenario"
  }
);

// Costs: unique on (proposalId + planId + scenario)
db.S3SyncStatus.createIndex(
  { proposalId: 1, planId: 1, scenario: 1 },
  {
    unique: true,
    partialFilterExpression: { type: "costs" },
    name: "uniq_costs_proposalId_planId_scenario"
  }
);
