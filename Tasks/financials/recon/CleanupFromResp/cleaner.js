/**
 * cleaner.js
 *
 * Purpose
 * -------
 * Clean/realign Financials collections (lvl1FinancialsSummary, lvl2FinancialsSummary,
 * lvl3CostDetails<Scenario>, lvl4CostDetails<Scenario>) based on reconciliation JSON input.
 *
 * How to Run
 * ----------
 *   use <yourdb>
 *   load('cleaner.js')
 *
 * Configuration (see CONFIG section below)
 * ----------------------------------------
 *   JSON_FILE                   : path to input JSON
 *   DRY_RUN                     : true = print only, false = execute
 *   HANDLE_GOS_VERSION_NULL     : process when gosVersionId === null
 *   HANDLE_L3_TO_L4_RECON_FALSE : process when l3ToL4Recon === false
 *   HANDLE_GOS_TO_L4_FALSE      : process when gosToL4 === false
 *
 * Collections & Scenario Mapping
 * ------------------------------
 * L3/L4 collections per scenario:
 *   outlook          -> lvl3CostDetailsOutlook / lvl4CostDetailsOutlook
 *   budget           -> lvl3CostDetailsBudget  / lvl4CostDetailsBudget
 *   live             -> lvl3CostDetailsLive    / lvl4CostDetailsLive
 *   working          -> lvl3CostDetailsWorking / lvl4CostDetailsWorking
 *   pending_approval -> mapped to Live collections for L3/L4
 *
 * lvl1/lvl2 field names:
 *   outlook          -> "outlook"
 *   budget           -> "budget"
 *   live             -> "live"
 *   working          -> "working"
 *   pending_approval -> "pendingApproval"
 *
 * Processing Logic (per JSON record)
 * ----------------------------------
 * Always logs: proposalId, planId, scenario
 *
 * 1) gosVersionId === null   (HANDLE_GOS_VERSION_NULL)
 *    - lvl1FinancialsSummary: $unset scenario field
 *    - lvl2FinancialsSummary: $unset scenario field
 *    - lvl3CostDetails<Scenario>: deleteMany({ proposalId, planId, scenario })
 *    - lvl4CostDetails<Scenario>: deleteOne ({ proposalId, planId, scenario })
 *
 * 2) l3ToL4Recon === false   (HANDLE_L3_TO_L4_RECON_FALSE)
 *    - Compute idsToDelete = l3VersionIds − { l4VersionId }
 *    - lvl3CostDetails<Scenario>:
 *         deleteMany({ proposalId, scenario, planId: { $ne: currentPlanId }, verId: { $in: idsToDelete } })
 *    - lvl4CostDetails<Scenario>:
 *         skip if scenario is Live
 *         otherwise deleteMany({ proposalId, scenario, planId: { $ne: currentPlanId }, verId: { $ne: l4VersionId } })
 *
 * 3) gosToL4 === false       (HANDLE_GOS_TO_L4_FALSE)
 *    - lvl4CostDetails<Scenario>:
 *         skip if scenario is Live
 *         otherwise deleteMany({ proposalId, scenario, planId: { $ne: currentPlanId } })
 *    - lvl3CostDetails<Scenario>:
 *         deleteMany({ proposalId, scenario, planId: { $ne: currentPlanId } })
 *
 * Notes
 * -----
 * - Both L3 and L4 use "verId" as the version field.
 * - All delete filters exclude the current planId (`planId: { $ne: currentPlanId }`).
 * - L4 deletes are always skipped for Live scenario.
 * - Prints each command string; when DRY_RUN=false, also prints Mongo responses.
 * - Summary is shown at the end.
 */

const fs = require("fs");

/* ===================== CONFIG ===================== */
const JSON_FILE = "H:/textFiles/9.8.25/reconResponse.json"; // set your path
const DRY_RUN   = false;  // true => print only; false => execute

const HANDLE_GOS_VERSION_NULL     = true;
const HANDLE_L3_TO_L4_RECON_FALSE = true;
const HANDLE_GOS_TO_L4_FALSE      = true;

/* ===== scenario → collection suffix (for L3/L4) ===== */
const SCENARIO_MAP = {
  outlook: "Outlook",
  budget:  "Budget",
  live:    "Live",
  pending_approval: "Live",
  working: "Working",
};

/* ===================== HELPERS ===================== */
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
function fieldNameForL1L2(scenario) {
  const s = String(scenario).toLowerCase();
  return s === "pending_approval" ? "pendingApproval" : s;
}

