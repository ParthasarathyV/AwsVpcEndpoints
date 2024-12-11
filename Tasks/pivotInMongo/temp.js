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



{
  "rows": [
    { "country": "USA", "2000_gold": 20, "2000_silver": 10, "2004_gold": 25, "2004_silver": 15 },
    { "country": "Canada", "2000_gold": 15, "2000_silver": 20, "2004_gold": 10, "2004_silver": 25 }
  ],
  "pivotFields": ["2000_gold", "2000_silver", "2004_gold", "2004_silver"]
}


