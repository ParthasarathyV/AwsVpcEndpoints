db.lvlfinancialsSummary.aggregate([
  { $project: { proposalId: 1, l1VerId: "$outlook.verId" } },
  { $lookup: {
      from: "lvl2FinancialsSummary",
      localField: "proposalId",
      foreignField: "proposalId",
      pipeline: [
        { $project: { _id: 0, "outlook.verId": 1 } },
        { $hint: "idx_proposal_ver" }
      ],
      as: "l2"
  }},
  { $set: { l2: { $arrayElemAt: ["$l2", 0] } } },
  { $addFields: {
      isMatch: { $in: [ "$l1VerId", { $ifNull: [ "$l2.outlook.verId", [] ] } ] }
  }},
  { $match: { isMatch: false } },
  { $project: { _id: 0, proposalId: 1, l1VerId: 1 } }
]);