function deleteMany(collectionName, filter) {
  console.log(`→ CMD: ${collectionName}.deleteMany(${JSON.stringify(filter)})`);
  if (DRY_RUN) return { dryRun: true };
  const resp = db.getCollection(collectionName).deleteMany(filter);
  console.log("→ RESP:", JSON.stringify(resp));
  return resp;
}
function deleteOne(collectionName, filter) {
  console.log(`→ CMD: ${collectionName}.deleteOne(${JSON.stringify(filter)})`);
  if (DRY_RUN) return { dryRun: true };
  const resp = db.getCollection(collectionName).deleteOne(filter);
  console.log("→ RESP:", JSON.stringify(resp));
  return resp;
}
function unsetScenarioField(collectionName, proposalId, scenario) {
  const field = fieldNameForL1L2(scenario);
  const update = { $unset: { [field]: "" } };
  const filter = { proposalId };
  console.log(`→ CMD: ${collectionName}.updateOne(${JSON.stringify(filter)}, ${JSON.stringify(update)})`);
  if (DRY_RUN) return { dryRun: true };
  const resp = db.getCollection(collectionName).updateOne(filter, update);
  console.log("→ RESP:", JSON.stringify(resp));
  return resp;
}

/* ===================== MAIN ===================== */
(function main() {
  let input;
  try { input = readInput(JSON_FILE); }
  catch (e) { console.log(`Failed to read/parse JSON: ${JSON_FILE}\n${String(e)}`); return; }

  const stats = {
    file: JSON_FILE, DRY_RUN,
    toggles: { HANDLE_GOS_VERSION_NULL, HANDLE_L3_TO_L4_RECON_FALSE, HANDLE_GOS_TO_L4_FALSE },
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
      const gosToL4      = el.gosToL4;

      console.log(`\n=== Processing Record ===`);
      console.log(`proposalId=${proposalId}, planId=${planId}, scenario=${scenario}`);

      const lvl3 = coll3Name(scenario);
      const lvl4 = coll4Name(scenario);
      const scenarioLower = String(scenario).toLowerCase();

      /* ===== gosVersionId === null ===== */
      if (HANDLE_GOS_VERSION_NULL && gosVersionId === null && planId != null) {
        console.log(`--- Handling gosVersionId === null ---`);
        const r1 = unsetScenarioField("lvl1FinancialsSummary", proposalId, scenario);
        const r2 = unsetScenarioField("lvl2FinancialsSummary", proposalId, scenario);
        stats.l1Unsets += (r1.modifiedCount || 0);
        stats.l2Unsets += (r2.modifiedCount || 0);

        const d3 = deleteMany(lvl3, { proposalId, planId, scenario });
        stats.l3Deletes += (d3.deletedCount || 0);

        const d4 = deleteOne(lvl4, { proposalId, planId, scenario });
        stats.l4Deletes += (d4.deletedCount || 0);
      }

      /* ===== l3ToL4Recon === false ===== */
      if (HANDLE_L3_TO_L4_RECON_FALSE && l3ToL4Recon === false) {
        console.log(`--- Handling l3ToL4Recon === false ---`);
        if (!l4VersionId) {
          console.log(`Skipping: missing l4VersionId`);
        } else {
          const idsToDelete = l3VersionIds.filter(v => v !== l4VersionId);

          const filterL3 = { proposalId, scenario, planId: { $ne: planId } };
          if (idsToDelete.length > 0) filterL3.verId = { $in: idsToDelete };
          const d3 = deleteMany(lvl3, filterL3);
          stats.l3Deletes += (d3.deletedCount || 0);

          if (scenarioLower !== "live") {
            const filterL4 = { proposalId, scenario, planId: { $ne: planId }, verId: { $ne: l4VersionId } };
            const d4extra = deleteMany(lvl4, filterL4);
            stats.l4Deletes += (d4extra.deletedCount || 0);
          } else {
            console.log(`Skipping L4 cleanup for Live scenario`);
          }
        }
      }

      /* ===== gosToL4 === false ===== */
      if (HANDLE_GOS_TO_L4_FALSE && gosToL4 === false && planId != null) {
        console.log(`--- Handling gosToL4 === false ---`);
        if (scenarioLower !== "live") {
          const d4 = deleteMany(lvl4, { proposalId, scenario, planId: { $ne: planId } });
          stats.l4Deletes += (d4.deletedCount || 0);
        } else {
          console.log(`Skipping L4 cleanup for Live scenario`);
        }

        const d3 = deleteMany(lvl3, { proposalId, scenario, planId: { $ne: planId } });
        stats.l3Deletes += (d3.deletedCount || 0);
      }
    }
  }

  console.log("\n==== SUMMARY ====");
  console.log(JSON.stringify(stats, null, 2));
  if (DRY_RUN) console.log("DRY_RUN is ON. No database changes were made.");
})();
