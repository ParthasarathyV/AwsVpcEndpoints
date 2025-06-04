db.collection.aggregate([
  {
    $match: {
      $or: [
        { "outlook.years": { $exists: true, $ne: [] } },
        { "live.years": { $exists: true, $ne: [] } },
        { "budget.years": { $exists: true, $ne: [] } }
      ]
    }
  },
  {
    $facet: {
      outlook: [
        { $match: { "outlook.years": { $exists: true, $ne: [] } } },
        { $unwind: "$outlook.years" },
        {
          $project: {
            _id: 0,
            proposalId: 1,
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
        { $match: { "live.years": { $exists: true, $ne: [] } } },
        { $unwind: "$live.years" },
        {
          $project: {
            _id: 0,
            proposalId: 1,
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
        { $match: { "budget.years": { $exists: true, $ne: [] } } },
        { $unwind: "$budget.years" },
        {
          $project: {
            _id: 0,
            proposalId: 1,
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
  }
])
