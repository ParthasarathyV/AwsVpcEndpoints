db.ipBillingKeys.aggregate([
  {
    $lookup: {
      from: "lvl1FinancialsSummary",
      let: {
        pId: "$proposalId",
        scn: "$scenario"
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $eq: ["$proposalId", "$$pId"]
            }
          }
        },
        {
          $project: {
            scenarioYears: {
              $getField: {
                field: "years",
                input: { $getField: { field: "$$scn", input: "$$ROOT" } }
              }
            }
          }
        }
      ],
      as: "fin"
    }
  },
  {
    $set: {
      scenarioYears: {
        $ifNull: [{ $arrayElemAt: ["$fin.scenarioYears", 0] }, []]
      }
    }
  },
  {
    $set: {
      years: {
        $map: {
          input: "$years",
          as: "y",
          in: {
            $mergeObjects: [
              "$$y",
              {
                fyCost: {
                  $let: {
                    vars: {
                      matched: {
                        $first: {
                          $filter: {
                            input: "$scenarioYears",
                            as: "f",
                            cond: { $eq: ["$$f.year", "$$y.year"] }
                          }
                        }
                      }
                    },
                    in: "$$matched.fyCost"
                  }
                }
              }
            ]
          }
        }
      }
    }
  },
  {
    $unset: ["fin", "scenarioYears"]
  }
])
