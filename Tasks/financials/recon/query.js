[
  // Step 1: Base projection
  {
    $project: {
      proposalId: 1,
      outlookPlanId: "$outlook.planId",
      L1OutlookVerId: "$outlook.verId"
    }
  },

  // Step 2: Lookup L2
  {
    $lookup: {
      from: "lvl2FinancialsSummary",
      let: {
        proposalIdL1: "$proposalId",
        outlookPlanId1: "$outlookPlanId"
      },
      pipeline: [
        {
          $addFields: {
            uniqueOutlookVerIds: { $setUnion: "$outlook.verId" },
            uniqueOutlookPlanIds: { $setUnion: "$outlook.planId" }
          }
        },
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$proposalId", "$$proposalIdL1"] },
                {
                  $eq: [
                    "$outlookPlanId",
                    { $arrayElemAt: ["$uniqueOutlookPlanIds", 0] }
                  ]
                }
              ]
            }
          }
        },
        {
          $project: {
            _id: 0,
            uniqueOutlookVerIds: 1
          }
        }
      ],
      as: "l2"
    }
  },
  {
    $set: {
      L2OutlookVerId: { $first: "$l2.uniqueOutlookVerIds" }
    }
  },

  // Step 3: Run L3 and L4 in parallel
  {
    $facet: {
      l3: [
        {
          $lookup: {
            from: "lvl3CostDetailsOutlook",
            let: {
              proposalId1: "$proposalId",
              outlookPlanId1: "$outlookPlanId"
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$proposalId", "$$proposalId1"] },
                      { $eq: ["$planId", "$$outlookPlanId1"] }
                    ]
                  }
                }
              },
              {
                $project: {
                  _id: 0,
                  year: 1,
                  verId: 1
                }
              }
            ],
            as: "L3Outlook"
          }
        },
        {
          $set: {
            L3VerIdYearPairs: {
              $map: {
                input: "$L3Outlook",
                as: "item",
                in: { year: "$$item.year", verId: "$$item.verId" }
              }
            }
          }
        }
      ],
      l4: [
        {
          $lookup: {
            from: "lvl4CostDetailsOutlook",
            let: {
              proposalId1: "$proposalId",
              outlookPlanId1: "$outlookPlanId"
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$proposalId", "$$proposalId1"] },
                      { $eq: ["$planId", "$$outlookPlanId1"] }
                    ]
                  }
                }
              },
              {
                $project: {
                  _id: 0,
                  year: 1,
                  verId: 1
                }
              }
            ],
            as: "L4Outlook"
          }
        },
        {
          $set: {
            L4VerIdYearPairs: {
              $map: {
                input: "$L4Outlook",
                as: "item",
                in: { year: "$$item.year", verId: "$$item.verId" }
              }
            }
          }
        }
      ]
    }
  },

  // Step 4: Flatten the facet output
  {
    $set: {
      L3VerIdYearPairs: { $first: "$l3.L3VerIdYearPairs" },
      L4VerIdYearPairs: { $first: "$l4.L4VerIdYearPairs" }
    }
  },
  {
    $unset: ["l3", "l4"]
  },

  // Step 5: Recon flags
  {
    $addFields: {
      L1ToL2Recon: {
        $eq: ["$L1OutlookVerId", "$L2OutlookVerId"]
      },
      L1ToL4Recon: {
        $in: ["$L1OutlookVerId", {
          $map: {
            input: "$L4VerIdYearPairs",
            as: "item",
            in: "$$item.verId"
          }
        }]
      },
      L4ToL3Recon: {
        $allElementsTrue: {
          $map: {
            input: "$L4VerIdYearPairs",
            as: "l4item",
            in: {
              $in: [
                "$$l4item",
                "$L3VerIdYearPairs"
              ]
            }
          }
        }
      }
    }
  },

  // Step 6: Show only mismatches
  {
    $match: {
      $expr: {
        $or: [
          { $ne: ["$L1ToL2Recon", true] },
          { $ne: ["$L1ToL4Recon", true] },
          { $ne: ["$L4ToL3Recon", true] }
        ]
      }
    }
  }
]
