db.lvlfinancialsSummary.aggregate([
  /* 1️⃣  L1: project only what we need */
  {
    $project: {
      proposalId: 1,
      outlook   : { planId: 1, verId: 1 }
    }
  },

  /* 2️⃣  L2 lookup
         - join on proposalId
         - immediately trim the outlook array to rows whose planId matches L1 */
  {
    $lookup: {
      from: "lvl2FinancialsSummary",
      let : { pid: "$proposalId", plan: "$outlook.planId" },
      pipeline: [
        { $match: { $expr: { $eq: ["$proposalId", "$$pid"] } } },
        { $project: {
            _id: 0,
            outlook: {
              $filter: {
                input: "$outlook",
                as   : "o",
                cond : { $eq: ["$$o.planId", "$$plan"] }
              }
            }
        }}
      ],
      as: "l2"
    }
  },

  /* 3️⃣  flatten the lookup result to a single object        */
  { $set: { l2: { $arrayElemAt: ["$l2", 0] } } },

  /* 4️⃣  pull out the (single) L2 verId                     */
  {
    $addFields: {
      l2VerId: {
        $let: {
          vars: { row: { $arrayElemAt: [ "$l2.outlook", 0 ] } },
          in  : "$$row.verId"
        }
      }
    }
  },

  /* 5️⃣  reconciliation – compare verIds only                */
  {
    $addFields: {
      l1ToL2ReCon: { $eq: ["$outlook.verId", "$l2VerId"] }
    }
  },

  /* 6️⃣  final shape                                         */
  {
    $project: {
      _id         : 0,
      proposalId  : 1,
      l1VerId     : "$outlook.verId",
      l2VerId     : 1,
      l1ToL2ReCon : 1
    }
  }
]);
