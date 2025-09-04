{
    $lookup: {
      from: "lookupCollection", // replace with actual (e.g., refBU)
      let: {
        snodes: {
          $setUnion: [
            [],
            {
              $reduce: {
                input: "$years",
                initialValue: [],
                in: {
                  $setUnion: [
                    "$$value",
                    {
                      $map: {
                        input: { $ifNull: ["$$this.ccCost", []] },
                        as: "cc",
                        in: "$$cc.snode"
                      }
                    }
                  ]
                }
              }
            }
          ]
        }
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$type", "bu"] },
                { $in: ["$id", "$$snodes"] }
              ]
            }
          }
        },
        {
          $project: {
            _id: 0,
            id: 1,
            value: 1
          }
        }
      ],
      as: "snodeLookup"
    }
  },

  // 6. Add snodeValue to ccCost[]
  {
    $set: {
      years: {
        $map: {
          input: "$years",
          as: "yr",
          in: {
            $mergeObjects: [
              "$$yr",
              {
                ccCost: {
                  $map: {
                    input: { $ifNull: ["$$yr.ccCost", []] },
                    as: "cc",
                    in: {
                      $let: {
                        vars: {
                          match: {
                            $first: {
                              $filter: {
                                input: "$snodeLookup",
                                as: "ref",
                                cond: { $eq: ["$$ref.id", "$$cc.snode"] }
                              }
                            }
                          }
                        },
                        in: {
                          $mergeObjects: [
                            "$$cc",
                            { snodeValue: "$$match.value" }
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
