[
  {
    "$group": {
      "_id": "$type",
      "financials": {
        "$push": "$financials"
      }
    }
  },
  {
    "$project": {
      "_id": 1,
      "mergedFinancials": {
        "$reduce": {
          "input": "$financials",
          "initialValue": {},
          "in": {
            "$mergeObjects": ["$$value", "$$this"]
          }
        }
      }
    }
  },
  {
    "$project": {
      "_id": 1,
      "type": "$_id",
      "outputFields": {
        "$arrayToObject": {
          "$map": {
            "input": { "$objectToArray": "$mergedFinancials" },
            "as": "yearData",
            "in": [
              { "k": { "$concat": ["totalCost", "$$yearData.k"] }, "v": "$$yearData.v.totalCost" },
              { "k": { "$concat": ["budgetTotalCost", "$$yearData.k"] }, "v": "$$yearData.v.budgetTotalCost" },
              { "k": { "$concat": ["forecastTotalCost", "$$yearData.k"] }, "v": "$$yearData.v.forecastTotalCost" }
            ]
          }
        }
      }
    }
  },
  {
    "$project": {
      "_id": 0,
      "type": 1,
      "outputFields": 1
    }
  }
]
