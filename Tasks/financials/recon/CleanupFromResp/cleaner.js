/**
 * cleaner.js
 *
 * Purpose
 * -------
 * Clean/realign Financials collections (lvl1FinancialsSummary, lvl2FinancialsSummary,
 * lvl3CostDetails<Scenario>, lvl4CostDetails<Scenario>) based on an upstream JSON file.
 *
 * How to Run
 * ----------
 *   use financials
 *   load('cleaner.js')
 *
 * Configure at the top:
 *   - JSON_FILE            : path to input JSON
 *   - DRY_RUN              : true = print only; false = execute
 *   - handleGosVersion     : process when gosVersionId === null
 *   - handleL3ToL4Recon    : process when l3ToL4Recon === false (only)
 *
 * Scenario Rules
 * --------------
 * L3/L4 collections:
 *   outlook  -> lvl3CostDetailsOutlook / lvl4CostDetailsOutlook
 *   budget   -> lvl3CostDetailsBudget  / lvl4CostDetailsBudget
 *   live     -> lvl3CostDetailsLive    / lvl4CostDetailsLive
 *   working  -> lvl3CostDetailsWorking / lvl4CostDetailsWorking
 *   pending_approval -> uses the Live collections for L3/L4
 *
 * lvl1/lvl2 fields:
 *   outlook -> "outlook", budget -> "budget", live -> "live", working -> "working",
 *   pending_approval -> "pendingApproval"
 *
 * Processing Logic (per JSON record)
 * ----------------------------------
 * Always logs: proposalId, planId, scenario
 *
 * Case 1: gosVersionId === null  (when handleGosVersion = true)
 *   - lvl1FinancialsSummary: $unset the scenario field (remove it entirely).
 *   - lvl2FinancialsSummary: $unset the scenario field.
 *   - lvl3CostDetails<Scenario>: delete { proposalId, planId, scenario }.
 *   - lvl4CostDetails<Scenario>: delete { proposalId, planId, scenario }.
 *
 * Case 2: l3ToL4Recon === false  (when handleL3ToL4Recon = true)
 *   - From JSON: take l3VersionIds and remove l4VersionId -> idsToDelete.
 *   - lvl3CostDetails<Scenario>:
 *       delete { proposalId, planId, scenario, verId: { $in: idsToDelete } }.
 *       (i.e., keep the version equal to l4VersionId; delete the others.)
 *   - lvl4CostDetails<Scenario>:
 *       delete { proposalId, planId, scenario, verId: { $ne: l4VersionId } }.
 *       (i.e., keep only l4VersionId; delete older/other versions.)
 *
 * Notes
 * -----
 * - L3 version field is **verId** (updated).
 * - L4 version field is **verId**.
 * - Prints every Mongo command string. When DRY_RUN=false, also prints MongoDB response objects.
 * - Summary printed at the end.
 */

const fs = require("fs");

/* ======= CONFIG ======= */
const JSON_FILE = "H:/textFiles/9.8.25/reconResponse.json"; // change this path
const DRY_RUN   = false;   // true => only print ops; false => execute ops
const handleGosVersion  = true;   // process gosVersionId === null
const handleL3ToL4Recon = true;   // process l3ToL4Recon === false

/* ======= scenario → collection suffix (for L3/L4) ======= */
const SCENARIO_MAP = {
  outlook: "Outlook",
  budget:  "Budget",
  live:    "Live",
  pending_approval: "Live", // pending_approval stored under Live collections for L3/L4
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

/* Always print the command; execute if DRY_RUN=false; also print response when executing */
function unsetScenarioField(collectionName, proposalId, scenario) {
  const field = fieldNameForL1L2(scenario);
  const update = { $unset: { [field]: "" } };
  const filter = { proposalId };
  const cmd = `${collectionName}.updateOne(${JSON.stringify(filter)}, ${JSON.stringify(update)})`;
  console.log(cmd);
  if (DRY_RUN) return { dryRun: true };
  const resp = db.getCollection(collectionName).updateOne(filter, update);
  console.log("→ Response:", JSON.stringify(resp));
  return resp;
}
function deleteMany(collectionName, filter) {
  const cmd = `${collectionName}.deleteMany(${JSON.stringify(filter)})`;
  console.log(cmd);
  if (DRY_RUN) return { dryRun: true };
  const resp = db.getCollection(collectionName).deleteMany(filter);
  console.log("→ Response:", JSON.stringify(resp));
  return resp;
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
      const l3ToL4Recon  = el.l3ToL4Recon; // boolean
      const l4VersionId  = el.l4VersionId; // version to KEEP in L4
      const l3VersionIds = Array.isArray(el.l3VersionIds) ? [...el.l3VersionIds] : []; // source list for L3

      console.log(`\n--- Processing Record ---`);
      console.log(`proposalId=${proposalId}, planId=${planId}, scenario=${scenario}`);

      if (!proposalId || !planId || !scenario) {
        console.log(`Skipping element (missing keys).`);
        continue;
      }

      const lvl3 = coll3Name(scenario);
      const lvl4 = coll4Name(scenario);

      /* ===== Case 1: gosVersionId === null ===== */
      if (handleGosVersion && gosVersionId === null) {
        // L1/L2: UNSET scenario field
        const r1 = unsetScenarioField("lvl1FinancialsSummary", proposalId, scenario);
        const r2 = unsetScenarioField("lvl2FinancialsSummary", proposalId, scenario);
        stats.l1Unsets += (r1.modifiedCount || 0);
        stats.l2Unsets += (r2.modifiedCount || 0);

        // L3/L4: full delete by proposalId+planId+scenario
        const base = { proposalId, planId, scenario };
        const d3 = deleteMany(lvl3, base);
        const d4 = deleteMany(lvl4, base);
        stats.l3Deletes += (d3.deletedCount || 0);
        stats.l4Deletes += (d4.deletedCount || 0);

        console.log(`gosVersionId=null handled`);
      }

      /* ===== Case 2: l3ToL4Recon === false ===== */
      if (handleL3ToL4Recon && l3ToL4Recon === false) {
        if (!l4VersionId) {
          console.log(`Recon=false: missing l4VersionId → skipping L3/L4 cleanup for this record`);
        } else {
          // L3 trims: delete all L3 versions (verId) except the one matching l4VersionId
          const idsToDelete = l3VersionIds.filter(v => v !== l4VersionId);
          if (idsToDelete.length > 0) {
            const filterL3 = { proposalId, planId, scenario, verId: { $in: idsToDelete } }; // L3 uses verId
            const d3 = deleteMany(lvl3, filterL3);
            stats.l3Deletes += (d3.deletedCount || 0);
            console.log(`Recon=false: L3 trimmed (kept verId=${l4VersionId})`);
          } else {
            console.log(`Recon=false: no L3 verIds to delete (nothing besides l4VersionId present)`);
          }

          // L4 cleanup: keep the provided verId == l4VersionId; delete others
          const filterL4 = { proposalId, planId, scenario, verId: { $ne: l4VersionId } };
          const d4extra = deleteMany(lvl4, filterL4);
          stats.l4Deletes += (d4extra.deletedCount || 0);
          console.log(`Recon=false: L4 cleaned (kept verId=${l4VersionId})`);
        }
      }

      // No handling for l3ToL4Recon === true (by design)
    }
  }

  console.log("\n==== SUMMARY ====");
  console.log(JSON.stringify(stats, null, 2));
  if (DRY_RUN) console.log("DRY_RUN is ON. No database changes were made.");
})();
