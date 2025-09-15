db.lvl4CostDetailsLive.aggregate([
  {
    $match: { scenario: "live" }
  },
  {
    $setWindowFields: {
      partitionBy: { proposalId: "$proposalId", scenario: "$scenario" },
      sortBy: { verId: -1 },
      output: {
        rank: { $rank: {} }
      }
    }
  },
  {
    $match: { rank: { $gt: 1 } }
  },
  {
    $addFields: {
      status: "old"
    }
  },
  {
    $merge: {
      into: "lvl4CostDetailsLive",
      on: "_id",
      whenMatched: "merge", // Only update the status field
      whenNotMatched: "discard"
    }
  }
])
