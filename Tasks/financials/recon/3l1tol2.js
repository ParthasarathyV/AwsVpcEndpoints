db.lvlfinancialsSummary.aggregate([
  /* 1️⃣  Bring only what we need from L1 */
  {
    $project: {
      proposalId : 1,
      planId     : "$outlook.planId",
      l1VerId    : "$outlook.verId"
    }
  },

  /* 2️⃣  Lookup any L2 outlook rows whose planId == L1.planId */
  {
    $lookup: {
      from: "lvl2FinancialsSummary",
      let : { pid: "$proposalId", plan: "$planId" },
      pipeline: [
        { $match: { $expr: { $eq: ["$proposalId", "$$pid"] } } },

        /* keep only outlook elements for that plan               */
        { $project: {
            _id: 0,
            outlook: {
              $filter: {
                input: "$outlook",
                as   : "o",
                cond : { $eq: ["$$o.planId", "$$plan"] }
              }
            }
        }},

        /* bring back just their verId values                     */
        { $project: { "outlook.verId": 1 } }
      ],
      as: "l2"
    }
  },
  { $set: { l2: { $arrayElemAt: ["$l2", 0] } } },

  /* 3️⃣  Pull **all** distinct verIds we found on the L2 side   */
  {
    $addFields: {
      l2VerIds: { $setUnion: ["$l2.outlook.verId", []] }   // [] removes null
    }
  },

  /* 4️⃣  Keep only proposals where
         - no L2 row exists  OR
         - the only L2 verId ≠ L1.verId
  */
  {
    $match: { $expr: {
      $or: [
        { $eq: [ { $size: "$l2VerIds" }, 0 ] },           // nothing in L2
        { $gt: [
            { $size: {
                $filter: {
                  input: "$l2VerIds",
                  as   : "v",
                  cond : { $ne: ["$$v", "$l1VerId"] }
                }
            } },
            0
        ] }                                               // at least one !=
      ]
    } }
  },

  /* 5️⃣  Prepare an easy-to-read result                        */
  {
    $project: {
      _id        : 0,
      proposalId : 1,
      planId     : 1,
      l1VerId    : 1,
      l2VerIds   : 1          // could be [] (row missing) or ["v004", …]
    }
  }
]);
