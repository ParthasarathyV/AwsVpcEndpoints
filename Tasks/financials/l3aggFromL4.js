db.l4CostDetails.aggregate([

  // Stage 1: Project only required fields and round numerics early
  {
    $project: {
      ipLongId: 1,
      planId: 1,
      scenario: 1,
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
            fycost: { $round: ["$$c.fycost", 6] },
            fyHC: { $round: ["$$c.fyHC", 6] },
            mthCost: {
              $map: {
                input: "$$c.mthCost",
                as: "m",
                in: { $round: [{ $ifNull: ["$$m", 0] }, 6] }
              }
            },
            mthHC: {
              $map: {
                input: "$$c.mthHC",
                as: "m",
                in: { $round: [{ $ifNull: ["$$m", 0] }, 6] }
              }
            }
          }
        }
      }
    }
  },

  // Stage 2: Extract distinct years
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

  // Stage 3: Build transformed array per year
  {
    $addFields: {
      transformed: {
        $map: {
          input: "$years",
          as: "yr",
          in: {
            ipLongId: "$ipLongId",
            planId: "$planId",
            scenario: "$scenario",
            year: "$$yr",
            costsRaw: {
              $filter: {
                input: "$costs",
                as: "c",
                cond: { $eq: ["$$c.year", "$$yr"] }
              }
            },
            snodes: {
              $setUnion: [
                {
                  $map: {
                    input: {
                      $filter: {
                        input: "$costs",
                        as: "c",
                        cond: { $eq: ["$$c.year", "$$yr"] }
                      }
                    },
                    as: "c",
                    in: "$$c.snode"
                  }
                }
              ]
            }
          }
        }
      }
    }
  },

  // Stage 4: Flatten per-year documents
  { $unwind: "$transformed" },
  { $replaceRoot: { newRoot: "$transformed" } },

  // Stage 5: Lookup TestRefBU using snodes
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

  // Stage 6: Enrich each cost entry with matched BU
  {
    $addFields: {
      costs: {
        $map: {
          input: "$costsRaw",
          as: "c",
          in: {
            $mergeObjects: [
              "$$c",
              {
                bu: {
                  $let: {
                    vars: {
                      matchedBU: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: "$refBUData",
                              as: "b",
                              cond: { $eq: ["$$b.snode", "$$c.snode"] }
                            }
                          },
                          0
                        ]
                      }
                    },
                    in: "$$matchedBU.bu"
                  }
                }
              }
            ]
          }
        }
      }
    }
  },

  // Stage 7: Compute totalCost, mthCost[], mthHC[] with rounding and null safety
  {
    $addFields: {
      totalCost: {
        $round: [
          {
            $sum: {
              $map: {
                input: "$costs",
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
              input: "$costs",
              as: "c",
              in: "$$c.mthCost"
            }
          },
          initialValue: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
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
              input: "$costs",
              as: "c",
              in: "$$c.mthHC"
            }
          },
          initialValue: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
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
  },

  // Stage 8: Cleanup
  {
    $project: {
      costsRaw: 0,
      snodes: 0,
      refBUData: 0,
      years: 0
    }
  }

  // Optional: Save to collection
  // { $merge: { into: "l4CostDetailsFlattened", whenMatched: "replace" } }
])
