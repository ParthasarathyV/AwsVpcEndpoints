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
