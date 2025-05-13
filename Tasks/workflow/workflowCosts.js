db.collection.aggregate([
  {
    $set: {
      costs: {
        $let: {
          vars: {
            grouped: {
              $map: {
                input: {
                  $setUnion: [
                    { $map: { input: "$costs", as: "c", in: "$$c.source" } }
                  ]
                },
                as: "src",
                in: {
                  $let: {
                    vars: {
                      filtered: {
                        $filter: {
                          input: "$costs",
                          as: "c",
                          cond: { $eq: ["$$c.source", "$$src"] }
                        }
                      }
                    },
                    in: {
                      source: "$$src",
                      total: {
                        $sum: {
                          $map: {
                            input: "$$filtered",
                            as: "f",
                            in: { $ifNull: ["$$f.fycost", 0] }
                          }
                        }
                      },
                      details: [
                        {
                          type: "Labor",
                          total: {
                            $sum: {
                              $map: {
                                input: {
                                  $filter: {
                                    input: "$$filtered",
                                    as: "f",
                                    cond: { $eq: ["$$f.type", "Labor"] }
                                  }
                                },
                                as: "f",
                                in: { $ifNull: ["$$f.fycost", 0] }
                              }
                            }
                          }
                        },
                        {
                          type: "Non Labor",
                          total: {
                            $sum: {
                              $map: {
                                input: {
                                  $filter: {
                                    input: "$$filtered",
                                    as: "f",
                                    cond: { $eq: ["$$f.type", "Non Labor"] }
                                  }
                                },
                                as: "f",
                                in: { $ifNull: ["$$f.fycost", 0] }
                              }
                            }
                          }
                        },
                        {
                          type: "Tech",
                          total: {
                            $sum: {
                              $map: {
                                input: {
                                  $filter: {
                                    input: "$$filtered",
                                    as: "f",
                                    cond: { $eq: ["$$f.type", "Tech"] }
                                  }
                                },
                                as: "f",
                                in: { $ifNull: ["$$f.fycost", 0] }
                              }
                            }
                          }
                        }
                      ]
                    }
                  }
                }
              }
            }
          },
          in: "$$grouped"
        }
      }
    }
  }
]);
