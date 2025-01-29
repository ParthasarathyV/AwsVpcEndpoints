[
  {
    $group: {
      _id: null,
      totalCost: { $sum: "$totalCost" },
      forecastTotalCost: { $sum: "$forecastTotalCost" },
      budgetTotalCost: { $sum: "$budgetTotalCost" },
      totalCostNextYear: { $sum: "$totalCostNextYear" },
      forecastTotalCostNextYear: { $sum: "$forecastTotalCostNextYear" },
      budgetTotalCostNextYear: { $sum: "$budgetTotalCostNextYear" },
      totalRows: { $sum: "$count" },
      typeCounts: {
        $push: { k: "$_id", v: "$count" }
      }
    }
  },
  {
    $project: {
      _id: 0,
      financials: {
        totalCost: "$totalCost",
        forecastTotalCost: "$forecastTotalCost",
        budgetTotalCost: "$budgetTotalCost",
        totalCostNextYear: "$totalCostNextYear",
        forecastTotalCostNextYear: "$forecastTotalCostNextYear",
        budgetTotalCostNextYear: "$budgetTotalCostNextYear"
      },
      metadata: {
        totalRows: "$totalRows",
        typeCounts: { $arrayToObject: "$typeCounts" }
      }
    }
  }
]
