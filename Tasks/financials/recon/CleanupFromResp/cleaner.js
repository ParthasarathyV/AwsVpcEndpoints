/**
 * cleaner.js
 *
 * Purpose
 * -------
 * Clean/realign Financials collections (lvl1FinancialsSummary, lvl2FinancialsSummary,
 * lvl3CostDetails<Scenario>, lvl4CostDetails<Scenario>) using an upstream JSON file.
 *
 * How to Run
 * ----------
 *   use <yourdb>
 *   load('cleaner.js')
 *
 * Toggles (see CONFIG section):
 *   DRY_RUN
 *   HANDLE_GOS_VERSION_NULL
 *   HANDLE_L3_TO_L4_RECON_FALSE
 *   HANDLE_GOS_TO_L4_FALSE
 *
 * Collections & Fields
 * --------------------
 * L3/L4 collections per scenario:
 *   outlook  -> lvl3CostDetailsOutlook / lvl4CostDetailsOutlook
 *   budget   -> lvl3CostDetailsBudget  / lvl4CostDetailsBudget
 *   live     -> lvl3CostDetailsLive    / lvl4CostDetailsLive
 *   working  -> lvl3CostDetailsWorking / lvl4CostDetailsWorking
 *   pending_approval -> uses Live collections for L3/L4
 *
 * lvl1/lvl2 scenario field names:
 *   outlook -> "outlook", budget -> "budget", live -> "live", working -> "working",
 *   pending_approval -> "pendingApproval"
 *
 * Processing (per JSON record)
 * ----------------------------
 * Always logs: proposalId, planId, scenario
 *
 * A) gosVersionId === null (HANDLE_GOS_VERSION_NULL)
 *   - lvl1FinancialsSummary: $unset scenario field
 *   - lvl2FinancialsSummary: $unset scenario field
 *   - lvl3CostDetails<Scenario>: deleteMany({ proposalId, planId, scenario })
 *   - lvl4CostDetails<Scenario>: deleteOne ({ proposalId, planId, scenario })
 *
 * B) l3ToL4Recon === false (HANDLE_L3_TO_L4_RECON_FALSE)
 *   - idsToDelete = l3VersionIds \ { l4VersionId }
 *   - lvl3CostDetails<Scenario>:
 *       deleteMany({ proposalId, scenario, planId: { $ne: currentPlanId }, verId: { $in: idsToDelete } })
 *   - lvl4CostDetails<Scenario>:
 *       skip if scenario is Live;
 *       otherwise deleteMany({ proposalId, scenario, planId: { $ne: currentPlanId }, verId: { $ne: l4VersionId } })
 *
 * C) gosToL4 === false (HANDLE_GOS_TO_L4_FALSE)
 *   - lvl4CostDetails<Scenario>: skip if scenario is Live;
 *       otherwise deleteMany({ proposalId, scenario, planId: { $ne: currentPlanId } })
 *   - lvl3CostDetails<Scenario>:
 *       deleteMany({ proposalId, scenario, planId: { $ne: currentPlanId } })
 *
 * Notes
 * -----
 * - L3 and L4 use "verId" for versioning.
 * - Prints command strings; prints Mongo responses when DRY_RUN=false.
 */

const fs = require("fs");

/* ===================== CONFIG ===================== */
const JSON_FILE = "H:/textFiles/9.8.25/reconResponse.json"; // set your path
const DRY_RUN   = false;  // true => print only; false => execute

const HANDLE_GOS_VERSION_NULL      = true;  // A
const HANDLE_L3_TO_L4_RECON_FALSE  = true;  // B
const HANDLE_GOS_TO_L4_FALSE       = true;  // C

