[
  {
    $match: {
      proposalId: "8710b8b1-4d07-48ba-98b6-ce731888d37e",
      planId: "8263cc2d-e38d-46e5-a305-620460857f29",
      year: 2024
    }
  },
  {
    $project: {
      proposalId: 1,
      planId: 1,
      scenario: 1,
      years: 1,
      costs: {
        $map: {
          input: { $setUnion: ["$costs.src", []] }, // unique sources
          as: "srcVal",
          in: {
            source: "$$srcVal",
            details: {
              $map: {
                input: { $setUnion: ["$costs.type", []] }, // unique types
                as: "typeVal",
                in: {
                  type: "$$typeVal",
                  total: {
                    $sum: {
                      $map: {
                        input: {
                          $filter: {
                            input: "$costs",
                            as: "c",
                            cond: {
                              $and: [
                                { $eq: ["$$c.src", "$$srcVal"] },
                                { $eq: ["$$c.type", "$$typeVal"] }
                              ]
                            }
                          }
                        },
                        as: "c2",
                        in: "$$c2.fyCost"
                      }
                    }
                  }
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
