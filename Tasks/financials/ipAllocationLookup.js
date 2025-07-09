db.lvl1FinancialsSummary.aggregate([
  /* ──────────────────────────────────────────────────────────────
     1) bring in the matching ipTaxonomy document by proposalId
  ────────────────────────────────────────────────────────────── */
  {
    $lookup: {
      from: "ipTaxonomy",
      localField: "proposalId",
      foreignField: "proposalId",
      as: "taxDoc"
    }
  },
  /* there can only be one, so pull it out of the array */
  { $set: { taxDoc: { $first: "$taxDoc" } } },

  /* ──────────────────────────────────────────────────────────────
     2) turn outlook.years into an OBJECT keyed by year so that
        we can grab a fiscal-year record in O(1) time later on
  ────────────────────────────────────────────────────────────── */
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

  /* ──────────────────────────────────────────────────────────────
     3) walk the taxonomy tree and—still in array form—compute
        fyCostSplit = fyCost × pct for the matching year
  ────────────────────────────────────────────────────────────── */
  {
    $set: {
      "taxDoc.taxonomies": {
        $map: {
          input: "$taxDoc.taxonomies",    /* all top-level taxonomies */
          as:   "tx",
          in: {
            type: "$$tx.type",
            years: {
              $map: {
                input: "$$tx.years",       /* every year held by this taxonomy */
                as:   "txYr",
                in: {
                  /* grab the matching outlook year in one step */
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
                            pct:  "$$alloc.pct",
                            fyCostSplit: {
                              /* multiply percentage by the FY cost
                                 (divide by 100 ⇢ if pct is stored as 25 not 0.25) */
                              $multiply: [
                                "$$alloc.pct",
                                { $ifNull: ["$$outlookYr.fyCost", 0] }
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

  /* ──────────────────────────────────────────────────────────────
     4) tidy up – drop helper field if you don’t want it
  ────────────────────────────────────────────────────────────── */
  { $unset: ["_outlookByYear"] }
])
