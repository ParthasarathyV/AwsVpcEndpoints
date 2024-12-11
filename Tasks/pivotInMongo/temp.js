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



[
  {
    "$addFields": {
      "dynamicFields1": {
        "$arrayToObject": {
          "$filter": {
            "input": {
              "$map": {
                "input": "$dp1",
                "as": "item",
                "in": {
                  "k": "$$item.k",
                  "v": {
                    "$reduce": {
                      "input": {
                        "$filter": {
                          "input": "$dp1",
                          "as": "filteredItem",
                          "cond": { "$ne": ["$$filteredItem.k", null] }
                        }
                      },
                      "initialValue": 0,
                      "in": { "$add": ["$$value", "$$this.v"] }
                    }
                  }
                }
              }
            },
            "as": "mappedItem",
            "cond": { "$ne": ["$$mappedItem.k", null] }
          }
        }
      }
    }
  }
]

