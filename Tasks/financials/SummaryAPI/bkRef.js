db.ipBillingKeys.aggregate([
  // Step 1: Lookup only relevant bkHeader docs (filtered by bkId)
  {
    $lookup: {
      from: "billingKeyHeader",
      let: {
        bkIds: {
          $map: {
            input: "$years",
            as: "y",
            in: "$$y.bkId"
          }
        }
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $in: ["$bkId", "$$bkIds"]
            }
          }
        },
        {
          $project: {
            bkId: 1,
            bkVersion: 1,
            cc: 1
          }
        }
      ],
      as: "bkHeaderData"
    }
  },

  // Step 2: Enrich years[] with bkCc + ccCost = pct * fyCost
  {
    $set: {
      years: {
        $map: {
          input: "$years",
          as: "y",
          in: {
            $let: {
              vars: {
                matchedBk: {
                  $first: {
                    $filter: {
                      input: "$bkHeaderData",
                      as: "bk",
                      cond: {
                        $and: [
                          { $eq: ["$$bk.bkId", "$$y.bkId"] },
                          {
                            $eq: [
                              { $toString: "$$bk.bkVersion" },
                              { $toString: "$$y.bkversion" }
                            ]
                          }
                        ]
                      }
                    }
                  }
                }
              },
              in: {
                $mergeObjects: [
                  "$$y",
                  {
                    bkCc: "$$matchedBk.cc",
                    ccCost: {
                      $map: {
                        input: { $ifNull: ["$$matchedBk.cc", []] },
                        as: "ccItem",
                        in: {
                          snode: "$$ccItem.snode",
                          pct: "$$ccItem.pct",
                          cost: {
                            $multiply: [
                              "$$ccItem.pct",
                              { $ifNull: ["$$y.fyCost", 0] }
                            ]
                          }
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      }
    }
  },

  // Step 3: Clean up temp join
  {
    $unset: ["bkHeaderData"]
  }
])
