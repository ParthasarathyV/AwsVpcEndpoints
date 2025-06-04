{
  $addFields: {
    taxonomyAllocation: {
      $let: {
        vars: {
          alloc: "$taxonomyAllocation",
          yearVal: "$year",
          cost: "$fyCost"
        },
        in: {
          GT: {
            pctAllocations: {
              $map: {
                input: {
                  $filter: {
                    input: "$$alloc.GT.pctAllocations",
                    as: "a",
                    cond: { $eq: ["$$a.year", "$$yearVal"] }
                  }
                },
                as: "a",
                in: {
                  $mergeObjects: [
                    "$$a",
                    {
                      fySplitCost: { $multiply: ["$$a.pct", "$$cost"] }
                    }
                  ]
                }
              }
            }
          },
          LOB: {
            pctAllocations: {
              $map: {
                input: {
                  $filter: {
                    input: "$$alloc.LOB.pctAllocations",
                    as: "a",
                    cond: { $eq: ["$$a.year", "$$yearVal"] }
                  }
                },
                as: "a",
                in: {
                  $mergeObjects: [
                    "$$a",
                    {
                      fySplitCost: { $multiply: ["$$a.pct", "$$cost"] }
                    }
                  ]
                }
              }
            }
          },
          RTB: {
            pctAllocations: {
              $map: {
                input: {
                  $filter: {
                    input: "$$alloc.RTB.pctAllocations",
                    as: "a",
                    cond: { $eq: ["$$a.year", "$$yearVal"] }
                  }
                },
                as: "a",
                in: {
                  $mergeObjects: [
                    "$$a",
                    {
                      fySplitCost: { $multiply: ["$$a.pct", "$$cost"] }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    }
  }
}
