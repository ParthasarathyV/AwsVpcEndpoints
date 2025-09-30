[
  { 
    $unwind: "$costs" 
  },
  {
    $group: {
      _id: { proposalId: "$proposalId", src: "$costs.src", type: "$costs.type" },
      total: { $sum: "$costs.fyCost" } // or fyTot / ytdTot depending on field you want
    }
  },
  {
    $group: {
      _id: { proposalId: "$_id.proposalId", src: "$_id.src" },
      details: {
        $push: {
          type: "$_id.type",
          total: "$total"
        }
      },
      total: { $sum: "$total" }
    }
  },
  {
    $group: {
      _id: "$_id.proposalId",
      costs: {
        $push: {
          source: "$_id.src",
          total: "$total",
          details: "$details"
        }
      }
    }
  },
  {
    $project: {
      _id: 0,
      proposalId: "$_id",
      costs: 1
    }
  }
]
