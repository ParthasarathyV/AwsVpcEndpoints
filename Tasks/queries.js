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



{
  $addFields: {
    appSplitMonths: {
      $map: {
        input: { $range: [0, { $size: "$appSplitMonths" }] },
        as: "i",
        in: {
          $let: {
            vars: {
              monthData: { $arrayElemAt: ["$appSplitMonths", "$$i"] }
            },
            in: {
              // Merge the original fields of monthData (like 'month' or others)
              // and overwrite the 'applications' array with a new version that has the 'cost' field
              $mergeObjects: [
                "$$monthData",
                {
                  applications: {
                    $map: {
                      input: "$$monthData.applications",
                      as: "app",
                      in: {
                        $mergeObjects: [
                          "$$app",
                          {
                            cost: {
                              $multiply: [
                                // The app's percentage
                                "$$app.app_percentage",
                                // The monthCostSum value at index i
                                { $arrayElemAt: ["$monthCostSum", "$$i"] }
                              ]
                            }
                          }
                        ]
                      }
                    }
                  }
                }
              ]
            }
          }
        }
      }
    }
  }
}
