{
    "$addFields": {
      "dynamicFields": {
        "$arrayToObject": {
          "$filter": {
            "input": {
              "$map": {
                "input": "$salesData",
                "as": "item",
                "in": {
                  "k": "$$item.k",
                  "v": { "$sum": ["$$item.v"] }
                }
              }
            },
            "as": "mappedItem",
            "cond": { "$ne": ["$$mappedItem.k", null] } // Skip items where k is null
          }
        }
      }
    }
  }
