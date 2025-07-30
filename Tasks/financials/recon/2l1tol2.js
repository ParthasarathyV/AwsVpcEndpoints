db.lvlfinancialsSummary.aggregate([
  /* 1️⃣  Only the bits we need from L1 */
  {
    $project: {
      proposalId : 1,
      outlook    : { planId: 1, verId: 1 }
    }
  },

  /* 2️⃣  Lookup the matching L2 outlook rows
         --------------------------------------
         - join on proposalId
         - immediately filter to the same planId
         - project only outlook.verId (index-covered)                */
  {
    $lookup: {
      from: "lvl2FinancialsSummary",
      let : { pid: "$proposalId", plan: "$outlook.planId" },
      pipeline: [
        { $match: { $expr: { $eq: ["$proposalId", "$$pid"] } } },

        /* keep only those outlook elements whose planId matches */
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

        /* strip every element down to { verId } so the stage is
           fully covered by the index we just created             */
        { $project: { "outlook.verId": 1 } }
      ],
      as: "l2"
    }
  },

  /* 3️⃣  collapse the lookup array to one object                */
  { $set: { l2: { $arrayElemAt: ["$l2", 0] } } },

  /* 4️⃣  pull out the single L2 verId (or null if none)         */
  {
    $addFields: {
      l2VerId: { $arrayElemAt: ["$l2.outlook.verId", 0] }
    }
  },

  /* 5️⃣  Reconciliation flag: true when both verId values equal */
  {
    $addFields: {
      l1ToL2ReCon: { $eq: ["$outlook.verId", "$l2VerId"] }
    }
  },

  /* 6️⃣  Final shape                                            */
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
