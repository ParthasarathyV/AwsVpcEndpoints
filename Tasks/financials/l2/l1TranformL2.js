db.collection.aggregate([
  {
    $facet: {
      proposalId: [
        {
          $project: {
            _id: 0,
            proposalId: 1
          }
        }
      ],
      outlook: [
        {
          $match: {
            "outlook.years": { $exists: true, $ne: [] }
          }
        },
        { $unwind: "$outlook.years" },
        {
          $project: {
            planId: "$outlook.planId",
            verId: "$outlook.verId",
            year: "$outlook.years.year",
            fyCost: "$outlook.years.fyCost",
            ytdCost: "$outlook.years.ytdCost",
            futureMonthCost: "$outlook.years.futureMonthCost",
            adjustments: "$outlook.years.adjustments",
            mth_hc: "$outlook.years.mth_hc",
            mth_cost: "$outlook.years.mth_cost"
          }
        }
      ],
      live: [
        {
          $match: {
            "live.years": { $exists: true, $ne: [] }
          }
        },
        { $unwind: "$live.years" },
        {
          $project: {
            planId: "$live.planId",
            verId: "$live.verId",
            year: "$live.years.year",
            fyCost: "$live.years.fyCost",
            ytdCost: "$live.years.ytdCost",
            futureMonthCost: "$live.years.futureMonthCost",
            adjustments: "$live.years.adjustments",
            mth_hc: "$live.years.mth_hc",
            mth_cost: "$live.years.mth_cost"
          }
        }
      ],
      budget: [
        {
          $match: {
            "budget.years": { $exists: true, $ne: [] }
          }
        },
        { $unwind: "$budget.years" },
        {
          $project: {
            planId: "$budget.planId",
            verId: "$budget.verId",
            year: "$budget.years.year",
            fyCost: "$budget.years.fyCost",
            ytdCost: "$budget.years.ytdCost",
            futureMonthCost: "$budget.years.futureMonthCost",
            adjustments: "$budget.years.adjustments",
            mth_hc: "$budget.years.mth_hc",
            mth_cost: "$budget.years.mth_cost"
          }
        }
      ]
    }
  },
  {
    $project: {
      proposalId: { $arrayElemAt: ["$proposalId.proposalId", 0] },
      outlook: 1,
      live: 1,
      budget: 1
    }
  }
])
