db.financialLevel3.updateMany(
  { _id: ObjectId("67d43ab92ac3b0ada8cb47cc") }, // Filter for specific _id
  [
    {
      $set: {
        mnth_cost: {
          $map: {
            input: { $split: ["$mnth_cost", "|"] },
            as: "value",
            in: { $toDouble: "$$value" }
          }
        },
        mnth_hc: {
          $map: {
            input: { $split: ["$mnth_hc", "|"] },
            as: "value",
            in: { $toDouble: "$$value" }
          }
        }
      }
    }
  ]
)
