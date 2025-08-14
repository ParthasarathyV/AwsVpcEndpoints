db.lvl2.aggregate([
  // 1) Bring only what we need from L1 (light lookup)
  {
    $lookup: {
      from: "lvl1",
      localField: "proposalId",
      foreignField: "proposalId",
      pipeline: [
        {
          $project: {
            _id: 0,
            proposalId: 1,
            "outlook.planId": 1, "outlook.verId": 1,
            "budget.planId": 1,  "budget.verId": 1,
            "live.planId": 1,    "live.verId": 1,
            "pendingApproval.planId": 1, "pendingApproval.verId": 1
          }
        }
      ],
      as: "l1"
    }
  },
  { $set: { l1: { $first: "$l1" } } },

  // 2) Precompute sets per scenario (unique values only)
  {
    $set: {
      outArr: { $ifNull: ["$outlook", []] },
      budArr: { $ifNull: ["$budget", []] },
      liveArr: { $ifNull: ["$live", []] },
      paArr: { $ifNull: ["$pendingApproval", []] },

      outPlanSet: {
        $setUnion: [ { $map: { input: { $ifNull: ["$outlook", []] }, as: "e", in: "$$e.planId" } }, [] ]
      },
      outVerSet: {
        $setUnion: [ { $map: { input: { $ifNull: ["$outlook", []] }, as: "e", in: "$$e.verId" } }, [] ]
      },

      budPlanSet: {
        $setUnion: [ { $map: { input: { $ifNull: ["$budget", []] }, as: "e", in: "$$e.planId" } }, [] ]
      },
      budVerSet: {
        $setUnion: [ { $map: { input: { $ifNull: ["$budget", []] }, as: "e", in: "$$e.verId" } }, [] ]
      },

      livePlanSet: {
        $setUnion: [ { $map: { input: { $ifNull: ["$live", []] }, as: "e", in: "$$e.planId" } }, [] ]
      },
      liveVerSet: {
        $setUnion: [ { $map: { input: { $ifNull: ["$live", []] }, as: "e", in: "$$e.verId" } }, [] ]
      },

      paPlanSet: {
        $setUnion: [ { $map: { input: { $ifNull: ["$pendingApproval", []] }, as: "e", in: "$$e.planId" } }, [] ]
      },
      paVerSet: {
        $setUnion: [ { $map: { input: { $ifNull: ["$pendingApproval", []] }, as: "e", in: "$$e.verId" } }, [] ]
      }
    }
  },

  // 3) For each scenario:
  //    - If L1 has empty/absent ids => L2 array must be empty
  //    - Else L2 must be non-empty AND each set must be a singleton equal to expected value
  {
    $set: {
      outlookMismatch: {
        $let: {
          vars: {
            expPlan: { $getField: { field: "planId", input: "$l1.outlook" } },
            expVer:  { $getField: { field: "verId",  input: "$l1.outlook" } }
          },
          in: {
            $cond: [
              { $or: [
                { $eq: ["$$expPlan", ""] }, { $eq: ["$$expVer", ""] },
                { $and: [ { $eq: ["$$expPlan", null] }, { $eq: ["$$expVer", null] } ] }
              ]},
              { $gt: [ { $size: "$outArr" }, 0 ] }, // any rows present is mismatch
              {
                $not: {
                  $and: [
                    { $gt: [ { $size: "$outArr" }, 0 ] },
                    { $eq: [ { $size: "$outPlanSet" }, 1 ] },
                    { $eq: [ { $size: "$outVerSet"  }, 1 ] },
                    { $eq: [ { $first: "$outPlanSet" }, "$$expPlan" ] },
                    { $eq: [ { $first: "$outVerSet"  }, "$$expVer"  ] }
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
            expPlan: { $getField: { field: "planId", input: "$l1.budget" } },
            expVer:  { $getField: { field: "verId",  input: "$l1.budget" } }
          },
          in: {
            $cond: [
              { $or: [
                { $eq: ["$$expPlan", ""] }, { $eq: ["$$expVer", ""] },
                { $and: [ { $eq: ["$$expPlan", null] }, { $eq: ["$$expVer", null] } ] }
              ]},
              { $gt: [ { $size: "$budArr" }, 0 ] },
              {
                $not: {
                  $and: [
                    { $gt: [ { $size: "$budArr" }, 0 ] },
                    { $eq: [ { $size: "$budPlanSet" }, 1 ] },
                    { $eq: [ { $size: "$budVerSet"  }, 1 ] },
                    { $eq: [ { $first: "$budPlanSet" }, "$$expPlan" ] },
                    { $eq: [ { $first: "$budVerSet"  }, "$$expVer"  ] }
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
            expPlan: { $getField: { field: "planId", input: "$l1.live" } },
            expVer:  { $getField: { field: "verId",  input: "$l1.live" } }
          },
          in: {
            $cond: [
              { $or: [
                { $eq: ["$$expPlan", ""] }, { $eq: ["$$expVer", ""] },
                { $and: [ { $eq: ["$$expPlan", null] }, { $eq: ["$$expVer", null] } ] }
              ]},
              { $gt: [ { $size: "$liveArr" }, 0 ] },
              {
                $not: {
                  $and: [
                    { $gt: [ { $size: "$liveArr" }, 0 ] },
                    { $eq: [ { $size: "$livePlanSet" }, 1 ] },
                    { $eq: [ { $size: "$liveVerSet"  }, 1 ] },
                    { $eq: [ { $first: "$livePlanSet" }, "$$expPlan" ] },
                    { $eq: [ { $first: "$liveVerSet"  }, "$$expVer"  ] }
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
            expPlan: { $getField: { field: "planId", input: "$l1.pendingApproval" } },
            expVer:  { $getField: { field: "verId",  input: "$l1.pendingApproval" } }
          },
          in: {
            $cond: [
              { $or: [
                { $eq: ["$$expPlan", ""] }, { $eq: ["$$expVer", ""] },
                { $and: [ { $eq: ["$$expPlan", null] }, { $eq: ["$$expVer", null] } ] }
              ]},
              { $gt: [ { $size: "$paArr" }, 0 ] },
              {
                $not: {
                  $and: [
                    { $gt: [ { $size: "$paArr" }, 0 ] },
                    { $eq: [ { $size: "$paPlanSet" }, 1 ] },
                    { $eq: [ { $size: "$paVerSet"  }, 1 ] },
                    { $eq: [ { $first: "$paPlanSet" }, "$$expPlan" ] },
                    { $eq: [ { $first: "$paVerSet"  }, "$$expVer"  ] }
                  ]
                }
              }
            ]
          }
        }
      }
    }
  },

  // 4) Final light projection
  {
    $project: {
      _id: 0,
      proposalId: 1,
      versionMismatch: {
        $or: [
          "$outlookMismatch",
          "$budgetMismatch",
          "$liveMismatch",
          "$pendingApprovalMismatch"
        ]
      }
    }
  }
],
// Hints if helpful:
{ hint: { proposalId: 1 } }
);
