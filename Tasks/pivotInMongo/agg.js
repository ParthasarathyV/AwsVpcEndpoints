// User-selected inputs
const groupFields = ["Title", "RAG"]; // Dynamic group fields
const pivotKeyFields = ["Year", "Execution State"]; // Dynamic pivot key fields
const pivotValueFieldsAndFunctions = { 
  "Cost": "$sum", // Integer operation
  "Execution State": "$concat" // String operation
};

db.projects.aggregate([
  {
    // Group by dynamic fields
    $group: {
      _id: groupFields.reduce((acc, field) => {
        acc[field] = `$${field}`;
        return acc;
      }, {}),
      pivotData: {
        $push: {
          key: {
            $concat: pivotKeyFields.map(field => `$${field}`).concat(["-"]) // Composite pivot key
          },
          Cost: { $sum: "$Cost" }, // Integer aggregation (Sum)
          ExecutionStates: { $push: "$Execution State" } // String operation
        }
      }
    }
  },
  {
    // Project the pivoted data
    $project: {
      _id: 0,
      groupFields: "$_id",
      pivoted: {
        $arrayToObject: {
          $map: {
            input: "$pivotData",
            as: "entry",
            in: {
              k: "$$entry.key", // Composite pivot key
              v: {
                Cost: "$$entry.Cost",
                ExecutionStates: { 
                  $reduce: {
                    input: "$$entry.ExecutionStates", 
                    initialValue: "",
                    in: {
                      $cond: [
                        { $eq: ["$$value", ""] }, 
                        "$$this", 
                        { $concat: ["$$value", ", ", "$$this"] }
                      ]
                    }
                  }
                } // Concatenate Execution States
              }
            }
          }
        }
      }
    }
  }
]);
