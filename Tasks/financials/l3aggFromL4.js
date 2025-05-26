db.l4CostDetails.aggregate([
  // Step 1: Extract years
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

  // Step 2: For each year, generate subdocument
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

  // Step 3: Flatten year-based docs
  { $unwind: "$transformed" },
  { $replaceRoot: { newRoot: "$transformed" } },

  // Step 4: Lookup refBU using pipeline
  {
    $lookup: {
      from: "refBU",
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

  // Step 5: Enrich costs and calculate metrics
  {
    $addFields: {
      costs: {
        $map: {
          input: "$costsRaw",
          as: "c",
          in: {
            $mergeObjects: [
              {
                type: "$$c.type",
                subType: "$$c.subType",
                locVen: "$$c.locVen",
                title: "$$c.title",
                snode: "$$c.snode",
                source: "$$c.source",
                fycost: "$$c.fycost",
                fyHC: "$$c.fyHC",
                mthCost: "$$c.mthCost",
                mthHC: "$$c.mthHC"
              },
              {
                bu: {
                  $getField: {
                    field: "$$c.snode",
                    input: {
                      $arrayToObject: {
                        $map: {
                          input: "$refBUData",
                          as: "b",
                          in: {
                            k: "$$b.snode",
                            v: "$$b.bu"
                          }
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

  // Step 6: Compute summary values
  {
    $addFields: {
      totalCost: {
        $sum: {
          $map: {
            input: "$costs",
            as: "c",
            in: "$$c.fycost"
          }
        }
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
          initialValue: Array(12).fill(0), // [0,0,...0]
          in: {
            $map: {
              input: { $range: [0, 12] },
              as: "idx",
              in: {
                $add: [
                  { $arrayElemAt: ["$$value", "$$idx"] },
                  { $arrayElemAt: ["$$this", "$$idx"] }
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
          initialValue: Array(12).fill(0),
          in: {
            $map: {
              input: { $range: [0, 12] },
              as: "idx",
              in: {
                $add: [
                  { $arrayElemAt: ["$$value", "$$idx"] },
                  { $arrayElemAt: ["$$this", "$$idx"] }
                ]
              }
            }
          }
        }
      }
    }
  },

  // Step 7: Cleanup
  {
    $project: {
      costsRaw: 0,
      snodes: 0,
      refBUData: 0
    }
  }

  // Optional final stage:
  // { $merge: { into: "l4CostDetailsFlattened", whenMatched: "replace" } }
])
