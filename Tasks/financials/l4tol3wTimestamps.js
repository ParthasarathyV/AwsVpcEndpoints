const fs = require('fs');

const dbName = "financials";
const payload = JSON.parse(fs.readFileSync("/path/to/payloadL4.json", 'utf8'));
const s3Timestamp = new Date(); // Time when script started
const txnStart = Date.now();

db.getMongo().startSession().withTransaction(() => {
  const l4Coll = db.getSiblingDB(dbName).getCollection("testl4mcoutlook");
  const l3Coll = db.getSiblingDB(dbName).getCollection("testl3mcoutlook");
  const auditColl = db.getSiblingDB(dbName).getCollection("auditCollection");

  const atlasTimestamp = {};

  // 1. L4 Upsert
  const t1 = Date.now();
  print("[1] Upserting into L4 at", new Date(t1));
  l4Coll.replaceOne(
    { ipLongId: payload.ipLongId, planId: payload.planId, year: payload.year },
    payload,
    { upsert: true }
  );
  atlasTimestamp.l4 = new Date();
  const t1_end = Date.now();
  print("[1] L4 Upsert Done in", ((t1_end - t1) / 1000).toFixed(3), "seconds");

  // 2. Aggregation on L4
  const t2 = Date.now();
  print("[2] Aggregation started at", new Date(t2));
  const aggResults = l4Coll.aggregate([
    { $match: { ipLongId: payload.ipLongId, planId: payload.planId, year: payload.year } },
    {
      $group: {
        _id: {
          ipLongId: "$ipLongId",
          planId: "$planId",
          year: "$year"
        },
        fyCost: { $sum: "$costs.fyCost" },
        monthCost: { $push: "$costs.monthCost" },
        monthHC: { $push: "$costs.monthHC" }
      }
    },
    {
      $project: {
        ipLongId: "$_id.ipLongId",
        planId: "$_id.planId",
        year: "$_id.year",
        fyCost: 1,
        monthCost: {
          $reduce: {
            input: "$monthCost",
            initialValue: Array(12).fill(0),
            in: {
              $map: {
                input: { $range: [0, 12] },
                as: "i",
                in: {
                  $add: [
                    { $arrayElemAt: ["$$value", "$$i"] },
                    { $arrayElemAt: ["$$this", "$$i"] }
                  ]
                }
              }
            }
          }
        },
        monthHC: {
          $reduce: {
            input: "$monthHC",
            initialValue: Array(12).fill(0),
            in: {
              $map: {
                input: { $range: [0, 12] },
                as: "i",
                in: {
                  $add: [
                    { $arrayElemAt: ["$$value", "$$i"] },
                    { $arrayElemAt: ["$$this", "$$i"] }
                  ]
                }
              }
            }
          }
        }
      }
    }
  ]).toArray();
  const t2_end = Date.now();
  print("[2] Aggregation Completed in", ((t2_end - t2) / 1000).toFixed(3), "seconds");

  // 3. Bulk Write to L3
  const t3 = Date.now();
  print("[3] BulkWrite started at", new Date(t3));
  const bulkOps = aggResults.map(doc => ({
    updateOne: {
      filter: {
        ipLongId: doc.ipLongId,
        planId: doc.planId,
        year: doc.year
      },
      update: {
        $set: {
          ipLongId: doc.ipLongId,
          planId: doc.planId,
          year: doc.year,
          fyCost: doc.fyCost,
          monthCost: doc.monthCost,
          monthHC: doc.monthHC
        }
      },
      upsert: true
    }
  }));

  if (bulkOps.length > 0) {
    l3Coll.bulkWrite(bulkOps, { ordered: false });
    atlasTimestamp.l3 = new Date();
  } else {
    print("No documents to upsert into L3.");
    atlasTimestamp.l3 = new Date(); // still track timestamp
  }

  const t3_end = Date.now();
  print("[3] BulkWrite Done in", ((t3_end - t3) / 1000).toFixed(3), "seconds");

  // 4. Audit Write
  const t4 = Date.now();
  print("[4] Writing to auditCollection at", new Date(t4));
  auditColl.insertOne({
    messageType: "L4",
    collection: "l4Coll",
    ipLongId: payload.ipLongId,
    scenario: payload.scenario,
    versionId: payload.versionId,
    sourceLastUpdateTime: payload.lastUpdatedTime,
    s3Timestamp: s3Timestamp,
    atlasTimestamp: atlasTimestamp
  });
  const t4_end = Date.now();
  print("[4] Audit Write Done in", ((t4_end - t4) / 1000).toFixed(3), "seconds");

  const txnEnd = Date.now();
  print("Total Transaction Time:", ((txnEnd - txnStart) / 1000).toFixed(3), "seconds");
});
