db.billingKeyHeaderTemp.aggregate([
  { $unwind: "$allocations" },

  // Explode all levels into separate group streams
  {
    $project: {
      headerId: 1,
      ipLongId: 1,
      planId: 1,
      bkId: 1,
      reason: 1,
      type: 1,
      year: 1,
      scenario: 1,
      allocations: 1,
      sdmL5: "$allocations.levels.sdmL5",
      sdmL6: "$allocations.levels.sdmL6",
      sdmL7: "$allocations.levels.sdmL7",
      sdmL8: "$allocations.levels.sdmL8",
      sdmL9: "$allocations.levels.sdmL9",
      sdmL10: "$allocations.levels.sdmL10",
      sdmL11: "$allocations.levels.sdmL11",
      sdmL12: "$allocations.levels.sdmL12",
      sdmL13: "$allocations.levels.sdmL13",
      pct: "$allocations.ALLOC_PERCENT"
    }
  },

  // Group to sum pct per headerId and each sdm level
  {
    $group: {
      _id: {
        headerId: "$headerId",
        ipLongId: "$ipLongId",
        planId: "$planId",
        bkId: "$bkId",
        reason: "$reason",
        type: "$type",
        year: "$year",
        scenario: "$scenario"
      },

      sdmL5: { $push: { name: "$sdmL5", pct: "$pct" } },
      sdmL6: { $push: { name: "$sdmL6", pct: "$pct" } },
      sdmL7: { $push: { name: "$sdmL7", pct: "$pct" } },
      sdmL8: { $push: { name: "$sdmL8", pct: "$pct" } },
      sdmL9: { $push: { name: "$sdmL9", pct: "$pct" } },
      sdmL10: { $push: { name: "$sdmL10", pct: "$pct" } },
      sdmL11: { $push: { name: "$sdmL11", pct: "$pct" } },
      sdmL12: { $push: { name: "$sdmL12", pct: "$pct" } },
      sdmL13: { $push: { name: "$sdmL13", pct: "$pct" } },

      allocations: { $push: "$allocations" }
    }
  },

  // Reduce duplicates per level
  {
    $project: {
      _id: 0,
      headerId: "$_id.headerId",
      ipLongId: "$_id.ipLongId",
      planId: "$_id.planId",
      bkId: "$_id.bkId",
      reason: "$_id.reason",
      type: "$_id.type",
      year: "$_id.year",
      scenario: "$_id.scenario",
      allocations: 1,

      sdmL5: {
        $map: {
          input: { $setUnion: "$sdmL5.name" },
          as: "n",
          in: {
            name: "$$n",
            pct: {
              $sum: {
                $map: {
                  input: "$sdmL5",
                  as: "entry",
                  in: { $cond: [{ $eq: ["$$entry.name", "$$n"] }, "$$entry.pct", 0] }
                }
              }
            }
          }
        }
      },

      // Repeat this pattern for each of the other levels
      sdmL6: {
        $map: {
          input: { $setUnion: "$sdmL6.name" },
          as: "n",
          in: {
            name: "$$n",
            pct: {
              $sum: {
                $map: {
                  input: "$sdmL6",
                  as: "entry",
                  in: { $cond: [{ $eq: ["$$entry.name", "$$n"] }, "$$entry.pct", 0] }
                }
              }
            }
          }
        }
      },

      // sdmL7 to sdmL13: repeat same logic as above (can generate the full snippet if you'd like)
    }
  },

  // Optional: store result
  {
    $merge: {
      into: "billingKeyHeaderWithAllSdml",
      whenMatched: "replace",
      whenNotMatched: "insert"
    }
  }
])
