/**********************************************************************
 *  lvl4 PURGE (multi-DB, multi-collection) – plain-text logging
 *  MongoDB 5.0+   ($setWindowFields + $rank)
 *
 *  HOW TO RUN
 *    1)  Edit `dbCollectionsMap` to list every DB / collection you want
 *        to clean.
 *    2)  Start mongosh, connect to your cluster, then:
 *           load("cleanup_lvl4.js")
 **********************************************************************/

/* ------------------------------------------------------------------ *
 *  Edit this to suit your environment                                 *
 * ------------------------------------------------------------------ */
const dbCollectionsMap = {
  financials: [
    "lvl4CostDetailsOutlook",
    "lvl3CostDetailsOutlook",
    "lvl1FinancialsSummary",
    "lvl2FinancialsSummary"
  ]
  // anotherDb: ["collectionA", "collectionB"]
};

/* ------------------ helper: outdated verIds ----------------------- */
function findOutdatedVerIds(coll) {
  return coll.aggregate([
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
}

/* -------------- helper: same-verId duplicates --------------------- */
function findSameVerIdDuplicates(coll) {
  return coll.aggregate([
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
}

/* --------------------------- main loop ---------------------------- */
for (const [dbName, collections] of Object.entries(dbCollectionsMap)) {

  const targetDb = db.getSiblingDB(dbName);
  print("\n================================================================");
  print("Database: " + dbName);

  for (const collName of collections) {

    print("----------------------------------------------------------------");
    print("Collection: " + collName);

    if (!targetDb.getCollectionNames().includes(collName)) {
      print("  Collection not found – skipped.");
      continue;
    }

    const coll = targetDb.getCollection(collName);
    const startCount = coll.estimatedDocumentCount();
    print("  Starting documents: " + startCount);

    /* Pass 1 – outdated verIds */
    print("  Pass 1 (outdated verIds) …");
    const ids1 = findOutdatedVerIds(coll);
    print("    Identified: " + ids1.length);

    /* Pass 2 – same-verId duplicates */
    print("  Pass 2 (same verId duplicates) …");
    const ids2 = findSameVerIdDuplicates(coll);
    print("    Identified: " + ids2.length);

    /* Merge + delete once */
    const idsToDelete = [...new Set([...ids1, ...ids2])];
    print("  Total unique docs to delete: " + idsToDelete.length);

    if (idsToDelete.length) {
      const res = coll.deleteMany({ _id: { $in: idsToDelete } });
      print("  deleteMany removed: " + res.deletedCount);
    } else {
      print("  Nothing to delete – collection already clean.");
    }

    const endCount = coll.estimatedDocumentCount();
    print("  Documents after cleanup: " + endCount +
          "   (net change: " + (startCount - endCount) + ")");

    /* Optional: enforce uniqueness going forward */
    try {
      coll.createIndex(
        { proposalId: 1, planId: 1, scenario: 1 },
        { unique: true, name: "uq_proposal_plan_scenario" }
      );
      print("  Unique index verified / created.");
    } catch (e) {
      print("  Index creation error: " + e.message);
    }
  }
}

print("\nAll databases and collections processed.");
