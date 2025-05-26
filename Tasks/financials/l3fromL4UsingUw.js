db.l4CostDetails.aggregate([

  // Stage 1: Unwind to expose indexed fields
  { $unwind: "$costs" },

  // Stage 2: Match to enable index usage
  {
    $match: {
      "costs.snode": { $exists: true },
      "costs.year": { $exists: true }
    }
  },

  // Stage 3: Lookup from TestRefBU (index on snode)
  {
    $lookup: {
      from: "TestRefBU",
      localField: "costs.snode",
      foreignField: "snode",
      as: "buMatch"
    }
  },

  // Stage 4: Reduce fields after lookup
  {
    $project: {
      ipLongId: 1,
      planId: 1,
      scenario: 1,
      cost: {
        year: "$costs.year",
        snode: "$costs.snode",
        type: "$costs.type",
        subType: "$costs.subType",
        title: "$costs.title",
        locVen: "$costs.locVen",
        source: "$costs.source",
        fycost: "$costs.fycost",
        fyHC: "$costs.fyHC",
        mthCost: "$costs.mthCost",
        mthHC: "$costs.mthHC",
        bu: {
          $ifNull: [{ $arrayElemAt: ["$buMatch.bu", 0] }, null]
        }
      }
    }
  },

  // Stage 5: Round and null-safe cost values
  {
    $addFields: {
      cost: {
        $mergeObjects: [
          "$cost",
          {
            fycost: { $round: [{ $ifNull: ["$cost.fycost", 0] }, 6] },
            fyHC: { $round: [{ $ifNull: ["$cost.fyHC", 0] }, 6] },
            mthCost: {
              $map: {
                input: "$cost.mthCost",
                as: "v",
                in: { $round: [{ $ifNull: ["$$v", 0] }, 6] }
              }
            },
            mthHC: {
              $map: {
                input: "$cost.mthHC",
                as: "v",
                in: { $round: [{ $ifNull: ["$$v", 0] }, 6] }
              }
            }
          }
        ]
      }
    }
  },

  // Stage 6: Group by root dimensions and cost.year
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

  // Stage 7: Reduce month-wise arrays
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
      },
      totalCost: { $round: ["$totalCost", 6] }
    }
  },

  // Stage 8: Final field shaping
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
      costs: {
        year: 1,
        snode: 1,
        fycost: 1,
        fyHC: 1,
        mthCost: 1,
        mthHC: 1,
        bu: 1,
        type: 1,
        subType: 1,
        title: 1,
        locVen: 1,
        source: 1
      }
    }
  }

  // Optional:
  // { $merge: { into: "l4CostDetailsFlattened", whenMatched: "replace" } }

])
