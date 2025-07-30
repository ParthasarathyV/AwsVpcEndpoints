db.lvlfinancialsSummary.aggregate([
  /* L1 – proposalId and its single verId */
  { $project: { proposalId: 1, l1VerId: "$outlook.verId" } },

  /* L2 lookup: one equality probe that also tests the verId */
  { $lookup: {
      from: "lvl2FinancialsSummary",
      let : { pid: "$proposalId", v: "$l1VerId" },
      pipeline: [
        { $match: {                                   /* uses BOTH index keys */
            $expr: {
              $and: [
                { $eq: ["$proposalId", "$$pid"] },
                { $in: ["$$v", "$outlook.verId"] }    /* reference verId field */
              ]
            }
        }},
        { $project: { _id: 0, "outlook.verId": 1 } }  /* index-covered */
      ],
      as: "l2"
  }},

  /* l2 array → single list of found versions */
  { $set: { l2VerIds: { $arrayElemAt: ["$l2.outlook.verId", 0] } } },

  /* keep proposals where the L1 verId did NOT match any L2 verId */
  { $match: { l2VerIds: { $exists: false } } },

  /* final output */
  { $project: { _id: 0, proposalId: 1, l1VerId: 1 } }
]);
