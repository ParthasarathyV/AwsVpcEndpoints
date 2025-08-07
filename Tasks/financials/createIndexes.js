use financials;

// 1. status_1
db.costsAuditCollection.createIndex({ status: 1 });

// 2. proposalId_1_status_1
db.costsAuditCollection.createIndex({ proposalId: 1, status: 1 });

// 3. proposalId_1_verId_1_status_1
db.costsAuditCollection.createIndex({ proposalId: 1, verId: 1, status: 1 });

// 4. proposalId_1_eventType_1_status_1
db.costsAuditCollection.createIndex({ proposalId: 1, eventType: 1, status: 1 });

// 5. proposalId_1_verId_1_eventType_1_status_1
db.costsAuditCollection.createIndex({ proposalId: 1, verId: 1, eventType: 1, status: 1 });

// 6. proposalId_1_planId_1_scenario_1_verId_1_auditTimestamp_1
db.costsAuditCollection.createIndex({
  proposalId: 1,
  planId: 1,
  scenario: 1,
  verId: 1,
  auditTimestamp: 1
});

// 7. proposalId_1_messageType_1_status_1
db.costsAuditCollection.createIndex({ proposalId: 1, messageType: 1, status: 1 });

// 8. eventType_1
db.costsAuditCollection.createIndex({ eventType: 1 });

// 9. auditTimestamp_1
db.costsAuditCollection.createIndex({ auditTimestamp: 1 });
