db.l4CostDetails.aggregate([

  // Stage 1: Clean and reduce fields in costs[]
  {
    $addFields: {
      costs: {
        $map: {
          input: "$costs",
          as: "c",
          in: {
            year: "$$c.year",
            snode: "$$c.snode",
            type: "$$c.type",
            subType: "$$c.subType",
            title: "$$c.title",
            locVen: "$$c.locVen",
            source: "$$c.source",
            fycost: { $round: [{ $ifNull: ["$$c.fycost", 0] }, 6] },
            fyHC: { $round: [{ $ifNull: ["$$c.fyHC", 0] }, 6] },
            mthCost: {
              $map: {
                input: "$$c.mthCost",
                as: "v",
                in: { $round: [{ $ifNull: ["$$v", 0] }, 6] }
              }
            },
            mthHC: {
              $map: {
                input: "$$c.mthHC",
                as: "v",
                in: { $round: [{ $ifNull: ["$$v", 0] }, 6] }
              }
            }
          }
        }
      }
    }
  },

  // Stage 2: $lookup using root-level snodes array
  {
    $lookup: {
      from: "TestRefBU",
      let: { snodeList: "$snodes" },
      pipeline: [
        {
          $match: {
            $expr: { $in: ["$snode", "$$snodeList"] }
          }
        },
        {
          $project: {
            _id: 0,
            snode: 1,
            bu: 1
          }
        }
      ],
      as: "refBUData"
    }
  },

  // Stage 3: Enrich each cost with BU
  {
    $addFields: {
      costs: {
        $map: {
          input: "$costs",
          as: "c",
          in: {
            $mergeObjects: [
              "$$c",
              {
                bu: {
                  $let: {
                    vars: {
                      matched: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: "$refBUData",
                              as: "ref",
                              cond: { $eq: ["$$ref.snode", "$$c.snode"] }
                            }
                          },
                          0
                        ]
                      }
                    },
                    in: "$$matched.bu"
                  }
                }
              }
            ]
          }
        }
      }
    }
  },

  // Stage 4: Create years array from enriched costs
  {
    $addFields: {
      years: {
        $setUnion: [
          {
            $map: {
              input: "$costs",
              as: "c",
              in: "$$c.year"
            }
          }
        ]
      }
    }
  },

  // Stage 5: Create one document per year inline with full metrics
  {
    $addFields: {
      results: {
        $map: {
          input: "$years",
          as: "yr",
          in: {
            ipLongId: "$ipLongId",
            planId: "$planId",
            scenario: "$scenario",
            year: "$$yr",
            costs: {
              $filter: {
                input: "$costs",
                as: "c",
                cond: { $eq: ["$$c.year", "$$yr"] }
              }
            }
          }
        }
      }
    }
  },

  // Stage 6: Compute year-wise totals (mthCost[], mthHC[], totalCost)
  {
    $addFields: {
      results: {
        $map: {
          input: "$results",
          as: "r",
          in: {
            $mergeObjects: [
              "$$r",
              {
                totalCost: {
                  $round: [
                    {
                      $sum: {
                        $map: {
                          input: "$$r.costs",
                          as: "c",
                          in: { $ifNull: ["$$c.fycost", 0] }
                        }
                      },
                    },
                    6
                  ]
                },
                mthCost: {
                  $reduce: {
                    input: {
                      $map: {
                        input: "$$r.costs",
                        as: "c",
                        in: "$$c.mthCost"
                      }
                    },
                    initialValue: [0,0,0,0,0,0,0,0,0,0,0,0],
                    in: {
                      $map: {
                        input: { $range: [0, 12] },
                        as: "i",
                        in: {
                          $round: [
                            {
                              $add: [
                                { $ifNull: [{ $arrayElemAt: ["$$value", "$$i"] }, 0] },
                                { $ifNull: [{ $arrayElemAt: ["$$this", "$$i"] }, 0] }
                              ]
                            },
                            6
                          ]
                        }
                      }
                    }
                  }
                },
                mthHC: {
                  $reduce: {
                    input: {
                      $map: {
                        input: "$$r.costs",
                        as: "c",
                        in: "$$c.mthHC"
                      }
                    },
                    initialValue: [0,0,0,0,0,0,0,0,0,0,0,0],
                    in: {
                      $map: {
                        input: { $range: [0, 12] },
                        as: "i",
                        in: {
                          $round: [
                            {
                              $add: [
                                { $ifNull: [{ $arrayElemAt: ["$$value", "$$i"] }, 0] },
                                { $ifNull: [{ $arrayElemAt: ["$$this", "$$i"] }, 0] }
                              ]
                            },
                            6
                          ]
                        }
                      }
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

  // Stage 7: Flatten results into top-level docs
  { $unwind: "$results" },
  { $replaceRoot: { newRoot: "$results" } }

]
