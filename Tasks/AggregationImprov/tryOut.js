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






[
  {
    "$project": {
      "_id": 0,
      "financials": {
        "$mergeObjects": [
          {
            "2014": {
              "budgetTotalCost": { "$ifNull": ["$financial.2014.budgetTotalCost", null] },
              "totalCost": { "$ifNull": ["$financial.2014.totalCost", null] },
              "forecastTotalCost": { "$ifNull": ["$financial.2014.forecastTotalCost", null] }
            }
          },
          {
            "2015": {
              "budgetTotalCost": { "$ifNull": ["$financial.2015.budgetTotalCost", null] },
              "totalCost": { "$ifNull": ["$financial.2015.totalCost", null] },
              "forecastTotalCost": { "$ifNull": ["$financial.2015.forecastTotalCost", null] }
            }
          },
          {
            "2016": {
              "budgetTotalCost": { "$ifNull": ["$financial.2016.budgetTotalCost", null] },
              "totalCost": { "$ifNull": ["$financial.2016.totalCost", null] },
              "forecastTotalCost": { "$ifNull": ["$financial.2016.forecastTotalCost", null] }
            }
          },
          {
            "2017": {
              "budgetTotalCost": { "$ifNull": ["$financial.2017.budgetTotalCost", null] },
              "totalCost": { "$ifNull": ["$financial.2017.totalCost", null] },
              "forecastTotalCost": { "$ifNull": ["$financial.2017.forecastTotalCost", null] }
            }
          },
          {
            "2018": {
              "budgetTotalCost": { "$ifNull": ["$financial.2018.budgetTotalCost", null] },
              "totalCost": { "$ifNull": ["$financial.2018.totalCost", null] },
              "forecastTotalCost": { "$ifNull": ["$financial.2018.forecastTotalCost", null] }
            }
          },
          {
            "2019": {
              "budgetTotalCost": { "$ifNull": ["$financial.2019.budgetTotalCost", null] },
              "totalCost": { "$ifNull": ["$financial.2019.totalCost", null] },
              "forecastTotalCost": { "$ifNull": ["$financial.2019.forecastTotalCost", null] }
            }
          },
          {
            "2020": {
              "budgetTotalCost": { "$ifNull": ["$financial.2020.budgetTotalCost", null] },
              "totalCost": { "$ifNull": ["$financial.2020.totalCost", null] },
              "forecastTotalCost": { "$ifNull": ["$financial.2020.forecastTotalCost", null] }
            }
          },
          {
            "2021": {
              "budgetTotalCost": { "$ifNull": ["$financial.2021.budgetTotalCost", null] },
              "totalCost": { "$ifNull": ["$financial.2021.totalCost", null] },
              "forecastTotalCost": { "$ifNull": ["$financial.2021.forecastTotalCost", null] }
            }
          },
          {
            "2022": {
              "budgetTotalCost": { "$ifNull": ["$financial.2022.budgetTotalCost", null] },
              "totalCost": { "$ifNull": ["$financial.2022.totalCost", null] },
              "forecastTotalCost": { "$ifNull": ["$financial.2022.forecastTotalCost", null] }
            }
          },
          {
            "2023": {
              "budgetTotalCost": { "$ifNull": ["$financial.2023.budgetTotalCost", null] },
              "totalCost": { "$ifNull": ["$financial.2023.totalCost", null] },
              "forecastTotalCost": { "$ifNull": ["$financial.2023.forecastTotalCost", null] }
            }
          },
          {
            "2024": {
              "budgetTotalCost": { "$ifNull": ["$financial.2024.budgetTotalCost", null] },
              "totalCost": { "$ifNull": ["$financial.2024.totalCost", null] },
              "forecastTotalCost": { "$ifNull": ["$financial.2024.forecastTotalCost", null] }
            }
          },
          {
            "2025": {
              "budgetTotalCost": { "$ifNull": ["$financial.2025.budgetTotalCost", null] },
              "totalCost": { "$ifNull": ["$financial.2025.totalCost", null] },
              "forecastTotalCost": { "$ifNull": ["$financial.2025.forecastTotalCost", null] }
            }
          },
          {
            "2026": {
              "budgetTotalCost": { "$ifNull": ["$financial.2026.budgetTotalCost", null] },
              "totalCost": { "$ifNull": ["$financial.2026.totalCost", null] },
              "forecastTotalCost": { "$ifNull": ["$financial.2026.forecastTotalCost", null] }
            }
          },
          {
            "2027": {
              "budgetTotalCost": { "$ifNull": ["$financial.2027.budgetTotalCost", null] },
              "totalCost": { "$ifNull": ["$financial.2027.totalCost", null] },
              "forecastTotalCost": { "$ifNull": ["$financial.2027.forecastTotalCost", null] }
            }
          },
          {
            "2028": {
              "budgetTotalCost": { "$ifNull": ["$financial.2028.budgetTotalCost", null] },
              "totalCost": { "$ifNull": ["$financial.2028.totalCost", null] },
              "forecastTotalCost": { "$ifNull": ["$financial.2028.forecastTotalCost", null] }
            }
          },
          {
            "2029": {
              "budgetTotalCost": { "$ifNull": ["$financial.2029.budgetTotalCost", null] },
              "totalCost": { "$ifNull": ["$financial.2029.totalCost", null] },
              "forecastTotalCost": { "$ifNull": ["$financial.2029.forecastTotalCost", null] }
            }
          },
          {
            "2030": {
              "budgetTotalCost": { "$ifNull": ["$financial.2030.budgetTotalCost", null] },
              "totalCost": { "$ifNull": ["$financial.2030.totalCost", null] },
              "forecastTotalCost": { "$ifNull": ["$financial.2030.forecastTotalCost", null] }
            }
          },
          {
            "2031": {
              "budgetTotalCost": { "$ifNull": ["$financial.2031.budgetTotalCost", null] },
              "totalCost": { "$ifNull": ["$financial.2031.totalCost", null] },
              "forecastTotalCost": { "$ifNull": ["$financial.2031.forecastTotalCost", null] }
            }
          },
          {
            "2032": {
              "budgetTotalCost": { "$ifNull": ["$financial.2032.budgetTotalCost", null] },
              "totalCost": { "$ifNull": ["$financial.2032.totalCost", null] },
              "forecastTotalCost": { "$ifNull": ["$financial.2032.forecastTotalCost", null] }
            }
          },
          {
            "2033": {
              "budgetTotalCost": { "$ifNull": ["$financial.2033.budgetTotalCost", null] },
              "totalCost": { "$ifNull": ["$financial.2033.totalCost", null] },
              "forecastTotalCost": { "$ifNull": ["$financial.2033.forecastTotalCost", null] }
            }
          },
          {
            "2034": {
              "budgetTotalCost": { "$ifNull": ["$financial.2034.budgetTotalCost", null] },
              "totalCost": { "$ifNull": ["$financial.2034.totalCost", null] },
              "forecastTotalCost": { "$ifNull": ["$financial.2034.forecastTotalCost", null] }
            }
          }
        ]
      }
    }
  }
]

