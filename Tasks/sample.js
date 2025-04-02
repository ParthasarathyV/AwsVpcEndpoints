[
  {
    $group: {
      _id: null,
      totalCost: { $sum: "$totalCost" },
      forecastTotalCost: { $sum: "$forecastTotalCost" },
      budgetTotalCost: { $sum: "$budgetTotalCost" },
      totalCostNextYear: { $sum: "$totalCostNextYear" },
      forecastTotalCostNextYear: { $sum: "$forecastTotalCostNextYear" },
      budgetTotalCostNextYear: { $sum: "$budgetTotalCostNextYear" },
      totalRows: { $sum: "$count" },
      typeCounts: {
        $push: { k: "$_id", v: "$count" }
      }
    }
  },
  {
    $project: {
      _id: 0,
      financials: {
        totalCost: "$totalCost",
        forecastTotalCost: "$forecastTotalCost",
        budgetTotalCost: "$budgetTotalCost",
        totalCostNextYear: "$totalCostNextYear",
        forecastTotalCostNextYear: "$forecastTotalCostNextYear",
        budgetTotalCostNextYear: "$budgetTotalCostNextYear"
      },
      metadata: {
        totalRows: "$totalRows",
        typeCounts: { $arrayToObject: "$typeCounts" }
      }
    }
  }
]



// Only needed in mongosh if UUID isn't already available
const { UUID } = require('bson');

// Get reference to collection
const collection = db.getCollection("financialLevel3");

// Find all documents with scenario = "budget"
const cursor = collection.find({ scenario: "budget" });

let updatedCount = 0;

while (cursor.hasNext()) {
  const doc = cursor.next();

  // Generate new UUID
  const newUUID = UUID();

  // Update document with new planId
  const result = collection.updateOne(
    { _id: doc._id },
    { $set: { planId: newUUID } }
  );

  if (result.modifiedCount === 1) {
    updatedCount++;
  }
}

print(`✅ Updated ${updatedCount} documents in financialLevel3 with new planId UUIDs.`);



// Simple UUID v4 generator (RFC4122 compliant)
function generateUUIDv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Reference to your collection
const collection = db.getCollection("financialLevel3");

// Find matching documents
const cursor = collection.find({ scenario: "budget" });

let updatedCount = 0;

while (cursor.hasNext()) {
  const doc = cursor.next();

  const newUUID = generateUUIDv4();

  const result = collection.updateOne(
    { _id: doc._id },
    { $set: { planId: newUUID } }
  );

  if (result.modifiedCount === 1) {
    updatedCount++;
  }
}

print(`✅ Updated ${updatedCount} documents in financialLevel3 with new planId UUIDs.`);

function generateUUIDv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const collection = db.getCollection("financialLevel3");
const cursor = collection.find({ scenario: "budget" });

const bulkOps = [];

while (cursor.hasNext()) {
  const doc = cursor.next();
  const uuid = generateUUIDv4();

  bulkOps.push({
    updateOne: {
      filter: { _id: doc._id },
      update: { $set: { planId: uuid } }
    }
  });

  // To avoid memory overload, flush in batches of 1000
  if (bulkOps.length === 1000) {
    collection.bulkWrite(bulkOps, { ordered: false });
    bulkOps.length = 0; // reset
  }
}

// Flush any remaining operations
if (bulkOps.length > 0) {
  collection.bulkWrite(bulkOps, { ordered: false });
}

print("🚀 Fire-and-forget-style updates sent using bulkWrite.");

function generateUUIDv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const collection = db.getCollection("financialLevel3");
const cursor = collection.find({ scenario: "budget" });

const bulkOps = [];
let totalMatched = 0;
let totalUpdated = 0;
let batchNumber = 1;
const batchSize = 1000;

while (cursor.hasNext()) {
  const doc = cursor.next();
  const uuid = generateUUIDv4();

  bulkOps.push({
    updateOne: {
      filter: { _id: doc._id },
      update: { $set: { planId: uuid } }
    }
  });

  totalMatched++;

  if (bulkOps.length === batchSize) {
    const result = collection.bulkWrite(bulkOps, { ordered: false });
    totalUpdated += result.modifiedCount;

    print(`Batch ${batchNumber++}: Updated ${result.modifiedCount} of ${bulkOps.length}`);
    print(`Total updated: ${totalUpdated} | Pending: ${totalMatched - totalUpdated}`);

    bulkOps.length = 0;
  }
}

if (bulkOps.length > 0) {
  const result = collection.bulkWrite(bulkOps, { ordered: false });
  totalUpdated += result.modifiedCount;

  print(`Final Batch ${batchNumber}: Updated ${result.modifiedCount} of ${bulkOps.length}`);
  print(`Total updated: ${totalUpdated} | Pending: ${totalMatched - totalUpdated}`);
}

print(`Update complete. ${totalUpdated} of ${totalMatched} documents updated.`);

db.appMappings.aggregate([
  {
    $addFields: {
      "appMappings.yearlyValue": {
        $let: {
          vars: {
            allApps: {
              $reduce: {
                input: "$appMappings.monthValues",
                initialValue: [],
                in: {
                  $concatArrays: ["$$value", "$$this.application"]
                }
              }
            }
          },
          in: {
            $reduce: {
              input: "$$allApps",
              initialValue: [],
              in: {
                $let: {
                  vars: {
                    existing: {
                      $filter: {
                        input: "$$value",
                        cond: { $eq: ["$$this.app_id", "$$this.app_id"] }
                      }
                    }
                  },
                  in: {
                    $cond: [
                      {
                        $gt: [{ $size: {
                          $filter: {
                            input: "$$value",
                            cond: { $eq: ["$$this.app_id", "$$this.app_id"] }
                          }
                        } }, 0]
                      },
                      {
                        $map: {
                          input: "$$value",
                          as: "app",
                          in: {
                            $cond: [
                              { $eq: ["$$app.app_id", "$$this.app_id"] },
                              {
                                app_id: "$$app.app_id",
                                cap_cost: { $add: ["$$app.cap_cost", "$$this.cap_cost"] },
                                app_cost: { $add: ["$$app.app_cost", "$$this.app_cost"] }
                              },
                              "$$app"
                            ]
                          }
                        }
                      },
                      {
                        $concatArrays: ["$$value", [
                          {
                            app_id: "$$this.app_id",
                            cap_cost: "$$this.cap_cost",
                            app_cost: "$$this.app_cost"
                          }
                        ]]
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      }
    }
  }
])
