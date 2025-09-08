// cleaner.js
// Run in mongosh:  mongosh yourDbName --file cleaner.js

const fs = require("fs");

/* ===================== CONFIG ===================== */

// Path to your input JSON file
const JSON_FILE = "H:/textFiles/9.8.25/reconResponse.json";

// Safety: dry run first (true = only log the ops)
const DRY_RUN = true;

/* ===== scenario → collection-suffix mapping (normalize names) ===== */
const SCENARIO_MAP = {
  outlook: "Outlook",
  budget: "Budget",
  live: "Live",
  pending_approval: "Live",   // treat pending_approval as Live
  working: "Working",
};

/* ===================== HELPERS ===================== */

function readInput() {
  try {
    const text = fs.readFileSync(JSON_FILE, "utf8");
    return JSON.parse(text);
  } catch (e) {
    console.log(`Failed to read/parse JSON_FILE: ${JSON_FILE}`);
    throw e;
  }
}

function scenarioSuffix(s) {
  if (!s) return null;
  const key = String(s).toLowerCase();
  return SCENARIO_MAP[key] || (key.charAt(0).toUpperCase() + key.slice(1));
}

function coll3Name(scenario) {
  const suff = scenarioSuffix(scenario);
  if (!suff) throw new Error(`Unknown scenario: ${scenario}`);
  return `lvl3CostDetails${suff}`;
}

function coll4Name(scenario) {
  const suff = scenarioSuffix(scenario);
  if (!suff) throw new Error(`Unknown scenario: ${scenario}`);
  return `lvl4CostDetails${suff}`;
}

function setScenarioFieldNull(collectionName, proposalId, scenario) {
  const field = String(scenario).toLowerCase() === "pending_approval" ? "live" : scenario;
  const update = { $set: { [field]: null } };
  if (DRY_RUN) {
    console.log(`[DRY] ${collectionName}.updateOne({proposalId: "${proposalId}"}, ${tojson(update)})`);
    return { matchedCount: 0, modifiedCount: 0 };
  }
  return db.getCollection(collectionName).updateOne({ proposalId }, update);
}

function deleteByKey(collectionName, filter) {
  if (DRY_RUN) {
    console.log(`[DRY] ${collectionName}.deleteMany(${tojson(filter)})`);
    return { deletedCount: 0 };
  }
  return db.getCollection(collectionName).deleteMany(filter);
}

/* ===================== MAIN ===================== */

(function main() {
  const input = readInput();

  let stats = {
    l1Updates: 0,
    l2Updates: 0,
    l3Deletes: 0,
    l4Deletes: 0,
    elementsSeen: 0
  };

  for (const bucketKey of Object.keys(input)) {
    const arr = input[bucketKey];
    if (!Array.isArray(arr)) continue;

    for (const el of arr) {
      stats.elementsSeen++;

      const proposalId = el.proposalId || bucketKey;
      const planId     = el.planId;
      const scenario   = el.scenario;
      const gosVersionId = el.gosVersionId ?? null;
      const l3ToL4Recon = el.l3ToL4Recon;
      const l4VersionId = el.l4VersionId;
      const l3VersionIds = Array.isArray(el.l3VersionIds) ? el.l3VersionIds.slice() : [];

      if (!proposalId || !planId || !scenario) {
        console.log(`Skipping element missing keys. proposalId=${proposalId}, planId=${planId}, scenario=${scenario}`);
        continue;
      }

      const lvl3 = coll3Name(scenario);
      const lvl4 = coll4Name(scenario);

      // Case 1: gosVersionId is null
      if (gosVersionId === null) {
        const r1 = setScenarioFieldNull("lvl1FinancialsSummary", proposalId, scenario);
        const r2 = setScenarioFieldNull("lvl2FinancialsSummary", proposalId, scenario);
        stats.l1Updates += (r1.modifiedCount || 0);
        stats.l2Updates += (r2.modifiedCount || 0);

        const baseFilter = { proposalId, planId, scenario };
        const d3 = deleteByKey(lvl3, baseFilter);
        const d4 = deleteByKey(lvl4, baseFilter);
        stats.l3Deletes += (d3.deletedCount || 0);
        stats.l4Deletes += (d4.deletedCount || 0);

        console.log(`Handled gosVersionId=null for proposalId=${proposalId}, planId=${planId}, scenario=${scenario}`);
      }

      // Case 2: l3ToL4Recon is false
      if (l3ToL4Recon === false) {
        if (!l4VersionId) {
          console.log(`l3ToL4Recon=false but no l4VersionId for proposalId=${proposalId}, planId=${planId}, scenario=${scenario}`);
        } else {
          const idsToDelete = l3VersionIds.filter(v => v !== l4VersionId);
          if (idsToDelete.length > 0) {
            const filter = { proposalId, planId, scenario, l3VersionId: { $in: idsToDelete } };
            const d3 = deleteByKey(lvl3, filter);
            stats.l3Deletes += (d3.deletedCount || 0);

            console.log(`Recon=false: deleted ${d3.deletedCount || 0} from ${lvl3} for proposalId=${proposalId}, planId=${planId}, scenario=${scenario}, l3VersionIds=${tojson(idsToDelete)}`);
          }
        }
      }
    }
  }

  console.log("\n==== SUMMARY ====");
  console.log(JSON.stringify(stats, null, 2));
  if (DRY_RUN) console.log("DRY_RUN is ON. No real changes were made.");
})();
