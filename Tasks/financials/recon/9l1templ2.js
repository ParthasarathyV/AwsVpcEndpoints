/* 1️⃣  the index you already created keeps working */
db.tmpLvl2FinancialsSummary.createIndex(
  { proposalId: 1, "outlook.verId": 1, "outlook.year": 1 },
  { name: "idx_proposal_ver_year", unique: true }   // already READY
);

/* 2️⃣  run this aggregation from lvlfinancialsSummary */
db.lvlfinancialsSummary.aggregate([
  { $project: { proposalId: 1, l1VerId: "$outlook.verId" } },

  { $lookup: {
      from: "tmpLvl2FinancialsSummary",
      let : { pid: "$proposalId", ver: "$l1VerId" },
      pipeline: [
        { $match: {                                   // <- uses BOTH index keys
            $expr: {
              $and: [
                { $eq: ["$proposalId", "$$pid"] },
                { $eq: ["$outlook.verId", "$$ver"] }
              ]
            }
        }},
        { $project: { _id: 0 } }                      // nothing else needed
      ],
      as: "l2Match"
  }},

  /* L2Match is empty when verId NOT found -> mismatch          */
  { $match: { $expr: { $eq: [ { $size: "$l2Match" }, 0 ] } } },

  { $project: { _id: 0, proposalId: 1, l1VerId: 1 } }
]);
