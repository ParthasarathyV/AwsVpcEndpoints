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
          "$reduce": {
            "input": { "$objectToArray": "$mergedFinancials" },
            "initialValue": [],
            "in": {
              "$concatArrays": [
                "$$value",
                [
                  { "k": { "$concat": ["totalCost", "$$this.k"] }, "v": "$$this.v.totalCost" },
                  { "k": { "$concat": ["budgetTotalCost", "$$this.k"] }, "v": "$$this.v.budgetTotalCost" },
                  { "k": { "$concat": ["forecastTotalCost", "$$this.k"] }, "v": "$$this.v.forecastTotalCost" }
                ]
              ]
            }
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