/* ===== scenario → collection suffix (for L3/L4) ===== */
const SCENARIO_MAP = {
  outlook: "Outlook",
  budget:  "Budget",
  live:    "Live",
  pending_approval: "Live", // stored under Live collections
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

// wrappers: always print command; when executing, print response too
function deleteMany(collectionName, filter) {
  console.log(`${collectionName}.deleteMany(${JSON.stringify(filter)})`);
  if (DRY_RUN) return { dryRun: true };
  const resp = db.getCollection(collectionName).deleteMany(filter);
  console.log("→ Response:", JSON.stringify(resp));
  return resp;
}
function deleteOne(collectionName, filter) {
  console.log(`${collectionName}.deleteOne(${JSON.stringify(filter)})`);
  if (DRY_RUN) return { dryRun: true };
  const resp = db.getCollection(collectionName).deleteOne(filter);
  console.log("→ Response:", JSON.stringify(resp));
  return resp;
}
function unsetScenarioField(collectionName, proposalId, scenario) {
  const field = fieldNameForL1L2(scenario);
  const update = { $unset: { [field]: "" } };
  const filter = { proposalId };
  console.log(`${collectionName}.updateOne(${JSON.stringify(filter)}, ${JSON.stringify(update)})`);
  if (DRY_RUN) return { dryRun: true };
  const resp = db.getCollection(collectionName).updateOne(filter, update);
  console.log("→ Response:", JSON.stringify(resp));
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

      // flags/fields from JSON
      const gosVersionId = (el.gosVersionId === undefined) ? null : el.gosVersionId;
      const l3ToL4Recon  = el.l3ToL4Recon;
      const l4VersionId  = el.l4VersionId;
      const l3VersionIds = Array.isArray(el.l3VersionIds) ? [...el.l3VersionIds] : [];
      const gosToL4      = el.gosToL4;

      console.log(`\n--- Processing Record ---`);
      console.log(`proposalId=${proposalId}, planId=${planId}, scenario=${scenario}`);

      if (!proposalId || !scenario) {
        console.log(`Skipping element (missing proposalId/scenario).`);
        continue;
      }

      const lvl3 = coll3Name(scenario);
      const lvl4 = coll4Name(scenario);
      const scenarioLower = String(scenario).toLowerCase();

      /* ===== A) gosVersionId === null ===== */
      if (HANDLE_GOS_VERSION_NULL && gosVersionId === null && planId != null) {
        const r1 = unsetScenarioField("lvl1FinancialsSummary", proposalId, scenario);
        const r2 = unsetScenarioField("lvl2FinancialsSummary", proposalId, scenario);
        stats.l1Unsets += (r1.modifiedCount || 0);
        stats.l2Unsets += (r2.modifiedCount || 0);

        const filterL3 = { proposalId, planId, scenario };
        const d3 = deleteMany(lvl3, filterL3);
        stats.l3Deletes += (d3.deletedCount || 0);

        const filterL4 = { proposalId, planId, scenario };
        const d4 = deleteOne(lvl4, filterL4);
        stats.l4Deletes += (d4.deletedCount || 0);

        console.log(`gosVersionId=null handled`);
      }

      /* ===== B) l3ToL4Recon === false ===== */
      if (HANDLE_L3_TO_L4_RECON_FALSE && l3ToL4Recon === false) {
        if (!l4VersionId) {
          console.log(`Recon=false: missing l4VersionId → skipping L3/L4 cleanup`);
        } else {
          const idsToDelete = l3VersionIds.filter(v => v !== l4VersionId);

          // L3: delete all other plans' versions in idsToDelete
          const filterL3 = { proposalId, scenario, planId: { $ne: planId } };
          if (idsToDelete.length > 0) filterL3.verId = { $in: idsToDelete };
          const d3 = deleteMany(lvl3, filterL3);
          stats.l3Deletes += (d3.deletedCount || 0);
          console.log(`Recon=false: L3 cleaned across other plans`);

          // L4: skip for Live; else delete all other plans' versions that are NOT the current l4VersionId
          if (scenarioLower !== "live") {
            const filterL4 = { proposalId, scenario, planId: { $ne: planId }, verId: { $ne: l4VersionId } };
            const d4extra = deleteMany(lvl4, filterL4);
            stats.l4Deletes += (d4extra.deletedCount || 0);
            console.log(`Recon=false: L4 cleaned across other plans (kept verId=${l4VersionId})`);
          } else {
            console.log(`Recon=false: L4 cleanup skipped for Live scenario`);
          }
        }
      }

      /* ===== C) gosToL4 === false ===== */
      if (HANDLE_GOS_TO_L4_FALSE && gosToL4 === false && planId != null) {
        if (scenarioLower !== "live") {
          const filterL4 = { proposalId, scenario, planId: { $ne: planId } };
          const d4 = deleteMany(lvl4, filterL4);
          stats.l4Deletes += (d4.deletedCount || 0);
          console.log(`gosToL4=false: L4 cleaned (skipped current planId)`);
        } else {
          console.log(`gosToL4=false: L4 cleanup skipped for Live scenario`);
        }

        const filterL3 = { proposalId, scenario, planId: { $ne: planId } };
        const d3 = deleteMany(lvl3, filterL3);
        stats.l3Deletes += (d3.deletedCount || 0);
        console.log(`gosToL4=false: L3 cleaned (skipped current planId)`);
      }
    }
  }

  console.log("\n==== SUMMARY ====");
  console.log(JSON.stringify(stats, null, 2));
  if (DRY_RUN) console.log("DRY_RUN is ON. No database changes were made.");
})();
