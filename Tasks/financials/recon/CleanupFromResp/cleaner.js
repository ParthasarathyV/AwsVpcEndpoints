/**
 * run with:  mongosh --file script.js
 * or:        mongosh
 *            > load('script.js')
 *
 * Put your JSON either in INLINE_JSON below or provide a path in JSON_FILE.
 * The expected JSON shape matches your screenshot: an object whose keys are
 * proposalId-like strings and values are arrays of elements with fields like:
 * { proposalId, planId, scenario, gosVersionId, l3ToL4Recon, l4VersionId, l3VersionIds, ... }
 */

/* ===================== CONFIG ===================== */

// Option A: paste JSON right here (keep it an object literal or JSON.parse string)
const INLINE_JSON = null; // e.g. { "f88a8...": [ { ... }, { ... } ], "8d43f...":[ ... ] }

// Option B: path to a .json file (comment if unused)
const JSON_FILE = null; // e.g. '/path/to/data.json'

// Safety: dry run first (true = only log what would happen)
const DRY_RUN = false;

/* ===== scenario → collection-suffix mapping (normalize names) ===== */
const SCENARIO_MAP = {
  outlook: "Outlook",
  budget: "Budget",
  live: "Live",
  working: "Working",
  pending_approval: "PendingApproval",
};

/* ===================== HELPERS ===================== */

function readInput() {
  if (INLINE_JSON && typeof INLINE_JSON === 'object') return INLINE_JSON;
  if (JSON_FILE) {
    try {
      // mongosh provides cat() helper in most environments
      const text = cat(JSON_FILE);
      return JSON.parse(text);
    } catch (e) {
      print(`Failed to read/parse JSON_FILE: ${JSON_FILE}`);
      throw e;
    }
  }
  throw new Error("No input provided. Set INLINE_JSON or JSON_FILE.");
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
  const field = String(scenario);
  const update = { $set: { [field]: null } };
  if (DRY_RUN) {
    print(`[DRY] ${collectionName}.updateOne({proposalId: "${proposalId}"}, ${tojson(update)})`);
    return { matchedCount: 0, modifiedCount: 0 };
  }
  return db.getCollection(collectionName).updateOne({ proposalId }, update);
}

function deleteByKey(collectionName, filter) {
  if (DRY_RUN) {
    print(`[DRY] ${collectionName}.deleteMany(${tojson(filter)})`);
    return { deletedCount: 0 };
  }
  return db.getCollection(collectionName).deleteMany(filter);
}

/* ===================== MAIN ===================== */

(function main() {
  const input = readInput();

  // Stats
  let stats = {
    l1Updates: 0,
    l2Updates: 0,
    l3Deletes: 0,
    l4Deletes: 0,
    elementsSeen: 0
  };

  // Iterate top-level keys (proposal buckets)
  for (const bucketKey of Object.keys(input)) {
    const arr = input[bucketKey];
    if (!Array.isArray(arr)) continue;

    for (const el of arr) {
      stats.elementsSeen++;

      const proposalId = el.proposalId || el.proposalID || el.proposal_Id || bucketKey;
      const planId     = el.planId;
      const scenario   = el.scenario;
      const gosVersionId = el.gosVersionId ?? el.gosVersionID ?? null;
      const l3ToL4Recon = el.l3ToL4Recon;
      const l4VersionId = el.l4VersionId;
      const l3VersionIds = Array.isArray(el.l3VersionIds) ? el.l3VersionIds.slice() : [];

      if (!proposalId || !planId || !scenario) {
        print(`Skipping element due to missing keys. proposalId=${proposalId}, planId=${planId}, scenario=${scenario}`);
        continue;
      }

      const lvl3 = coll3Name(scenario);
      const lvl4 = coll4Name(scenario);

      /* ---------- Case 1: gosVersionId is null ---------- */
      if (gosVersionId === null) {
        // set scenario field to null on lvl1 & lvl2
        const r1 = setScenarioFieldNull("lvl1FinancialsSummary", proposalId, scenario);
        const r2 = setScenarioFieldNull("lvl2FinancialsSummary", proposalId, scenario);
        stats.l1Updates += (r1.modifiedCount || 0);
        stats.l2Updates += (r2.modifiedCount || 0);

        // delete lvl3/lvl4 by (proposalId, planId, scenario)
        const baseFilter = { proposalId, planId, scenario };
        const d3 = deleteByKey(lvl3, baseFilter);
        const d4 = deleteByKey(lvl4, baseFilter);
        stats.l3Deletes += (d3.deletedCount || 0);
        stats.l4Deletes += (d4.deletedCount || 0);

        print(`Handled gosVersionId=null for proposalId=${proposalId}, planId=${planId}, scenario=${scenario}`);
      }

      /* ---------- Case 2: l3ToL4Recon is false ---------- */
      if (l3ToL4Recon === false) {
        if (!l4VersionId) {
          print(`l3ToL4Recon=false but l4VersionId missing for proposalId=${proposalId}, planId=${planId}, scenario=${scenario}`);
        } else {
          // remove l4VersionId from L3 ids and delete those L3 docs that remain
          const idsToDelete = l3VersionIds.filter(v => v !== l4VersionId);
          if (idsToDelete.length > 0) {
            const filter = { proposalId, planId, scenario, l3VersionId: { $in: idsToDelete } };
            const d3 = deleteByKey(lvl3, filter);
            stats.l3Deletes += (d3.deletedCount || 0);

            print(`Recon=false: deleted ${d3.deletedCount || 0} from ${lvl3} for proposalId=${proposalId}, planId=${planId}, scenario=${scenario}, l3VersionId in ${tojson(idsToDelete)}`);
          } else {
            print(`Recon=false: nothing to delete in ${lvl3} (only l4VersionId present) for proposalId=${proposalId}, planId=${planId}, scenario=${scenario}`);
          }
        }
      }
    }
  }

  print("\n==== SUMMARY ====");
  printjson(stats);
  if (DRY_RUN) {
    print("DRY_RUN was enabled. Re-run with DRY_RUN=false to apply changes.");
  }
})();
