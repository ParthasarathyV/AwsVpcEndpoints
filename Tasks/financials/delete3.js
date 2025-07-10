/**********************************************************************
 *  REMOVE exact-same-verId duplicates in lvl4
 *  MongoDB 5.0+ (uses $setWindowFields + $rank)
 **********************************************************************/
const coll = db.lvl4;

// 1. Collect the _ids we want to drop
const badIds = coll.aggregate([
  {
    $setWindowFields: {
      partitionBy: {
        proposalId: "$proposalId",
        planId:     "$planId",
        scenario:   "$scenario",
        verId:      "$verId"      // ← verId included here
      },
      sortBy: { _id: -1 },        // newest first, ONE field only
      output: { r: { $rank: {} } }
    }
  },
  { $match: { r: { $gt: 1 } } }, // ranks 2-N are dups
  { $project: { _id: 1 } }
]).toArray().map(d => d._id);     // your worst-case ≤ 500 → fine in RAM

// 2. Nuke them
if (badIds.length) {
  const res = coll.deleteMany({ _id: { $in: badIds } });
  print(`🗑️   Deleted ${res.deletedCount} same-verId duplicates.`);
} else {
  print("No same-verId duplicates found 🎉");
}
