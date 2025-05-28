const session = db.getMongo().startSession();
session.startTransaction();

try {
  const dbName = "financials";
  const l4Coll = session.getDatabase(dbName).getCollection("L4CostDetails");
  const l3Coll = session.getDatabase(dbName).getCollection("L3CostDetails");

  print("Starting aggregation on L4CostDetails...");

  const aggResults = l4Coll.aggregate([
    { $unwind: "$costs" },
    {
      $group: {
        _id: {
          ipLongId: "$ipLongId",
          planId: "$planId",
          scenario: "$scenario",
          year: "$costs.year"
        },
        totalCost: { $sum: "$costs.amount" },
        mthHC: { $push: "$costs.monthHC" },
        mthCost: { $push: "$costs.monthCost" }
      }
    },
    {
      $project: {
        _id: 0,
        ipLongId: "$_id.ipLongId",
        planId: "$_id.planId",
        scenario: "$_id.scenario",
        year: "$_id.year",
        totalCost: 1,
        mthHC: 1,
        mthCost: 1
      }
    }
  ], { session });

  print("Aggregation complete. Building bulk upsert operations...");

  const bulkOps = [];
  let count = 0;

  while (aggResults.hasNext()) {
    const doc = aggResults.next();
    count++;

    print("Preparing upsert for ipLongId=" + doc.ipLongId + ", planId=" + doc.planId + ", year=" + doc.year);

    bulkOps.push({
      updateOne: {
        filter: {
          ipLongId: doc.ipLongId,
          planId: doc.planId,
          scenario: doc.scenario,
          year: doc.year
        },
        update: {
          $set: {
            ipLongId: doc.ipLongId,
            planId: doc.planId,
            scenario: doc.scenario,
            year: doc.year,
            totalCost: doc.totalCost,
            mthHC: doc.mthHC,
            mthCost: doc.mthCost
          }
        },
        upsert: true
      }
    });
  }

  if (bulkOps.length > 0) {
    print("Executing bulkWrite with " + count + " operations...");
    const result = l3Coll.bulkWrite(bulkOps, { session });
    print("Bulk write result:");
    printjson(result);
  } else {
    print("No documents to upsert.");
  }

  session.commitTransaction();
  print("Transaction committed successfully.");
} catch (e) {
  print("Error occurred. Aborting transaction.");
  printjson(e);
  session.abortTransaction();
}
