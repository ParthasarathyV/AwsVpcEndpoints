db.l4CostDetails.aggregate([

  // Stage 1: Unwind costs early to access costs.snode (indexed)
  { $unwind: "$costs" },

  // Stage 2: Match to trigger index usage
  {
    $match: {
      "costs.snode": { $exists: true },
      "costs.year": { $exists: true } // Optional: Filter by year if needed
    }
  },

  // Stage 3: Lookup from TestRefBU using costs.snode (indexed)
  {
    $lookup: {
      from: "TestRefBU",
      localField: "costs.snode",
      foreignField: "snode",
      as: "buMatch"
    }
  },

  // Stage 4: Merge matched BU into costs
  {
    $addFields: {
      "costs.bu": {
        $ifNull: [{ $arrayElemAt: ["$buMatch.bu", 0] }, null]
      }
    }
  },

  // Stage 5: Flatten cost structure after enrichment
  {
    $replaceRoot: {
      newRoot: {
        ipLongId: "$ipLongId",
        planId: "$planId",
        scenario: "$scenario",
        cost: "$costs"
      }
    }
  },

  // Stage 6: Round and null-safe cleanups
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

  // Stage 7: Group back to reconstruct per year
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

  // Stage 8: Reduce monthly arrays and round
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

  // Stage 9: Final shape
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

  // Optional:
  // { $merge: { into: "l4CostDetailsFlattened", whenMatched: "replace" } }

])
