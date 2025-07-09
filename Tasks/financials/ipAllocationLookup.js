db.lvl1FinancialsSummary.aggregate([
  /* 1. Lookup ipTaxonomy and keep only verId + taxonomies */
  {
    $lookup: {
      from: "ipTaxonomy",
      localField:  "proposalId",
      foreignField:"proposalId",
      as: "taxDoc"
    }
  },
  {
    $set: {
      taxDoc: {
        $let: {
          vars: { d: { $first: "$taxDoc" } },
          in : { verId: "$$d.verId", taxonomies: "$$d.taxonomies" }
        }
      }
    }
  },

  /* 2. Enrich the outlook block (null-safe) */
  {
    $set: {
      "outlook.taxDoc": {
        $let: {
          vars: {
            byYear: {                 /* helper object, {} if outlook.years is null */
              $arrayToObject: {
                $map: {
                  input: { $ifNull: ["$outlook.years", []] },
                  as:   "y",
                  in: [ { $toString: "$$y.year" }, "$$y" ]
                }
              }
            }
          },
          in: {
            verId: "$taxDoc.verId",
            taxonomies: {
              $map: {
                input: "$taxDoc.taxonomies",
                as:   "tx",
                in: {
                  type: "$$tx.type",
                  years: {
                    $map: {
                      input: "$$tx.years",
                      as:   "txYr",
                      in: {
                        $let: {
                          vars: {
                            yrRec: {
                              $getField: {
                                field: { $toString: "$$txYr.year" },
                                input: "$$byYear"
                              }
                            }
                          },
                          in: {
                            year: "$$txYr.year",
                            pctAllocations: {
                              $map: {
                                input: "$$txYr.pctAllocations",
                                as:   "alloc",
                                in: {
                                  _id : "$$alloc._id",
                                  name: "$$alloc.name",

                                  /* pct rounded, null-safe */
                                  pct: {
                                    $cond: [
                                      { $ne: ["$$alloc.pct", null] },
                                      {
                                        $round: [
                                          { $cond: [
                                              { $gt: ["$$alloc.pct", 1] },
                                              { $divide: ["$$alloc.pct", 100] },
                                              "$$alloc.pct"
                                          ]},
                                          6
                                        ]
                                      },
                                      null
                                    ]
                                  },

                                  /* fyCostSplit rounded, null if pct or cost missing */
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
                                        costVal: { $ifNull: ["$$yrRec.fyCost", null] }
                                      },
                                      in: {
                                        $cond: [
                                          { $and: [
                                              { $ne: ["$$pctVal",  null] },
                                              { $ne: ["$$costVal", null] }
                                          ]},
                                          {
                                            $round: [
                                              { $multiply: ["$$pctVal", "$$costVal"] },
                                              6
                                            ]
                                          },
                                          null
                                        ]
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },

  /* 3. Remove temporary taxDoc */
  { $unset: "taxDoc" }
])
