// cleaner.js — run with: load('cleaner.js')
const fs = require("fs");

/* ======= CONFIG ======= */
const JSON_FILE = "H:/textFiles/9.8.25/reconResponse.json"; // change path
const DRY_RUN   = true;  // true => only print ops

/* ======= scenario → collection suffix (for L3/L4) ======= */
// pending_approval shares the Live collections
const SCENARIO_MAP = {
  outlook: "Outlook",
  budget: "Budget",
  live: "Live",
  pending_approval: "Live",
  working: "Working",
};

/* ======= helpers ======= */
function readInput(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  return JSON.parse(text);
}
function scenarioSuffix(s) {
  const key = String(s || "").toLowerCase();
  return SCENARIO_MAP[key] || (key ? key[0].toUpperCase() + key.slice(1) : null);
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

/* Field used in lvl1/lvl2 for each scenario */
function fieldNameForL1L2(scenario) {
  const s = String(scenario).toLowerCase();
  if (s === "pending_approval") return "pendingApproval"; // per your document shape
  return s; // outlook → 'outlook', live → 'live', budget → 'budget', working → 'working'
}

function setScenarioFieldNull(collectionName, proposalId, scenario) {
  const field = fieldNameForL1L2(scenario);
  const update = { $set: { [field]: null } };
  if (DRY_RUN) {
    console.log(`[DRY] ${collectionName}.updateOne(${JSON.stringify({ proposalId })}, ${JSON.stringify(update)})`);
    return { matchedCount: 0, modifiedCount: 0 };
  }
  return db.getCollection(collectionName).updateOne({ proposalId }, update);
}
function deleteMany(collectionName, filter) {
  if (DRY_RUN) {
    console.log(`[DRY] ${collectionName}.deleteMany(${JSON.stringify(filter)})`);
    return { deletedCount: 0 };
  }
  return db.getCollection(collectionName).deleteMany(filter);
}

/* ======= main ======= */
(function main() {
  let input;
  try { input = readInput(JSON_FILE); }
  catch (e) { console.log(`Failed to read/parse JSON: ${JSON_FILE}\n${String(e)}`); return; }

  const stats = { file: JSON_FILE, DRY_RUN, elementsSeen: 0, l1Updates: 0, l2Updates: 0, l3Deletes: 0, l4Deletes: 0 };

  for (const bucketKey of Object.keys(input)) {
    const arr = input[bucketKey];
    if (!Array.isArray(arr)) continue;

    for (const el of arr) {
      stats.elementsSeen++;

      const proposalId   = el.proposalId || bucketKey;
      const planId       = el.planId;
      const scenario     = el.scenario;
      const gosVersionId = (el.gosVersionId === undefined) ? null : el.gosVersionId;
      const l3ToL4Recon  = el.l3ToL4Recon;
      const l4VersionId  = el.l4VersionId;
      const l3VersionIds = Array.isArray(el.l3VersionIds) ? [...el.l3VersionIds] : [];

      if (!proposalId || !planId || !scenario) {
        console.log(`Skipping element (missing keys): ${JSON.stringify({ proposalId, planId, scenario })}`);
        continue;
      }

      const lvl3 = coll3Name(scenario);
      const lvl4 = coll4Name(scenario);

      // Case 1: gosVersionId is null → null out lvl1/lvl2 field, delete lvl3/lvl4 by key
      if (gosVersionId === null) {
        const r1 = setScenarioFieldNull("lvl1FinancialsSummary", proposalId, scenario);
        const r2 = setScenarioFieldNull("lvl2FinancialsSummary", proposalId, scenario);
        stats.l1Updates += (r1.modifiedCount || 0);
        stats.l2Updates += (r2.modifiedCount || 0);

        const base = { proposalId, planId, scenario };
        const d3 = deleteMany(lvl3, base);
        const d4 = deleteMany(lvl4, base);
        stats.l3Deletes += (d3.deletedCount || 0);
        stats.l4Deletes += (d4.deletedCount || 0);

        console.log(`gosVersionId=null handled for proposalId=${proposalId}, planId=${planId}, scenario=${scenario}`);
      }

      // Case 2: l3ToL4Recon is false → delete lvl3 by l3VersionId (excluding l4VersionId)
      if (l3ToL4Recon === false) {
        if (!l4VersionId) {
          console.log(`l3ToL4Recon=false but missing l4VersionId (proposalId=${proposalId}, planId=${planId}, scenario=${scenario})`);
        } else {
          const idsToDelete = l3VersionIds.filter(v => v !== l4VersionId);
          if (idsToDelete.length > 0) {
            const filter = { proposalId, planId, scenario, l3VersionId: { $in: idsToDelete } };
            const d3 = deleteMany(lvl3, filter);
            stats.l3Deletes += (d3.deletedCount || 0);
            console.log(`Recon=false: delete from ${lvl3} where ${JSON.stringify(filter)}`);
          } else {
            console.log(`Recon=false: no L3 IDs to delete after excluding l4VersionId`);
          }
        }
      }
    }
  }

  console.log("\n==== SUMMARY ====");
  console.log(JSON.stringify(stats, null, 2));
  if (DRY_RUN) console.log("DRY_RUN is ON. No database changes were made.");
})();
