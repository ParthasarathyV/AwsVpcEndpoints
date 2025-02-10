[
  {
    "$group": {
      "_id": "$type",
      "mergedFinancials": { "$push": "$financials" }
    }
  },
  {
    "$project": {
      "_id": 1,
      "type": "$_id",
      "financials": { "$reduce": {
        "input": "$mergedFinancials",
        "initialValue": [],
        "in": { "$concatArrays": ["$$value", "$$this"] }
      }}
    }
  },
  {
    "$unwind": "$financials"
  },
  {
    "$group": {
      "_id": {
        "type": "$type",
        "year": "$financials.year",
        "scenario": "$financials.scenario"
      },
      "totalAmount": { "$sum": "$financials.amount" }
    }
  },
  {
    "$group": {
      "_id": "$_id.type",
      "outputFields": {
        "$push": {
          "k": { "$concat": ["$_id.scenario", "$_id.year"] },
          "v": "$totalAmount"
        }
      }
    }
  },
  {
    "$project": {
      "_id": 0,
      "type": "$_id",
      "outputFields": { "$arrayToObject": "$outputFields" }
    }
  }
]
