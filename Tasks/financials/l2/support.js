{
  $addFields: {
    taxonomyAllocation: {
      $let: {
        vars: {
          match: {
            $arrayElemAt: [
              {
                $filter: {
                  input: "$taxonomyAllocations",
                  as: "t",
                  cond: { $eq: ["$$t.year", "$year"] }
                }
              },
              0
            ]
          },
          cost: "$fyCost"
        },
        in: {
          GT: {
            pctAllocations: {
              $map: {
                input: "$$match.GT.pctAllocations",
                as: "p",
                in: {
                  $mergeObjects: [
                    "$$p",
                    { fySplitCost: { $multiply: ["$$p.pct", "$$cost"] } }
                  ]
                }
              }
            }
          },
          LOB: {
            pctAllocations: {
              $map: {
                input: "$$match.LOB.pctAllocations",
                as: "p",
                in: {
                  $mergeObjects: [
                    "$$p",
                    { fySplitCost: { $multiply: ["$$p.pct", "$$cost"] } }
                  ]
                }
              }
            }
          },
          RTB: {
            pctAllocations: {
              $map: {
                input: "$$match.RTB.pctAllocations",
                as: "p",
                in: {
                  $mergeObjects: [
                    "$$p",
                    { fySplitCost: { $multiply: ["$$p.pct", "$$cost"] } }
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
