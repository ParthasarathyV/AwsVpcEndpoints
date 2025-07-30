db.lvlfinancialsSummary.aggregate([
  /* 1 – bring in the L1 values we need */
  {
    $project: {
      proposalId : 1,
      l1PlanId   : "$outlook.planId",
      l1VerId    : "$outlook.verId"
    }
  },

  /* 2 – lookup all outlook rows in L2 that share this proposal */
  {
    $lookup: {
      from: "lvl2FinancialsSummary",
      let : { pid: "$proposalId" },
      pipeline: [
        { $match: { $expr: { $eq: ["$proposalId", "$$pid"] } } },

        /* keep only planId + verId in every array element        */
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

  /* 3 – flatten the lookup result to one object                 */
  { $set: { l2: { $arrayElemAt: ["$l2", 0] } } },

  /* 4 – derive the distinct planIds & verIds seen in that array */
  {
    $addFields: {
      l2PlanIds: {
        $setUnion: [
          { $map: { input: { $ifNull: ["$l2.outlook", []] },
                    as: "o", in: "$$o.planId" } },
          [] ]
      },
      l2VerIds: {
        $setUnion: [
          { $map: { input: { $ifNull: ["$l2.outlook", []] },
                    as: "o", in: "$$o.verId" } },
          [] ]
      }
    }
  },

  /* 5 – decide whether EVERYTHING matches perfectly             */
  {
    $addFields: {
      isPerfect: {
        $and: [
          { $eq: [ { $size: "$l2PlanIds" }, 1 ] },                // one planId
          { $eq: [ { $size: "$l2VerIds"  }, 1 ] },                // one verId
          { $eq: [ { $arrayElemAt: ["$l2PlanIds", 0] }, "$l1PlanId" ] },
          { $eq: [ { $arrayElemAt: ["$l2VerIds" , 0] }, "$l1VerId" ] }
        ]
      }
    }
  },

  /* 6 – keep ONLY the imperfect ones                            */
  { $match: { isPerfect: false } },

  /* 7 – final, easy-to-read output                              */
  {
    $project: {
      _id          : 0,
      proposalId   : 1,
      l1PlanId     : 1,
      l1VerId      : 1,
      l2PlanIds    : 1,     // [] ⇒ no outlook rows in L2
      l2VerIds     : 1,     // [] ⇒ rows present but verId missing
      l1ToL2Recon  : { $literal: false }
    }
  }
]);
