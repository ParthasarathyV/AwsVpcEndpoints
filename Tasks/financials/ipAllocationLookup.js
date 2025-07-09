db.lvl1FinancialsSummary.aggregate([
  /* 1️⃣  Bring in the matching ipTaxonomy – keep only verId + taxonomies */
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
        $let: { vars: { d: { $first: "$taxDoc" } },
          in: { verId: "$$d.verId", taxonomies: "$$d.taxonomies" } }
      }
    }
  },

  /* 2️⃣  Enrich the outlook block --------------------------------------- */
  {
    $set: {
      "outlook.taxDoc": {
        /* only do the work if an outlook.years array exists */
        $cond: [
          { $gt: [ { $size: { $ifNull: ["$outlook.years", []] } }, 0 ] },

          /* ── build a tiny year-lookup object and use it inline ── */
          {
            $let: {
              vars: {
                byYear: {                         /* { "2025": <rec>, … } */
                  $arrayToObject: {
                    $map: {
                      input: "$outlook.years",
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

                                      /* pct rounded to 6 dp */
                                      pct: {
                                        $round: [
                                          { $cond: [
                                              { $gt: ["$$alloc.pct", 1] },
                                              { $divide: ["$$alloc.pct", 100] },
                                              "$$alloc.pct"
                                          ]},
                                          6
                                        ]
                                      },

                                      /* fyCostSplit = pct × fyCost (rounded) */
                                      fyCostSplit: {
                                        $round: [
                                          {
                                            $multiply: [
                                              { $cond: [
                                                  { $gt: ["$$alloc.pct", 1] },
                                                  { $divide: ["$$alloc.pct", 100] },
                                                  "$$alloc.pct"
                                              ]},
                                              { $ifNull: ["$$yrRec.fyCost", 0] }
                                            ]
                                          },
                                          6
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
          },

          /* outlook block missing → leave as-is */
          "$$REMOVE"
        ]
      }
    }
  },

  /* 3️⃣  Drop the temporary top-level taxDoc --------------------------- */
  { $unset: "taxDoc" }
])
