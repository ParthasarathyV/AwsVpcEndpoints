db.lvlfinancialsSummary.aggregate([
  /* 1 — L1 essentials */
  {
    $project: {
      proposalId : 1,
      l1PlanId   : "$outlook.planId",
      l1VerId    : "$outlook.verId"
    }
  },

  /* 2 — pull all outlook rows for this proposal */
  {
    $lookup: {
      from: "lvl2FinancialsSummary",
      let : { pid: "$proposalId" },
      pipeline: [
        { $match: { $expr: { $eq: ["$proposalId", "$$pid"] } } },
        { $project: {
            _id: 0,
            outlook: {
              $map: {
                input: "$outlook",
                as   : "o",
                in   : { planId: "$$o.planId", verId: "$$o.verId" }
              }
            }
        }}
      ],
      as: "l2"
    }
  },
  { $set: { l2: { $arrayElemAt: ["$l2", 0] } } },

  /* 3 — sets of distinct planIds / verIds seen in L2            */
  {
    $addFields: {
      l2PlanIds: {
        $setUnion: [
          { $map: { input: { $ifNull: ["$l2.outlook", []] },
                    as: "o", in: "$$o.planId" } },
          []
        ]
      },
      l2VerIds: {
        $setUnion: [
          { $map: { input: { $ifNull: ["$l2.outlook", []] },
                    as: "o", in: "$$o.verId" } },
          []
        ]
      }
    }
  },

  /* 4 — decide if this proposal is OK or not                    */
  {
    $addFields: {
      isOK: {
        $or: [
          /* A) Perfect 1-plan-1-ver match */
          {
            $and: [
              { $eq: [ { $size: "$l2PlanIds" }, 1 ] },
              { $eq: [ { $size: "$l2VerIds"  }, 1 ] },
              { $eq: [ { $arrayElemAt: ["$l2PlanIds", 0] }, "$l1PlanId" ] },
              { $eq: [ { $arrayElemAt: ["$l2VerIds" , 0] }, "$l1VerId" ] }
            ]
          },
          /* B) both sides say “null / nothing” */
          {
            $and: [
              { $eq: ["$l1VerId", null] },
              { $eq: [ { $size: "$l2VerIds" }, 0 ] }
            ]
          }
        ]
      }
    }
  },

  /* 5 — keep only the mismatches                               */
  { $match: { isOK: false } },

  /* 6 — final output                                            */
  {
    $project: {
      _id          : 0,
      proposalId   : 1,
      l1PlanId     : 1,
      l1VerId      : 1,
      l2PlanIds    : 1,     // []  => plan absent in L2
      l2VerIds     : 1,     // []  => verId absent / null in L2
      l1ToL2Recon  : { $literal: false }
    }
  }
]);
