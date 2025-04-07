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





[
  {
    $facet: {
      outlook2020AllocCost: [
        { $unwind: { path: "$detailedFinancials.outlook2020.billingKeyHeader.allocations", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: null,
            allocCostSum: { $sum: "$detailedFinancials.outlook2020.billingKeyHeader.allocations.allocCost" }
          }
        },
        { $project: { _id: 0, outlook2020AllocCost: "$allocCostSum" } }
      ],
      outlook2021AllocCost: [
        { $unwind: { path: "$detailedFinancials.outlook2021.billingKeyHeader.allocations", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: null,
            allocCostSum: { $sum: "$detailedFinancials.outlook2021.billingKeyHeader.allocations.allocCost" }
          }
        },
        { $project: { _id: 0, outlook2021AllocCost: "$allocCostSum" } }
      ],
      outlook2022AllocCost: [
        { $unwind: { path: "$detailedFinancials.outlook2022.billingKeyHeader.allocations", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: null,
            allocCostSum: { $sum: "$detailedFinancials.outlook2022.billingKeyHeader.allocations.allocCost" }
          }
        },
        { $project: { _id: 0, outlook2022AllocCost: "$allocCostSum" } }
      ],
      outlook2023AllocCost: [
        { $unwind: { path: "$detailedFinancials.outlook2023.billingKeyHeader.allocations", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: null,
            allocCostSum: { $sum: "$detailedFinancials.outlook2023.billingKeyHeader.allocations.allocCost" }
          }
        },
        { $project: { _id: 0, outlook2023AllocCost: "$allocCostSum" } }
      ],
      outlook2024AllocCost: [
        { $unwind: { path: "$detailedFinancials.outlook2024.billingKeyHeader.allocations", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: null,
            allocCostSum: { $sum: "$detailedFinancials.outlook2024.billingKeyHeader.allocations.allocCost" }
          }
        },
        { $project: { _id: 0, outlook2024AllocCost: "$allocCostSum" } }
      ],
      outlook2025AllocCost: [
        { $unwind: { path: "$detailedFinancials.outlook2025.billingKeyHeader.allocations", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: null,
            allocCostSum: { $sum: "$detailedFinancials.outlook2025.billingKeyHeader.allocations.allocCost" }
          }
        },
        { $project: { _id: 0, outlook2025AllocCost: "$allocCostSum" } }
      ],
      outlook2026AllocCost: [
        { $unwind: { path: "$detailedFinancials.outlook2026.billingKeyHeader.allocations", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: null,
            allocCostSum: { $sum: "$detailedFinancials.outlook2026.billingKeyHeader.allocations.allocCost" }
          }
        },
        { $project: { _id: 0, outlook2026AllocCost: "$allocCostSum" } }
      ],
      outlook2027AllocCost: [
        { $unwind: { path: "$detailedFinancials.outlook2027.billingKeyHeader.allocations", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: null,
            allocCostSum: { $sum: "$detailedFinancials.outlook2027.billingKeyHeader.allocations.allocCost" }
          }
        },
        { $project: { _id: 0, outlook2027AllocCost: "$allocCostSum" } }
      ],
      outlook2028AllocCost: [
        { $unwind: { path: "$detailedFinancials.outlook2028.billingKeyHeader.allocations", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: null,
            allocCostSum: { $sum: "$detailedFinancials.outlook2028.billingKeyHeader.allocations.allocCost" }
          }
        },
        { $project: { _id: 0, outlook2028AllocCost: "$allocCostSum" } }
      ],
      outlook2029AllocCost: [
        { $unwind: { path: "$detailedFinancials.outlook2029.billingKeyHeader.allocations", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: null,
            allocCostSum: { $sum: "$detailedFinancials.outlook2029.billingKeyHeader.allocations.allocCost" }
          }
        },
        { $project: { _id: 0, outlook2029AllocCost: "$allocCostSum" } }
      ],
      outlook2030AllocCost: [
        { $unwind: { path: "$detailedFinancials.outlook2030.billingKeyHeader.allocations", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: null,
            allocCostSum: { $sum: "$detailedFinancials.outlook2030.billingKeyHeader.allocations.allocCost" }
          }
        },
        { $project: { _id: 0, outlook2030AllocCost: "$allocCostSum" } }
      ]
    }
  },
  {
    $project: {
      outlook2020AllocCost: { $arrayElemAt: ["$outlook2020AllocCost.outlook2020AllocCost", 0] },
      outlook2021AllocCost: { $arrayElemAt: ["$outlook2021AllocCost.outlook2021AllocCost", 0] },
      outlook2022AllocCost: { $arrayElemAt: ["$outlook2022AllocCost.outlook2022AllocCost", 0] },
      outlook2023AllocCost: { $arrayElemAt: ["$outlook2023AllocCost.outlook2023AllocCost", 0] },
      outlook2024AllocCost: { $arrayElemAt: ["$outlook2024AllocCost.outlook2024AllocCost", 0] },
      outlook2025AllocCost: { $arrayElemAt: ["$outlook2025AllocCost.outlook2025AllocCost", 0] },
      outlook2026AllocCost: { $arrayElemAt: ["$outlook2026AllocCost.outlook2026AllocCost", 0] },
      outlook2027AllocCost: { $arrayElemAt: ["$outlook2027AllocCost.outlook2027AllocCost", 0] },
      outlook2028AllocCost: { $arrayElemAt: ["$outlook2028AllocCost.outlook2028AllocCost", 0] },
      outlook2029AllocCost: { $arrayElemAt: ["$outlook2029AllocCost.outlook2029AllocCost", 0] },
      outlook2030AllocCost: { $arrayElemAt: ["$outlook2030AllocCost.outlook2030AllocCost", 0] }
    }
  }
]
