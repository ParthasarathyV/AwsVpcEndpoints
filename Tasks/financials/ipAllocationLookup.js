db.lvl1FinancialsSummary.aggregate([
  /* 0️⃣  ── restrict to the outlook scenario only (optional) ── */
  { $match: { scenario: "outlook" } },

  /* 1️⃣  ── bring in the ipTaxonomy doc that shares proposalId ── */
  {
    $lookup: {
      from: "ipTaxonomy",
      localField: "proposalId",
      foreignField: "proposalId",
      as: "taxDoc"
    }
  },
  /* keep just the first match and only the fields you want */
  {
    $set: {
      taxDoc: {
        $let: {
          vars: { doc: { $first: "$taxDoc" } },
          in: {
            verId:      "$$doc.verId",
            taxonomies: "$$doc.taxonomies"
          }
        }
      }
    }
  },

  /* 2️⃣  ── turn outlook.years into a fast lookup table ── */
  {
    $set: {
      _outlookByYear: {
        $arrayToObject: {
          $map: {
            input: "$outlook.years",
            as:   "y",
            in:   [ { $toString: "$$y.year" }, "$$y" ]
          }
        }
      }
    }
  },

  /* 3️⃣  ── walk the taxonomy tree and calculate fyCostSplit ── */
  {
    $set: {
      "taxDoc.taxonomies": {
        $map: {
          input: "$taxDoc.taxonomies",    /* every top-level taxonomy */
          as:   "tx",
          in: {
            type: "$$tx.type",
            years: {
              $map: {
                input: "$$tx.years",       /* each year inside it     */
                as:   "txYr",
                in: {
                  $let: {
                    vars: {
                      outlookYr: {
                        $getField: {
                          field: { $toString: "$$txYr.year" },
                          input: "$_outlookByYear"
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
                            _id:  "$$alloc._id",
                            name: "$$alloc.name",

                            /* pct                              */
                            pct: {
                              $round: [
                                { $cond: [
                                    /* if stored as 25 ( >1 ) divide to get 0.25            */
                                    { $gt: ["$$alloc.pct", 1] },
                                    { $divide: ["$$alloc.pct", 100] },
                                    "$$alloc.pct"
                                ]},
                                6
                              ]
                            },

                            /* fyCostSplit = pct × fyCost, rounded to 6 dp               */
                            fyCostSplit: {
                              $round: [
                                {
                                  $multiply: [
                                    { $cond: [
                                        { $gt: ["$$alloc.pct", 1] },
                                        { $divide: ["$$alloc.pct", 100] },
                                        "$$alloc.pct"
                                    ]},
                                    { $ifNull: ["$$outlookYr.fyCost", 0] }
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
  },

  /* 4️⃣  ── move taxDoc under outlook & drop helpers ── */
  { $set: { "outlook.taxDoc": "$taxDoc" } },
  { $unset: ["taxDoc", "_outlookByYear"] }
])
