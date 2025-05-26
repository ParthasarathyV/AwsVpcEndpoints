db.l4CostDetails.aggregate([
  // Step 1: Get all unique years from the costs array
  {
    $project: {
      ipLongId: 1,
      planId: 1,
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
      },
      costs: 1
    }
  },

  // Step 2: Map each year into its own document with filtered cost array
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
                  type: "$$c.type",
                  subType: "$$c.subType",
                  title: "$$c.title",
                  snode: "$$c.snode",
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

  // Step 3: Flatten the transformed array into documents
  { $unwind: "$transformed" },
  { $replaceRoot: { newRoot: "$transformed" } }
])
