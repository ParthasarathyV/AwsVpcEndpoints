[
  // L1: keep only what we need; normalize null -> ""
  {
    $project: {
      _id: 0,
      proposalId: 1,
      outlookPlanId: { $ifNull: ["$outlook.planId", ""] },
      outlookVerId:  { $ifNull: ["$outlook.verId",  ""] },
      budgetPlanId:  { $ifNull: ["$budget.planId",  ""] },
      budgetVerId:   { $ifNull: ["$budget.verId",   ""] },
      livePlanId:    { $ifNull: ["$live.planId",    ""] },
      liveVerId:     { $ifNull: ["$live.verId",     ""] },
      pAPlanId:      { $ifNull: ["$pendingApproval.planId", ""] },
      pAVerId:       { $ifNull: ["$pendingApproval.verId",  ""] }
    }
  },

  // L2: join and reduce each scenario to unique id sets
  {
    $lookup: {
      from: "lvl2",
      let: { pid: "$proposalId" },
      pipeline: [
        { $match: { $expr: { $eq: ["$proposalId", "$$pid"] } } },
        {
          $project: {
            _id: 0,
            // outlook
            outlookPlanSet: {
              $setUnion: [
                { $map: { input: { $ifNull: ["$outlook", []] }, as: "e", in: "$$e.planId" } },
                []
              ]
            },
            outlookVerSet: {
              $setUnion: [
                { $map: { input: { $ifNull: ["$outlook", []] }, as: "e", in: "$$e.verId" } },
                []
              ]
            },
            // budget
            budgetPlanSet: {
              $setUnion: [
                { $map: { input: { $ifNull: ["$budget", []] }, as: "e", in: "$$e.planId" } },
                []
              ]
            },
            budgetVerSet: {
              $setUnion: [
                { $map: { input: { $ifNull: ["$budget", []] }, as: "e", in: "$$e.verId" } },
                []
              ]
            },
            // live
            livePlanSet: {
              $setUnion: [
                { $map: { input: { $ifNull: ["$live", []] }, as: "e", in: "$$e.planId" } },
                []
              ]
            },
            liveVerSet: {
              $setUnion: [
                { $map: { input: { $ifNull: ["$live", []] }, as: "e", in: "$$e.verId" } },
                []
              ]
            },
            // pending approval
            paPlanSet: {
              $setUnion: [
                { $map: { input: { $ifNull: ["$pendingApproval", []] }, as: "e", in: "$$e.planId" } },
                []
              ]
            },
            paVerSet: {
              $setUnion: [
                { $map: { input: { $ifNull: ["$pendingApproval", []] }, as: "e", in: "$$e.verId" } },
                []
              ]
            }
          }
        }
      ],
      as: "l2"
    }
  },
  { $set: { l2: { $first: "$l2" } } }, // if missing in L2, sets will be treated as []

  // Scenario-level mismatches (empty expected => sets must be empty)
  {
    $set: {
      outlookMismatch: {
        $let: {
          vars: {
            ep: "$outlookPlanId", ev: "$outlookVerId",
            ps: { $ifNull: ["$l2.outlookPlanSet", []] },
            vs: { $ifNull: ["$l2.outlookVerSet",  []] }
          },
          in: {
            $cond: [
              { $or: [ { $eq: ["$$ep",""] }, { $eq: ["$$ev",""] } ] },
              { $or: [ { $gt: [ { $size: "$$ps" }, 0 ] }, { $gt: [ { $size: "$$vs" }, 0 ] } ] },
              {
                $not: {
                  $and: [
                    { $eq: [ { $size: "$$ps" }, 1 ] },
                    { $eq: [ { $size: "$$vs" }, 1 ] },
                    { $eq: [ { $first: "$$ps" }, "$$ep" ] },
                    { $eq: [ { $first: "$$vs" }, "$$ev" ] }
                  ]
                }
              }
            ]
          }
        }
      },
      budgetMismatch: {
        $let: {
          vars: {
            ep: "$budgetPlanId", ev: "$budgetVerId",
            ps: { $ifNull: ["$l2.budgetPlanSet", []] },
            vs: { $ifNull: ["$l2.budgetVerSet",  []] }
          },
          in: {
            $cond: [
              { $or: [ { $eq: ["$$ep",""] }, { $eq: ["$$ev",""] } ] },
              { $or: [ { $gt: [ { $size: "$$ps" }, 0 ] }, { $gt: [ { $size: "$$vs" }, 0 ] } ] },
              {
                $not: {
                  $and: [
                    { $eq: [ { $size: "$$ps" }, 1 ] },
                    { $eq: [ { $size: "$$vs" }, 1 ] },
                    { $eq: [ { $first: "$$ps" }, "$$ep" ] },
                    { $eq: [ { $first: "$$vs" }, "$$ev" ] }
                  ]
                }
              }
            ]
          }
        }
      },
      liveMismatch: {
        $let: {
          vars: {
            ep: "$livePlanId", ev: "$liveVerId",
            ps: { $ifNull: ["$l2.livePlanSet", []] },
            vs: { $ifNull: ["$l2.liveVerSet",  []] }
          },
          in: {
            $cond: [
              { $or: [ { $eq: ["$$ep",""] }, { $eq: ["$$ev",""] } ] },
              { $or: [ { $gt: [ { $size: "$$ps" }, 0 ] }, { $gt: [ { $size: "$$vs" }, 0 ] } ] },
              {
                $not: {
                  $and: [
                    { $eq: [ { $size: "$$ps" }, 1 ] },
                    { $eq: [ { $size: "$$vs" }, 1 ] },
                    { $eq: [ { $first: "$$ps" }, "$$ep" ] },
                    { $eq: [ { $first: "$$vs" }, "$$ev" ] }
                  ]
                }
              }
            ]
          }
        }
      },
      pendingApprovalMismatch: {
        $let: {
          vars: {
            ep: "$pAPlanId", ev: "$pAVerId",
            ps: { $ifNull: ["$l2.paPlanSet", []] },
            vs: { $ifNull: ["$l2.paVerSet",  []] }
          },
          in: {
            $cond: [
              { $or: [ { $eq: ["$$ep",""] }, { $eq: ["$$ev",""] } ] },
              { $or: [ { $gt: [ { $size: "$$ps" }, 0 ] }, { $gt: [ { $size: "$$vs" }, 0 ] } ] },
              {
                $not: {
                  $and: [
                    { $eq: [ { $size: "$$ps" }, 1 ] },
                    { $eq: [ { $size: "$$vs" }, 1 ] },
                    { $eq: [ { $first: "$$ps" }, "$$ep" ] },
                    { $eq: [ { $first: "$$vs" }, "$$ev" ] }
                  ]
                }
              }
            ]
          }
        }
      }
    }
  },

  // roll up final mismatch flag
  {
    $set: {
      versionMismatch: {
        $or: [
          "$outlookMismatch",
          "$budgetMismatch",
          "$liveMismatch",
          "$pendingApprovalMismatch"
        ]
      }
    }
  },

  // Keep all L1 ids and L2 sets in the output
  {
    $project: {
      _id: 0,
      proposalId: 1,
      versionMismatch: 1,

      // L1 expected
      outlookPlanId: 1, outlookVerId: 1,
      budgetPlanId: 1,  budgetVerId: 1,
      livePlanId: 1,    liveVerId: 1,
      pAPlanId: 1,      pAVerId: 1,

      // L2 observed (unique sets)
      l2: {
        outlookPlanSet: { $ifNull: ["$l2.outlookPlanSet", []] },
        outlookVerSet:  { $ifNull: ["$l2.outlookVerSet",  []] },
        budgetPlanSet:  { $ifNull: ["$l2.budgetPlanSet",  []] },
        budgetVerSet:   { $ifNull: ["$l2.budgetVerSet",   []] },
        livePlanSet:    { $ifNull: ["$l2.livePlanSet",    []] },
        liveVerSet:     { $ifNull: ["$l2.liveVerSet",     []] },
        paPlanSet:      { $ifNull: ["$l2.paPlanSet",      []] },
        paVerSet:       { $ifNull: ["$l2.paVerSet",       []] }
      }
    }
  },

  // persist only mismatches
  { $match: { versionMismatch: true } },

  // write to reconResults
  {
    $merge: {
      into: "reconResults",
      on: "proposalId",
      whenMatched: "replace",
      whenNotMatched: "insert"
    }
  }
]
