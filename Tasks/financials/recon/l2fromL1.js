// inputs
const PAGE = [
  /* array of proposalIds for this page */
  "532188bb-6530-4bbf-ad67-c64ebafc4dbc",
  // ...
];

db.lvl2.aggregate([
  { $match: { proposalId: { $in: PAGE } } },

  // bring expected planId/verId per scenario from L1
  {
    $lookup: {
      from: "lvl1",
      localField: "proposalId",
      foreignField: "proposalId",
      pipeline: [
        {
          $project: {
            _id: 0,
            proposalId: 1,
            "outlook.planId": 1, "outlook.verId": 1,
            "budget.planId": 1,  "budget.verId": 1,
            "live.planId": 1,    "live.verId": 1
          }
        }
      ],
      as: "l1"
    }
  },
  { $set: {
      exp: { $first: "$l1" },
      outlookArr: { $ifNull: ["$outlook", []] },
      budgetArr:  { $ifNull: ["$budget",  []] },
      liveArr:    { $ifNull: ["$live",    []] }
  }},

  // for each scenario:
  // - if L1 has empty planId or verId => L2 must have NO elements (size 0)
  // - else => every element must match that planId & verId, and array must be non-empty
  { $set: {
      outlookMismatch: {
        $cond: [
          { $or: [
            { $eq: ["$exp.outlook.planId", ""] },
            { $eq: ["$exp.outlook.verId",  ""] }
          ]},
          { $gt: [ { $size: "$outlookArr" }, 0 ] },
          { $not: [
              { $and: [
                { $gt: [ { $size: "$outlookArr" }, 0 ] },
                {
                  $allElementsTrue: {
                    $map: {
                      input: "$outlookArr",
                      as: "e",
                      in: { $and: [
                        { $eq: ["$$e.planId", "$exp.outlook.planId"] },
                        { $eq: ["$$e.verId",  "$exp.outlook.verId"  ] }
                      ]}
                    }
                  }
                }
              ]}
            ]
          }
        ]
      },
      budgetMismatch: {
        $cond: [
          { $or: [
            { $eq: ["$exp.budget.planId", ""] },
            { $eq: ["$exp.budget.verId",  ""] }
          ]},
          { $gt: [ { $size: "$budgetArr" }, 0 ] },
          { $not: [
              { $and: [
                { $gt: [ { $size: "$budgetArr" }, 0 ] },
                {
                  $allElementsTrue: {
                    $map: {
                      input: "$budgetArr",
                      as: "e",
                      in: { $and: [
                        { $eq: ["$$e.planId", "$exp.budget.planId"] },
                        { $eq: ["$$e.verId",  "$exp.budget.verId"  ] }
                      ]}
                    }
                  }
                }
              ]}
            ]
          }
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
                {
                  $allElementsTrue: {
                    $map: {
                      input: "$liveArr",
                      as: "e",
                      in: { $and: [
                        { $eq: ["$$e.planId", "$exp.live.planId"] },
                        { $eq: ["$$e.verId",  "$exp.live.verId"  ] }
                      ]}
                    }
                  }
                }
              ]}
            ]
          }
        ]
      }
  }},

  { $project: {
      _id: 0,
      proposalId: 1,
      versionMismatch: {
        $or: ["$outlookMismatch", "$budgetMismatch", "$liveMismatch"]
      }
  }}
], { allowDiskUse: true });
