{
  $set: {
    taxonomyAllocations: {
      verId: "$taxDoc.verId",
      taxonomies: {
        $filter: {
          input: {
            $map: {
              input: "$taxDoc.taxonomies",
              as: "tx",
              in: {
                $let: {
                  vars: {
                    yrRec: {
                      $first: {
                        $filter: {
                          input: "$$tx.years",
                          as: "txYr",
                          cond: { $eq: ["$$txYr.year", "$_yr.year"] }
                        }
                      }
                    }
                  },
                  in: {
                    $cond: [
                      { $gt: [ { $size: { $ifNull: ["$$yrRec.pctAllocations", []] } }, 0 ] },
                      {
                        type: "$$tx.type",
                        pctAllocations: {
                          $map: {
                            input: "$$yrRec.pctAllocations",
                            as: "alloc",
                            in: {
                              _id : "$$alloc._id",
                              name: "$$alloc.name",
                              pct: {
                                $cond: [
                                  { $ne: ["$$alloc.pct", null] },
                                  { $round: [
                                      { $cond: [
                                          { $gt: ["$$alloc.pct", 1] },
                                          { $divide: ["$$alloc.pct", 100] },
                                          "$$alloc.pct"
                                      ]},
                                      6
                                  ]},
                                  null
                                ]
                              },
                              fyCostSplit: {
                                $let: {
                                  vars: {
                                    pctVal: {
                                      $cond: [
                                        { $ne: ["$$alloc.pct", null] },
                                        { $cond: [
                                            { $gt: ["$$alloc.pct", 1] },
                                            { $divide: ["$$alloc.pct", 100] },
                                            "$$alloc.pct"
                                        ]},
                                        null
                                      ]
                                    },
                                    costVal: "$_yr.fyCost"
                                  },
                                  in: {
                                    $cond: [
                                      { $and: [
                                          { $ne: ["$$pctVal", null] },
                                          { $ne: ["$$costVal", null] }
                                      ]},
                                      { $round: [{ $multiply: ["$$pctVal", "$$costVal"] }, 6] },
                                      null
                                    ]
                                  }
                                }
                              }
                            }
                          }
                        }
                      },
                      null  // If no matching year → return null, will be filtered out
                    ]
                  }
                }
              }
            }
          },
          as: "txObj",
          cond: { $ne: ["$$txObj", null] }  // remove nulls
        }
      }
    }
  }
}
