db.l4CostDetails.aggregate([
  // STEP 1: Extract all years and keep costs
  {
    $project: {
      ipLongId: 1,
      planId: 1,
      costs: 1,
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

  // STEP 2: Create 1 document per year
  {
    $project: {
      transformed: {
        $map: {
          input: "$years",
          as: "yr",
          in: {
            ipLongId: "$ipLongId",
            planId: "$planId",
            year: "$$yr",
            costs: {
              $map: {
                input: {
                  $filter: {
                    input: "$costs",
                    as: "c",
                    cond: { $eq: ["$$c.year", "$$yr"] }
                  }
                },
                as: "c",
                in: {
                  snode: "$$c.snode",
                  type: "$$c.type",
                  subType: "$$c.subType",
                  title: "$$c.title",
                  source: "$$c.source",
                  fycost: "$$c.fycost",
                  fyHC: "$$c.fyHC",
                  mthCost: "$$c.mthCost"
                }
              }
            }
          }
        }
      }
    }
  },

  // STEP 3: Flatten the array of year-wise documents
  { $unwind: "$transformed" },
  { $replaceRoot: { newRoot: "$transformed" } },

  // STEP 4: Build snode list from costs
  {
    $addFields: {
      snodes: {
        $setUnion: [
          {
            $map: {
              input: "$costs",
              as: "c",
              in: "$$c.snode"
            }
          }
        ]
      }
    }
  },

  // STEP 5: Lookup from refBU using snodes[]
  {
    $lookup: {
      from: "refBU",
      localField: "snodes",
      foreignField: "SNODE",
      as: "buObjects"
    }
  },

  // STEP 6: Enrich each cost with corresponding bu object
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
                  $first: {
                    $filter: {
                      input: "$buObjects",
                      as: "b",
                      cond: { $eq: ["$$b.SNODE", "$$c.snode"] }
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

  // Optional: Remove snodes and buObjects arrays
  {
    $project: {
      snodes: 0,
      buObjects: 0
    }
  }

  // You can add $merge to write to new collection if needed
])
