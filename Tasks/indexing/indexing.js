[
  {
    "$match": {
      "title": {
        "$regex": "CC",
        "$options": "i"
      }
    }
  },
  {
    "$group": {
      "_id": null,
      "totalCost": { "$sum": "$totalCost" },
      "forecastTotalCost": { "$sum": "$forecastTotalCost" },
      "budgetTotalCost": { "$sum": "$budgetTotalCost" },
      "totalCostNextYear": { "$sum": "$totalCostNextYear" },
      "forecastTotalCostNextYear": { "$sum": "$forecastTotalCostNextYear" },
      "budgetTotalCostNextYear": { "$sum": "$budgetTotalCostNextYear" },
      "totalRowCount": { "$sum": 1 },
      "typeCounts": { 
        "$push": "$type" 
      }
    }
  },
  {
    "$project": {
      "financials": {
        "totalCost": { "$round": ["$totalCost", 0] },
        "forecastTotalCost": { "$round": ["$forecastTotalCost", 0] },
        "budgetTotalCost": { "$round": ["$budgetTotalCost", 0] },
        "totalCostNextYear": { "$round": ["$totalCostNextYear", 0] },
        "forecastTotalCostNextYear": { "$round": ["$forecastTotalCostNextYear", 0] },
        "budgetTotalCostNextYear": { "$round": ["$budgetTotalCostNextYear", 0] }
      },
      "metadata": {
        "totalRows": "$totalRowCount",
        "typeCounts": {
          "$arrayToObject": {
            "$map": {
              "input": { "$setUnion": [ [] , "$typeCounts" ] },
              "as": "type",
              "in": { "k": "$$type", "v": { "$sum": 1 } }
            }
          }
        }
      }
    }
  }
]
