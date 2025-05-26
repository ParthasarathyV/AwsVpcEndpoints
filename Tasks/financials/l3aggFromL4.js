db.l4CostDetails.aggregate([

  // Stage 1: Project only needed fields
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
            fycost: "$$c.fycost",
            fyHC: "$$c.fyHC",
            mthCost: "$$c.mthCost",
            mthHC: "$$c.mthHC"
          }
        }
      }
    }
  },

  // Stage 2: Extract all unique years
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

  // Stage 3: Transform into one doc per year
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

  // Stage 4: Flatten transformed array into individual docs
  { $unwind: "$transformed" },
  { $replaceRoot: { newRoot: "$transformed" } },

  // Stage 5: Lookup refBU using snodes[]
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

  // Stage 6: Merge refBU into each cost using $getField
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

  // Stage 7: Compute totalCost, mthCost[], mthHC[]
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
          initialValue: Array(12).fill(0),
          in: {
            $map: {
              input: { $range: [0, 12] },
              as: "i",
              in: {
                $add: [
                  { $arrayElemAt: ["$$value", "$$i"] },
                  { $arrayElemAt: ["$$this", "$$i"] }
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
              as: "i",
              in: {
                $add: [
                  { $arrayElemAt: ["$$value", "$$i"] },
                  { $arrayElemAt: ["$$this", "$$i"] }
                ]
              }
            }
          }
        }
      }
    }
  },

  // Stage 8: Final cleanup
  {
    $project: {
      costsRaw: 0,
      snodes: 0,
      refBUData: 0,
      years: 0
    }
  }

  // Optional Stage 9: Save result to new collection
  // { $merge: { into: "l4CostDetailsFlattened", whenMatched: "replace" } }
])
