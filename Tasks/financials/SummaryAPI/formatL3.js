[
  {
    $project: {
      proposalId: 1,
      planId: 1,
      scenario: 1,
      years: 1,
      costs: {
        $map: {
          input: {
            $setUnion: ["$costs.src", []] // unique sources
          },
          as: "srcVal",
          in: {
            source: "$$srcVal",
            details: {
              $map: {
                input: {
                  $filter: {
                    input: "$costs",
                    as: "c",
                    cond: { $eq: ["$$c.src", "$$srcVal"] }
                  }
                },
                as: "c2",
                in: {
                  type: "$$c2.type",
                  total: "$$c2.fyCost"
                }
              }
            },
            total: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: "$costs",
                      as: "c3",
                      cond: { $eq: ["$$c3.src", "$$srcVal"] }
                    }
                  },
                  as: "c4",
                  in: "$$c4.fyCost"
                }
              }
            }
          }
        }
      }
    }
  }
]
