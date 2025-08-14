db.lvl2.aggregate([
  { $match: { proposalId: "532188bb-6530-4bbf-ad67-c64ebafc4dbc" } },

  {
    $project: {
      _id: 0,

      // ---- outlook must match these exactly on every array element ----
      outlookMismatch: {
        $not: [
          {
            $allElementsTrue: {
              $map: {
                input: { $ifNull: ["$outlook", []] },
                as: "e",
                in: {
                  $and: [
                    { $eq: ["$$e.planId", "8b42752a-8be3-415a-89fa-d8cfd9c70a18"] },
                    { $eq: ["$$e.verId",  "2025-08-07-13-33-20-416000-EST"] }
                  ]
                }
              }
            }
          }
        ]
      },

      // ---- budget expected empty -> L2 must have no elements ----
      budgetMismatch: {
        $gt: [ { $size: { $ifNull: ["$budget", []] } }, 0 ]
      },

      // ---- live must match these exactly on every array element ----
      liveMismatch: {
        $not: [
          {
            $allElementsTrue: {
              $map: {
                input: { $ifNull: ["$live", []] },
                as: "e",
                in: {
                  $and: [
                    { $eq: ["$$e.planId", "8b42752a-8be3-415a-89fa-d8cfd9c70a19"] },
                    { $eq: ["$$e.verId",  "2025-06-26-04-37-41-763000-EST"] }
                  ]
                }
              }
            }
          }
        ]
      },

      // ---- pendingApproval expected empty -> L2 must have no elements ----
      pAMismatch: {
        $gt: [ { $size: { $ifNull: ["$pendingApproval", []] } }, 0 ]
      }
    }
  },

  // final true/false
  {
    $project: {
      mismatch: {
        $or: ["$outlookMismatch", "$budgetMismatch", "$liveMismatch", "$pAMismatch"]
      }
    }
  }
]);
