/**********************************************************************
 *  lvl4 PURGE SCRIPT
 *      1.  Remove docs with older verIds (keep latest verId)
 *      2.  Remove exact-same-verId duplicates (keep newest _id)
 *      3.  Delete everything in ONE deleteMany()
 **********************************************************************/

const coll = db.lvl4;

/* ---------- 1. Out-of-date verIds --------------------------------- */
const outdatedIds = coll.aggregate([
  // Build ONE compound key so $rank can sort by a single field
  { $addFields: {
      _sortKey: { $concat: [ "$verId", "-", { $toString: "$_id" } ] }
  }},
  { $setWindowFields: {
      partitionBy: { proposalId:"$proposalId", planId:"$planId", scenario:"$scenario" },
      sortBy:      { _sortKey: -1 },         // newest verId (then newest _id)
      output:      { rk: { $rank: {} } }
  }},
  { $match: { rk: { $gt: 1 } } },            // ranks 2-N → delete
  { $project: { _id: 1 } }
]).toArray().map(d => d._id);

/* ---------- 2. Same-verId duplicates ------------------------------ */
const sameVerIds = coll.aggregate([
  { $setWindowFields: {
      partitionBy: {
        proposalId:"$proposalId",
        planId:"$planId",
        scenario:"$scenario",
        verId:"$verId"                      // verId included here
      },
      sortBy: { _id: -1 },                  // newest insert first
      output: { rk: { $rank: {} } }
  }},
  { $match: { rk: { $gt: 1 } } },           // keep rank 1, nix the rest
  { $project: { _id: 1 } }
]).toArray().map(d => d._id);

/* ---------- 3. Union + one-shot delete ---------------------------- */
const idsToKill = [...new Set([...outdatedIds, ...sameVerIds])];  // ≤ 500 ids

if (idsToKill.length) {
  const res = coll.deleteMany({ _id: { $in: idsToKill } });
  print(`🗑️  Deleted ${res.deletedCount} unnecessary documents.`);
} else {
  print("Collection already clean – nothing to delete.");
}

/* ---------- 4. (Optional) Prevent future duplicates --------------- */
coll.createIndex(
  { proposalId: 1, planId: 1, scenario: 1 },
  { unique: true, name: "uq_proposal_plan_scenario" }
);
