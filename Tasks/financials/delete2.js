
/**********************************************************************
 *  lvl4 de-dup: keep the newest verId per {proposalId, planId, scenario}
 *  MongoDB 5.0+ (uses $setWindowFields).  Run in mongosh.
 **********************************************************************/

const coll = db.lvl4;

// ---- 1 + 2. Get the _ids to remove ---------------------------------
const dupes = coll.aggregate([
  {
    $setWindowFields: {
      partitionBy: {
        proposalId: "$proposalId",
        planId:     "$planId",
        scenario:   "$scenario"
      },
      sortBy: { verId: -1 },     // newest first
      output: { rank: { $rank: {} } }
    }
  },
  { $match: { rank: { $gt: 1 } } },   // everything after the 1st is a dupe
  { $project: { _id: 1 } }
]).toArray().map(d => d._id);          // <= 500 ids in memory—no problem

// ---- 3. Delete them -------------------------------------------------
if (dupes.length) {
  const res = coll.deleteMany({ _id: { $in: dupes } });
  print(`Deleted ${res.deletedCount} duplicate documents.`);
} else {
  print("No duplicates found 🎉");
}

/**********************************************************************
 *  (Optional) Add the unique index so duplicates can’t appear again
 **********************************************************************/
coll.createIndex(
  { proposalId: 1, planId: 1, scenario: 1 },
  { unique: true, name: "proposal_plan_scenario_uq" }
);
