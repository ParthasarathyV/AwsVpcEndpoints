/**********************************************************************
 *  lvl4 PURGE WITH VERBOSE LOGGING  (no emojis)
 *      1. Remove docs with older verIds (keep latest verId per trio)
 *      2. Remove same-verId duplicates   (keep newest _id)
 *      3. Delete everything in ONE deleteMany()
 *  MongoDB 5.0+   ($setWindowFields + $rank)
 **********************************************************************/

const coll = db.lvl4;

const startCount = coll.estimatedDocumentCount();
print("Starting documents in lvl4: " + startCount);

/* ---------- Pass 1 – outdated verIds ------------------------------ */
print("\nPass 1: finding docs with older verIds …");

const outdatedIds = coll.aggregate([
  { $addFields: {
      _sortKey: { $concat: [ "$verId", "-", { $toString: "$_id" } ] }
  }},
  { $setWindowFields: {
      partitionBy: { proposalId:"$proposalId", planId:"$planId", scenario:"$scenario" },
      sortBy:      { _sortKey: -1 },
      output:      { rk: { $rank: {} } }
  }},
  { $match: { rk: { $gt: 1 } } },
  { $project: { _id: 1 } }
]).toArray().map(d => d._id);

print("   • Docs to drop (older verIds): " + outdatedIds.length);

/* ---------- Pass 2 – same-verId duplicates ------------------------ */
print("\nPass 2: finding same-verId duplicates …");

const sameVerIds = coll.aggregate([
  { $setWindowFields: {
      partitionBy: {
        proposalId:"$proposalId",
        planId:"$planId",
        scenario:"$scenario",
        verId:"$verId"
      },
      sortBy: { _id: -1 },
      output: { rk: { $rank: {} } }
  }},
  { $match: { rk: { $gt: 1 } } },
  { $project: { _id: 1 } }
]).toArray().map(d => d._id);

print("   • Docs to drop (same verId):   " + sameVerIds.length);

/* ---------- Union + purge ---------------------------------------- */
const idsToKill = [...new Set([...outdatedIds, ...sameVerIds])];

print("\nSummary");
print("   • Total unique _ids to delete: " + idsToKill.length);

if (idsToKill.length) {
  print("\nExecuting deleteMany() …");
  const res = coll.deleteMany({ _id: { $in: idsToKill } });
  print("   • deleteMany() removed " + res.deletedCount + " documents.");
} else {
  print("   • Nothing to delete — collection already clean.");
}

/* ---------- Post-cleanup stats & optional index ------------------- */
const endCount = coll.estimatedDocumentCount();
print("\nDocuments after cleanup: " + endCount);
print("Net change: " + (startCount - endCount) + " documents removed.");

/* OPTIONAL: prevent future duplicates */
print("\nCreating (or verifying) unique index on proposalId + planId + scenario …");
try {
  coll.createIndex(
    { proposalId: 1, planId: 1, scenario: 1 },
    { unique: true, name: "uq_proposal_plan_scenario" }
  );
  print("   • Unique index created or already existed.");
} catch (e) {
  print("   • Index creation error: " + e.message);
}

print("\nPurge complete.");
