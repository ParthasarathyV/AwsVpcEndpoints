db.l4CostDetails.aggregate([

  // Stage 1: Trim costs array down to required fields
  {
    $project: {
      ipLongId: 1,
      planId: 1,
      scenario: 1,
      costs: {
        $map: {
          input: "$costs",
          as: "c",
          in: {
            year: "$$c.year",
            snode: "$$c.snode",
            type: "$$c.type",
            subType: "$$c.subType",
            title: "$$c.title",
            locVen: "$$c.locVen",
            source: "$$c.source",
            fycost: "$$c.fycost",
            fyHC: "$$c.fyHC",
            mthCost: "$$c.mthCost",
            mthHC: "$$c.mthHC"
          }
        }
      }
    }
  },

  // Stage 2: Unwind costs array
  { $unwind: "$costs" },

  // Stage 3: Clean + round each cost item
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
        fycost: { $round: [{ $ifNull: ["$costs.fycost", 0] }, 6] },
        fyHC: { $round: [{ $ifNull: ["$costs.fyHC", 0] }, 6] },
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

  // Stage 4: Lookup BU from TestRefBU
  {
    $lookup: {
      from: "TestRefBU",
      localField: "cost.snode",
      foreignField: "snode",
      as: "buMatch"
    }
  },

  // Stage 5: Attach bu to cost
  {
    $addFields: {
      "cost.bu": {
        $ifNull: [{ $arrayElemAt: ["$buMatch.bu", 0] }, null]
      }
    }
  },

  // Stage 6: Group by ipLongId, planId, scenario, year
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

  // Stage 7: Sum monthly arrays and round to 6 decimals
  {
    $addFields: {
      mthCost: {
        $reduce: {
          input: "$mthCostArrays",
          initialValue: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
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
          initialValue: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
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
      totalCost: { $round: ["$totalCost", 6] }
    }
  },

  // Stage 8: Final reshape
  {
    $project: {
      _id: 0,
      ipLongId: "$_id.ipLongId",
      planId: "$_id.planId",
      scenario: "$_id.scenario",
      year: "$_id.year",
      totalCost: 1,
      mthCost: 1,
      mthHC: 1,
      costs: 1
    }
  }

  // Optional Stage 9: Save result
  // { $merge: { into: "l4CostDetailsFlattened", whenMatched: "replace" } }
])
