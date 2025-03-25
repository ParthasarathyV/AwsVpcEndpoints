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



// Required indexes for optimization:
// db.yourCollection.createIndex({ longId: 1 })
// db.appMappings.createIndex({ ipLongId: 1, scenario: 1 })
// db.financialsLevel3.createIndex({ ipLongId: 1, scenario: 1 })

db.yourCollection.aggregate([
    // 1) Initial match to filter documents early
    {
      $match: {
        longId: { $exists: true }
      }
    },

    // 2) Lookup from "appMappings" with optimized matching
    {
      $lookup: {
        from: "appMappings",
        let: { ipLongIdF1: "$longId" },
        pipeline: [
          {
            $match: {
              $and: [
                { scenario: "outlook" }, // Static condition outside $expr
                { $expr: { $eq: ["$ipLongId", "$$ipLongIdF1"] } }
              ]
            }
          },
          {
            $project: {
              _id: 1,
              scenario: 1,
              months: 1
            }
          }
        ],
        as: "matched"
      }
    },

    // 3) Filter out documents with no matches
    {
      $match: {
        "matched": { $exists: true, $ne: [] }
      }
    },

    // 4) Unwind "matched" with null check
    {
      $unwind: {
        path: "$matched",
        preserveNullAndEmptyArrays: false
      }
    },

    // 5) Lookup from "financialsLevel3" with optimized matching
    {
      $lookup: {
        from: "financialsLevel3",
        let: {
          ipLongIdF3: "$longId",
          scenarioF3: "$matched.scenario"
        },
        pipeline: [
          {
            $match: {
              $and: [
                { scenario: "outlook" },
                { $expr: { $eq: ["$ipLongId", "$$ipLongIdF3"] } }
              ]
            }
          },
          {
            $project: {
              year: 1,
              monthCost: 1,
              monthHc: 1
            }
          }
        ],
        as: "F3"
      }
    },

    // 6) Filter out documents with no F3 matches
    {
      $match: {
        "F3": { $exists: true, $ne: [] }
      }
    },

    // 7) Unwind "F3"
    {
      $unwind: {
        path: "$F3",
        preserveNullAndEmptyArrays: false
      }
    },

    // 8) Group with optimized fields
    {
      $group: {
        _id: {
          ipLongId: "$longId",
          year: "$F3.year",
          idTrack: "$matched._id",
          appSplitMonths: "$matched.months"
        },
        allMonthCosts: { $push: "$F3.monthCost" },
        allMonthHC: { $push: "$F3.monthHc" }
      }
    },

    // 9) Optimize array operations for monthCostSum & monthHcSum
    {
      $addFields: {
        monthCostSum: {
          $map: {
            input: { $zip: { inputs: "$allMonthCosts" } },
            as: "month",
            in: { $sum: "$$month" }
          }
        },
        monthHcSum: {
          $map: {
            input: { $zip: { inputs: "$allMonthHC" } },
            as: "month",
            in: { $sum: "$$month" }
          }
        }
      }
    },

    // 10) Clean up intermediate arrays
    {
      $project: {
        allMonthCosts: 0,
        allMonthHC: 0
      }
    },

    // 11) Add appSplitMonthsCost with better structure
    {
      $addFields: {
        appSplitMonthsCost: {
          $map: {
            input: "$_id.appSplitMonths",
            as: "monthData",
            in: {
              $mergeObjects: [
                "$$monthData",
                {
                  application: {
                    $map: {
                      input: "$$monthData.application",
                      as: "app",
                      in: {
                        $mergeObjects: [
                          "$$app",
                          {
                            app_cost: {
                              $multiply: [
                                "$$app.app_percentage",
                                { $arrayElemAt: ["$monthCostSum", { $indexOfArray: ["$_id.appSplitMonths", "$$monthData"] }] }
                              ]
                            },
                            cap_cost: {
                              $multiply: [
                                "$$app.is_cap_percent",
                                { $arrayElemAt: ["$monthCostSum", { $indexOfArray: ["$_id.appSplitMonths", "$$monthData"] }] }
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
    },

    // 12) Final projection to clean up output
    {
      $project: {
        _id: 0,
        ipLongId: "$_id.ipLongId",
        year: "$_id.year",
        monthCostSum: 1,
        monthHcSum: 1,
        appSplitMonthsCost: 1
      }
    },
]);



// Required indexes for optimization:
// db.yourCollection.createIndex({ longId: 1 })
// db.appMappings.createIndex({ ipLongId: 1, scenario: 1 })
// db.financialsLevel3.createIndex({ ipLongId: 1, scenario: 1 })

db.yourCollection.aggregate([
    // 1) Initial match to filter documents early
    {
      $match: {
        longId: { $exists: true }
      }
    },

    // 2) Lookup from "appMappings" with optimized matching
    {
      $lookup: {
        from: "appMappings",
        let: { ipLongIdF1: "$longId" },
        pipeline: [
          {
            $match: {
              $and: [
                { scenario: "outlook" }, // Static condition outside $expr
                { $expr: { $eq: ["$ipLongId", "$$ipLongIdF1"] } }
              ]
            }
          },
          {
            $project: {
              _id: 1,
              scenario: 1,
              months: 1
            }
          }
        ],
        as: "matched"
      }
    },

    // 3) Filter out documents with no matches
    {
      $match: {
        "matched": { $exists: true, $ne: [] }
      }
    },

    // 4) Unwind "matched" with null check
    {
      $unwind: {
        path: "$matched",
        preserveNullAndEmptyArrays: false
      }
    },

    // 5) Lookup from "financialsLevel3" with optimized matching
    {
      $lookup: {
        from: "financialsLevel3",
        let: {
          ipLongIdF3: "$longId",
          scenarioF3: "$matched.scenario"
        },
        pipeline: [
          {
            $match: {
              $and: [
                { scenario: "outlook" },
                { $expr: { $eq: ["$ipLongId", "$$ipLongIdF3"] } }
              ]
            }
          },
          {
            $project: {
              year: 1,
              monthCost: 1,
              monthHc: 1
            }
          }
        ],
        as: "F3"
      }
    },

    // 6) Filter out documents with no F3 matches
    {
      $match: {
        "F3": { $exists: true, $ne: [] }
      }
    },

    // 7) Unwind "F3"
    {
      $unwind: {
        path: "$F3",
        preserveNullAndEmptyArrays: false
      }
    },

    // 8) Group with optimized fields
    {
      $group: {
        _id: {
          ipLongId: "$longId",
          year: "$F3.year",
          idTrack: "$matched._id",
          appSplitMonths: "$matched.months"
        },
        allMonthCosts: { $push: "$F3.monthCost" },
        allMonthHC: { $push: "$F3.monthHc" }
      }
    },

    // 9) Calculate sums for monthCostSum & monthHcSum
    {
      $addFields: {
        monthCostSum: {
          $reduce: {
            input: "$allMonthCosts",
            initialValue: [],
            in: {
              $map: {
                input: { $range: [0, 12] },
                as: "i",
                in: {
                  $add: [
                    { $ifNull: [{ $arrayElemAt: ["$$value", "$$i"] }, 0] },
                    { $ifNull: [{ $arrayElemAt: ["$$this", "$$i"] }, 0] }
                  ]
                }
              }
            }
          }
        },
        monthHcSum: {
          $reduce: {
            input: "$allMonthHC",
            initialValue: [],
            in: {
              $map: {
                input: { $range: [0, 12] },
                as: "i",
                in: {
                  $add: [
                    { $ifNull: [{ $arrayElemAt: ["$$value", "$$i"] }, 0] },
                    { $ifNull: [{ $arrayElemAt: ["$$this", "$$i"] }, 0] }
                  ]
                }
              }
            }
          }
        }
      }
    },

    // 10) Clean up intermediate arrays
    {
      $project: {
        allMonthCosts: 0,
        allMonthHC: 0
      }
    },

    // 11) Add appSplitMonthsCost with better structure
    {
      $addFields: {
        appSplitMonthsCost: {
          $map: {
            input: "$_id.appSplitMonths",
            as: "monthData",
            in: {
              $mergeObjects: [
                "$$monthData",
                {
                  application: {
                    $map: {
                      input: "$$monthData.application",
                      as: "app",
                      in: {
                        $mergeObjects: [
                          "$$app",
                          {
                            app_cost: {
                              $multiply: [
                                "$$app.app_percentage",
                                { $arrayElemAt: ["$monthCostSum", { $indexOfArray: ["$_id.appSplitMonths", "$$monthData"] }] }
                              ]
                            },
                            cap_cost: {
                              $multiply: [
                                "$$app.is_cap_percent",
                                { $arrayElemAt: ["$monthCostSum", { $indexOfArray: ["$_id.appSplitMonths", "$$monthData"] }] }
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
    },

    // 12) Final projection to clean up output
    {
      $project: {
        _id: 0,
        ipLongId: "$_id.ipLongId",
        year: "$_id.year",
        monthCostSum: 1,
        monthHcSum: 1,
        appSplitMonthsCost: 1
      }
    },
]);
