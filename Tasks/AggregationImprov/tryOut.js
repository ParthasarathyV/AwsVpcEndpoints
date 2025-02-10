[
  {
    "$project": {
      "_id": 0,
      "financials": {
        $map: {
          input: { $range: [1975, 2076] }, // Generate years dynamically
          as: "year",
          in: {
            year: "$$year",
            budgetTotalCost: {
              $ifNull: [`$financial.$$year.budgetTotalCost`, null]
            },
            totalCost: {
              $ifNull: [`$financial.$$year.totalCost`, null]
            },
            forecastTotalCost: {
              $ifNull: [`$financial.$$year.forecastTotalCost`, null]
            }
          }
        }
      }
    }
  },
  {
    "$project": {
      financials: {
        $arrayToObject: {
          $map: {
            input: "$financials",
            as: "item",
            in: {
              k: {
                $toString: "$$item.year"
              },
              v: {
                budgetTotalCost: {
                  $cond: [
                    { $eq: ["$$item.budgetTotalCost", null] },
                    null,
                    "$$item.budgetTotalCost"
                  ]
                },
                totalCost: {
                  $cond: [
                    { $eq: ["$$item.totalCost", null] },
                    null,
                    "$$item.totalCost"
                  ]
                },
                forecastTotalCost: {
                  $cond: [
                    { $eq: ["$$item.forecastTotalCost", null] },
                    null,
                    "$$item.forecastTotalCost"
                  ]
                }
              }
            }
          }
        }
      }
    }
  }
]
