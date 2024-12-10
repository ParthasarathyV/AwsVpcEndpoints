[
  {
    $group: {
      _id: { region: "$region", product: "$product" }, // groupCols loop
      salesData: {
        $push: {
          k: { $concat: ["$year", "_", "$quarter"] }, // Combine all PivotCols into key
          v: "$sales"                                // Value is the interger amount that we have to sum
        }
      }
    }
  },
  {
    $addFields: {
      dynamicFields: {
        $arrayToObject: {
          $map: {
            input: "$salesData",
            as: "item",
            in: { k: "$$item.k", v: { $sum: ["$$item.v"] } } // Create key-value pairs dynamically
          }
        }
      }
    }
  },
  {
    $project: {
      _id: 0,                
      region: "$_id.region", // Loop and include groupCols
      product: "$_id.product", 
      dynamicFields: 1        
    }
  },
  {
    $replaceRoot: {
      newRoot: {
        $mergeObjects: ["$dynamicFields", { region: "$region", product: "$product" }] // Loop and include groupCols
      }
    }
  },
  {
    $sort: { region: 1, product: 1 } // Sort by group colls if needed
  }
]
