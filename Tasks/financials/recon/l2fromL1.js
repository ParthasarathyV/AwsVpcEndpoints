db.lvl2.aggregate([
  // bring only what we need from L1
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
            outlook: { planId: "$outlook.planId", verId: "$outlook.verId" },
            budget:  { planId: "$budget.planId",  verId: "$budget.verId"  },
            live:    { planId: "$live.planId",    verId: "$live.verId"    },
            pendingApproval: {
              planId: "$pendingApproval.planId",
              verId:  "$pendingApproval.verId"
            }
          }
        }
      ],
      as: "l1"
    }
  },
  { $set: { l1: { $first: "$l1" } } },

  // compute a single mismatch flag across all scenarios
  {
    $project: {
      _id: 0,
      proposalId: 1,
      versionMismatch: {
        $anyElementTrue: {
          $map: {
            input: ["outlook", "budget", "live", "pendingApproval"],
            as: "sc",
            in: {
              $let: {
                vars: {
                  // lvl2 array for this scenario
                  arr: {
                    $ifNull: [
                      { $getField: { field: "$$sc", input: "$$ROOT" } },
                      []
                    ]
                  },
                  // expected values from lvl1 for this scenario
                  expPlan: {
                    $getField: {
                      field: "planId",
                      input: { $getField: { field: "$$sc", input: "$l1" } }
                    }
                  },
                  expVer: {
                    $getField: {
                      field: "verId",
                      input: { $getField: { field: "$$sc", input: "$l1" } }
                    }
                  }
                },
                in: {
                  // Rule:
                  // - If L1 has empty/absent planId or verId → L2 must have NO elements.
                  // - Else every element in L2 array must match that planId & verId.
                  $cond: [
                    {
                      $or: [
                        { $eq: ["$$expPlan", ""] },
                        { $eq: ["$$expVer",  ""] },
                        { $and: [ { $eq: ["$$expPlan", null] }, { $eq: ["$$expVer", null] } ] }
                      ]
                    },
                    { $gt: [ { $size: "$$arr" }, 0 ] }, // mismatch if any rows exist
                    {
                      $not: [
                        {
                          $and: [
                            { $gt: [ { $size: "$$arr" }, 0 ] },
                            {
                              $allElementsTrue: {
                                $map: {
                                  input: "$$arr",
                                  as: "e",
                                  in: {
                                    $and: [
                                      { $eq: ["$$e.planId", "$$expPlan"] },
                                      { $eq: ["$$e.verId",  "$$expVer"  ] }
                                    ]
                                  }
                                }
                              }
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              }
            }
          }
        }
      }
    }
  }
], { allowDiskUse: true });
