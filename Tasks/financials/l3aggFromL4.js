db.l4CostDetails.aggregate([

  // Stage 1: Project only required fields
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

  // Stage 4: Flatten the per-year docs
  { $unwind: "$transformed" },
  { $replaceRoot: { newRoot: "$transformed" } },

  // Stage 5: Lookup matching refBU data from TestRefBU
  {
    $lookup: {
      from: "TestRefBU",  // ✅ Using updated collection name
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

  // Stage 6: Enrich each cost with corresponding bu using $filter
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

  // Stage 7: Compute totals
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
          initialValue: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
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
          initialValue: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
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

  // Stage 8: Cleanup
  {
    $project: {
      costsRaw: 0,
      snodes: 0,
      refBUData: 0,
      years: 0
    }
  }

  // Optional Final Stage:
  // { $merge: { into: "l4CostDetailsFlattened", whenMatched: "replace" } }
])
