// cleaner.js — run with: use <db>; load('cleaner.js')
const fs = require("fs");

/* ======= CONFIG ======= */
const JSON_FILE = "H:/textFiles/9.8.25/reconResponse.json"; // change this
const DRY_RUN   = false;   // true => only print ops
const handleGosVersion  = true;  // process gosVersionId === null
const handleL3ToL4Recon = true;  // process l3ToL4Recon === false

/* ======= scenario → collection suffix (for L3/L4) ======= */
/* pending_approval is stored in Live collections */
const SCENARIO_MAP = {
  outlook: "Outlook",
  budget:  "Budget",
  live:    "Live",
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
function coll3Name(scenario) { return `lvl3CostDetails${scenarioSuffix(scenario)}`; }
function coll4Name(scenario) { return `lvl4CostDetails${scenarioSuffix(scenario)}`; }

/* lvl1/lvl2 field name: pending_approval -> 'pendingApproval' */
function fieldNameForL1L2(scenario) {
  const s = String(scenario).toLowerCase();
  return s === "pending_approval" ? "pendingApproval" : s;
}

/* Always print the command; execute if DRY_RUN=false */
function unsetScenarioField(collectionName, proposalId, scenario) {
  const field = fieldNameForL1L2(scenario);
  const update = { $unset: { [field]: "" } };
  const cmd = `${collectionName}.updateOne(${JSON.stringify({ proposalId })}, ${JSON.stringify(update)})`;
  console.log(cmd);
  if (DRY_RUN) return { matchedCount: 0, modifiedCount: 0 };
  return db.getCollection(collectionName).updateOne({ proposalId }, update);
}
function deleteMany(collectionName, filter) {
  const cmd = `${collectionName}.deleteMany(${JSON.stringify(filter)})`;
  console.log(cmd);
  if (DRY_RUN) return { deletedCount: 0 };
  return db.getCollection(collectionName).deleteMany(filter);
}

/* ======= main ======= */
(function main() {
  let input;
  try { input = readInput(JSON_FILE); }
  catch (e) { console.log(`Failed to read/parse JSON: ${JSON_FILE}\n${String(e)}`); return; }

  const stats = {
    file: JSON_FILE, DRY_RUN, handleGosVersion, handleL3ToL4Recon,
    elementsSeen: 0, l1Unsets: 0, l2Unsets: 0, l3Deletes: 0, l4Deletes: 0
  };

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

      console.log(`\n--- Processing Record ---`);
      console.log(`proposalId=${proposalId}, planId=${planId}, scenario=${scenario}`);

      if (!proposalId || !planId || !scenario) {
        console.log(`Skipping element (missing keys).`);
        continue;
      }

      const lvl3 = coll3Name(scenario);
      const lvl4 = coll4Name(scenario);

      // ===== Case 1: gosVersionId is null =====
      if (handleGosVersion && gosVersionId === null) {
        // lvl1 & lvl2 → UNSET the scenario field
        const r1 = unsetScenarioField("lvl1FinancialsSummary", proposalId, scenario);
        const r2 = unsetScenarioField("lvl2FinancialsSummary", proposalId, scenario);
        stats.l1Unsets += (r1.modifiedCount || 0);
        stats.l2Unsets += (r2.modifiedCount || 0);

        // lvl3 & lvl4 deletes include planId (as before)
        const base = { proposalId, planId, scenario };
        const d3 = deleteMany(lvl3, base);
        const d4 = deleteMany(lvl4, base);
        stats.l3Deletes += (d3.deletedCount || 0);
        stats.l4Deletes += (d4.deletedCount || 0);

        console.log(`gosVersionId=null handled`);
      }

      // ===== Case 2: l3ToL4Recon is false =====
      if (handleL3ToL4Recon && l3ToL4Recon === false) {
        if (!l4VersionId) {
          console.log(`l3ToL4Recon=false but missing l4VersionId`);
        } else {
          const idsToDelete = l3VersionIds.filter(v => v !== l4VersionId);
          if (idsToDelete.length > 0) {
            const filter = { proposalId, planId, scenario, l3VersionId: { $in: idsToDelete } };
            const d3 = deleteMany(lvl3, filter);
            stats.l3Deletes += (d3.deletedCount || 0);
            console.log(`Recon=false handled`);
          } else {
            console.log(`Recon=false: no L3 IDs left to delete`);
          }
        }
      }
    }
  }

  console.log("\n==== SUMMARY ====");
  console.log(JSON.stringify(stats, null, 2));
  if (DRY_RUN) console.log("DRY_RUN is ON. No database changes were made.");
})();
