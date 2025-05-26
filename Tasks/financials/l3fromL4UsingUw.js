[
  // Stage 1: Unwind costs array
  { $unwind: "$costs" },

  // Stage 2: Flatten + round per cost
  {
    $addFields: {
      cost: {
        year: "$costs.year",
        snode: "$costs.snode",
        type: "$costs.type",
        subType: "$costs.subType",
        title: "$costs.title",
        locVen: "$costs.locVen",
        source: "$costs.source",
        fycost: { $round: ["$costs.fycost", 6] },
        fyHC: { $round: ["$costs.fyHC", 6] },
        mthCost: {
          $map: {
            input: "$costs.mthCost",
            as: "v",
            in: { $round: [{ $ifNull: ["$$v", 0] }, 6] }
          }
        },
        mthHC: {
          $map: {
            input: "$costs.mthHC",
            as: "v",
            in: { $round: [{ $ifNull: ["$$v", 0] }, 6] }
          }
        }
      }
    }
  },

  // Stage 3: Lookup bu per snode
  {
    $lookup: {
      from: "TestRefBU",
      localField: "cost.snode",
      foreignField: "snode",
      as: "buData"
    }
  },

  // Stage 4: Merge bu
  {
    $addFields: {
      "cost.bu": {
        $ifNull: [{ $arrayElemAt: ["$buData.bu", 0] }, null]
      }
    }
  },

  // Stage 5: Group back by ipLongId, planId, scenario, year
  {
    $group: {
      _id: {
        ipLongId: "$ipLongId",
        planId: "$planId",
        scenario: "$scenario",
        year: "$cost.year"
      },
      costs: { $push: "$cost" },
      totalCost: { $sum: "$cost.fycost" },
      mthCostArrays: { $push: "$cost.mthCost" },
      mthHCArrays: { $push: "$cost.mthHC" }
    }
  },

  // Stage 6: Compute reduced mthCost & mthHC
  {
    $addFields: {
      mthCost: {
        $reduce: {
          input: "$mthCostArrays",
          initialValue: [0,0,0,0,0,0,0,0,0,0,0,0],
          in: {
            $map: {
              input: { $range: [0, 12] },
              as: "i",
              in: {
                $round: [
                  {
                    $add: [
                      { $ifNull: [{ $arrayElemAt: ["$$value", "$$i"] }, 0] },
                      { $ifNull: [{ $arrayElemAt: ["$$this", "$$i"] }, 0] }
                    ]
                  },
                  6
                ]
              }
            }
          }
        }
      },
      mthHC: {
        $reduce: {
          input: "$mthHCArrays",
          initialValue: [0,0,0,0,0,0,0,0,0,0,0,0],
          in: {
            $map: {
              input: { $range: [0, 12] },
              as: "i",
              in: {
                $round: [
                  {
                    $add: [
                      { $ifNull: [{ $arrayElemAt: ["$$value", "$$i"] }, 0] },
                      { $ifNull: [{ $arrayElemAt: ["$$this", "$$i"] }, 0] }
                    ]
                  },
                  6
                ]
              }
            }
          }
        }
      }
    }
  },

  // Stage 7: Final cleanup
  {
    $project: {
      _id: 0,
      ipLongId: "$_id.ipLongId",
      planId: "$_id.planId",
      scenario: "$_id.scenario",
      year: "$_id.year",
      costs: 1,
      totalCost: 1,
      mthCost: 1,
      mthHC: 1
    }
  }
]
