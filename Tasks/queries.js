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


db.collection.aggregate([
  {
    $group: {
      _id: "$year",
      monthCostSum: {
        $reduce: {
          input: "$monthCost",
          initialValue: Array.from({length: 12}, () => 0),
          in: {
            $map: {
              input: { $range: [0, { $size: "$$value" }] },
              as: "index",
              in: {
                $add: [
                  { $arrayElemAt: ["$$value", "$$index"] },
                  { $arrayElemAt: ["$monthCost", "$$index"] }
                ]
              }
            }
          }
        }
      },
      monthHcSum: {
        $reduce: {
          input: "$monthHc",
          initialValue: Array.from({length: 12}, () => 0),
          in: {
            $map: {
              input: { $range: [0, { $size: "$$value" }] },
              as: "index",
              in: {
                $add: [
                  { $arrayElemAt: ["$$value", "$$index"] },
                  { $arrayElemAt: ["$monthHc", "$$index"] }
                ]
              }
            }
          }
        }
      },
      docs: { $push: "$$ROOT" }
    }
  },
  {
    $project: {
      year: "$_id",
      monthCostSum: 1,
      monthHcSum: 1,
      F3: { $size: "$docs" }
    }
  }
])
