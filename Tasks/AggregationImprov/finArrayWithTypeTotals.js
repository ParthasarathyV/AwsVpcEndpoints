[
  {
    "$group": {
      "_id": "$type",
      "mergedFinancials": { "$push": "$financials" },
      "count": { "$sum": 1 }
    }
  },
  {
    "$project": {
      "_id": 1,
      "type": "$_id",
      "count": 1,
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
      "financials": {
        "$push": {
          "k": { "$concat": ["$_id.year", "$_id.scenario"] },
          "v": "$totalAmount"
        }
      },
      "typeCount": {
        "$sum": 1
      }
    }
  },
  {
    "$group": {
      "_id": null,
      "financials": { "$push": { "k": "$_id", "v": { "$arrayToObject": "$financials" } } },
      "metadata": {
        "$push": { "k": "$_id", "v": "$typeCount" }
      },
      "totalCount": { "$sum": "$typeCount" }
    }
  },
  {
    "$project": {
      "_id": 0,
      "financials": { "$arrayToObject": "$financials" },
      "metadata": {
        "totalCount": "$totalCount",
        "typeCount": { "$arrayToObject": "$metadata" }
      }
    }
  }
]
