[
  {
    $group: {
      _id: null,
      financials: {
        totalCost: { $sum: "$totalCost" },
        forecastTotalCost: { $sum: "$forecastTotalCost" },
        budgetTotalCost: { $sum: "$budgetTotalCost" },
        totalCostNextYear: { $sum: "$totalCostNextYear" },
        forecastTotalCostNextYear: { $sum: "$forecastTotalCostNextYear" },
        budgetTotalCostNextYear: { $sum: "$budgetTotalCostNextYear" }
      },
      totalRows: { $sum: "$count" },
      typeCounts: {
        $push: { k: "$_id", v: "$count" }
      }
    }
  },
  {
    $project: {
      _id: 0,
      financials: 1,
      metadata: {
        totalRows: "$totalRows",
        typeCounts: { $arrayToObject: "$typeCounts" }
      }
    }
  }
]
