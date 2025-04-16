db.billingKeyHeaderTemp2.aggregate([
  {
    $facet: {
      // Part 1: Group and sum by sdmL5 per header
      grouped: [
        { $unwind: "$allocations" },
        {
          $group: {
            _id: {
              headerId: "$headerId",
              sdmL5: "$allocations.levels.sdmL5"
            },
            pct: { $sum: "$allocations.ALLOC_PERCENT" }
          }
        },
        {
          $group: {
            _id: "$_id.headerId",
            sdml5: {
              $push: {
                name: "$_id.sdmL5",
                pct: "$pct"
              }
            }
          }
        }
      ],

      // Part 2: All original fields per headerId
      originals: [
        {
          $project: {
            _id: 0,
            headerId: 1,
            ipLongId: 1,
            planId: 1,
            reason: 1,
            type: 1,
            year: 1,
            scenario: 1,
            bkId: 1,
            allocations: 1
          }
        }
      ]
    }
  },

  // Merge grouped results with full originals
  {
    $project: {
      merged: {
        $map: {
          input: "$grouped",
          as: "g",
          in: {
            $mergeObjects: [
              "$$g",
              {
                $first: {
                  $filter: {
                    input: "$originals",
                    as: "o",
                    cond: { $eq: ["$$o.headerId", "$$g._id"] }
                  }
                }
              }
            ]
          }
        }
      }
    }
  },

  // Flatten merged array
  { $unwind: "$merged" },
  { $replaceRoot: { newRoot: "$merged" } }
])
