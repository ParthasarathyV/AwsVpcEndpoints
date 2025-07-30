/* index */
db.lvl2FinancialsSummary.createIndex(
  { proposalId: 1, "outlook.planId": 1, "outlook.verId": 1 },
  { name: "proposallId_1_outlook.planId_1_outlook.verId_1" }
);

/* pipeline */
db.lvlfinancialsSummary.aggregate([
  { $project: { proposalId: 1, l1PlanId: "$outlook.planId", l1VerId: "$outlook.verId" } },
  {
    $lookup: {
      from: "lvl2FinancialsSummary",
      let: { pid: "$proposalId", plan: "$l1PlanId" },
      pipeline: [
        { $match: { $expr: { $eq: ["$proposalId", "$$pid"] } } },
        { $project: { _id: 0, outlook: { $filter: { input: "$outlook", as: "o", cond: { $eq: ["$$o.planId", "$$plan"] } } } } },
        { $project: { "outlook.verId": 1 } }
      ],
      as: "l2"
    }
  },
  { $set: { l2: { $arrayElemAt: ["$l2", 0] } } },
  { $addFields: { l2VerIds: { $setUnion: ["$l2.outlook.verId", []] } } },
  {
    $addFields: {
      isMatch: {
        $or: [
          { $and: [ { $eq: ["$l1VerId", null] }, { $or: [ { $eq: [ { $size: "$l2VerIds" }, 0 ] }, { $in: [ null, "$l2VerIds" ] } ] } ] },
          { $and: [ { $ne: ["$l1VerId", null] }, { $in: ["$l1VerId", "$l2VerIds"] } ] }
        ]
      }
    }
  },
  { $match: { isMatch: false } },
  { $project: { _id: 0, proposalId: 1, l1VerId: 1, l2VerIds: 1 } }
]);
