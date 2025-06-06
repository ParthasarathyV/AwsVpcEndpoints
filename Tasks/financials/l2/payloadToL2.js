// Load JSON payload
const fs = require("fs");
const payload = JSON.parse(fs.readFileSync("payload.json", "utf8"));

// Connect to DB and collection
const dbName = "financials";
const collName = "testl1mc";
const coll = db.getSiblingDB(dbName).getCollection(collName);

// Prepare the update object
const scenarioKey = payload.scenario;
const scenarioData = {
  scenario: payload.scenario,
  planId: payload.planId,
  total: payload.total,
  absTotal: payload.absTotal,
  asOfCurrentMonth: payload.asOfCurrentMonth,
  lastUpdatedAt: new Date(payload.lastUpdatedAt),
  years: payload.years,
  costLast: payload.costLast,
  actualsFirst: payload.actualsFirst,
  actualsLast: payload.actualsLast,
  costCenters: payload.costCenters
};

const updateObj = {};
updateObj[scenarioKey] = scenarioData;

// Log and execute
const t1 = Date.now();
print(`[1] Upserting into ${collName} at`, new Date(t1));

coll.updateOne(
  { proposalId: payload.proposalId },
  { $set: updateObj },
  { upsert: true }
);

const t2 = Date.now();
print(`[1] Scenario (${scenarioKey}) upsert done in`, ((t2 - t1) / 1000).toFixed(3), "seconds");
