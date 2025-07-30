db.l1Proposal.aggregate([
  // Step 1: Project only required fields from l1Proposal
  {
    $project: {
      proposalId: 1,
      "budget.planId": 1,
      "budget.verId": 1
    }
  },

  // Step 2: Join with lvl2FinancialsSummary using proposalId
  {
    $lookup: {
      from: "lvl2FinancialsSummary",
      let: { pid: "$proposalId", l1PlanId: "$budget.planId", l1VerId: "$budget.verId" },
      pipeline: [
        {
          $match: {
            $expr: { $eq: ["$proposalId", "$$pid"] }
          }
        },
        {
          $project: {
            _id: 0,
            budget: 1
          }
        },
        {
          $addFields: {
            matchedVerIds: {
              $filter: {
                input: "$budget",
                as: "b",
                cond: {
                  $and: [
                    { $eq: ["$$b.planId", "$$l1PlanId"] },
                    { $eq: ["$$b.verId", "$$l1VerId"] }
                  ]
                }
              }
            }
          }
        },
        {
          $project: {
            matchedCount: { $size: "$matchedVerIds" }
          }
        }
      ],
      as: "l2"
    }
  },

  // Step 3: Flatten the lookup result
  {
    $unwind: {
      path: "$l2",
      preserveNullAndEmptyArrays: true
    }
  },

  // Step 4: Mark whether verId match was found
  {
    $addFields: {
      verIdMatch: {
        $gt: ["$l2.matchedCount", 0]
      }
    }
  },

  // Step 5 (Optional): Filter mismatches
  {
    $match: {
      verIdMatch: false
    }
  },

  // Step 6: Final projection
  {
    $project: {
      proposalId: 1,
      "budget.planId": 1,
      "budget.verId": 1,
      verIdMatch: 1
    }
  }
])
