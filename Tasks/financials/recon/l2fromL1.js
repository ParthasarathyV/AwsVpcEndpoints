const EXPECT = [
  {
    proposalId: "532188bb-6530-4bbf-ad67-c64ebafc4dbc",
    outlook:        { planId: "8b42752a-8be3-415a-89fa-d8cfd9c70a18", verId: "2025-08-07-13-33-20-416000-EST" },
    budget:         { planId: "", verId: "" },
    live:           { planId: "8b42752a-8be3-415a-89fa-d8cfd9c70a19", verId: "2025-06-26-04-37-41-763000-EST" },
    pendingApproval:{ planId: "", verId: "" }
  }
  // ... more proposals
];

db.lvl2.aggregate([
  { $match: { proposalId: { $in: EXPECT.map(e => e.proposalId) } } },

  { $set: {
      exp: {
        $first: {
          $filter: {
            input: EXPECT,
            as: "ex",
            cond: { $eq: ["$$ex.proposalId", "$proposalId"] }
          }
        }
      },
      outArr:  { $ifNull: ["$outlook",        []] },
      budArr:  { $ifNull: ["$budget",         []] },
      liveArr: { $ifNull: ["$live",           []] },
      paArr:   { $ifNull: ["$pendingApproval",[]] }
  }},

  { $set: {
      outlookMismatch: {
        $cond: [
          { $or: [
            { $eq: ["$exp.outlook.planId", ""] },
            { $eq: ["$exp.outlook.verId",  ""] }
          ]},
          { $gt: [ { $size: "$outArr" }, 0 ] },
          { $not: [
              { $and: [
                { $gt: [ { $size: "$outArr" }, 0 ] },
                { $allElementsTrue: {
                    $map: {
                      input: "$outArr",
                      as: "e",
                      in: { $and: [
                        { $eq: ["$$e.planId", "$exp.outlook.planId"] },
                        { $eq: ["$$e.verId",  "$exp.outlook.verId"  ] }
                      ]}
                    }
                } }
              ] }
          ] }
        ]
      },

      budgetMismatch: {
        $cond: [
          { $or: [
            { $eq: ["$exp.budget.planId", ""] },
            { $eq: ["$exp.budget.verId",  ""] }
          ]},
          { $gt: [ { $size: "$budArr" }, 0 ] },
          { $not: [
              { $and: [
                { $gt: [ { $size: "$budArr" }, 0 ] },
                { $allElementsTrue: {
                    $map: {
                      input: "$budArr",
                      as: "e",
                      in: { $and: [
                        { $eq: ["$$e.planId", "$exp.budget.planId"] },
                        { $eq: ["$$e.verId",  "$exp.budget.verId"  ] }
                      ]}
                    }
                } }
              ] }
          ] }
        ]
      },

      liveMismatch: {
        $cond: [
          { $or: [
            { $eq: ["$exp.live.planId", ""] },
            { $eq: ["$exp.live.verId",  ""] }
          ]},
          { $gt: [ { $size: "$liveArr" }, 0 ] },
          { $not: [
              { $and: [
                { $gt: [ { $size: "$liveArr" }, 0 ] },
                { $allElementsTrue: {
                    $map: {
                      input: "$liveArr",
                      as: "e",
                      in: { $and: [
                        { $eq: ["$$e.planId", "$exp.live.planId"] },
                        { $eq: ["$$e.verId",  "$exp.live.verId"  ] }
                      ]}
                    }
                } }
              ] }
          ] }
        ]
      },

      pendingApprovalMismatch: {
        $cond: [
          { $or: [
            { $eq: ["$exp.pendingApproval.planId", ""] },
            { $eq: ["$exp.pendingApproval.verId",  ""] }
          ]},
          { $gt: [ { $size: "$paArr" }, 0 ] },
          { $not: [
              { $and: [
                { $gt: [ { $size: "$paArr" }, 0 ] },
                { $allElementsTrue: {
                    $map: {
                      input: "$paArr",
                      as: "e",
                      in: { $and: [
                        { $eq: ["$$e.planId", "$exp.pendingApproval.planId"] },
                        { $eq: ["$$e.verId",  "$exp.pendingApproval.verId"  ] }
                      ]}
                    }
                } }
              ] }
          ] }
        ]
      }
  }},

  { $project: {
      _id: 0,
      proposalId: 1,
      versionMismatch: {
        $or: [
          "$outlookMismatch",
          "$budgetMismatch",
          "$liveMismatch",
          "$pendingApprovalMismatch"
        ]
      }
  }}
], { allowDiskUse: true });
