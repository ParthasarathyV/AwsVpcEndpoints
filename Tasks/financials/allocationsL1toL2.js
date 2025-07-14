/* lvl1FinancialsSummary → aggregated document with four scenario arrays */
db.lvl1FinancialsSummary.aggregate([

  /* ── 0.  Grab the ipTaxonomy doc (trim to verId + taxonomies) ───────── */
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

  /* ── 1.  Run four identical sub-pipelines in parallel – one per block ─ */
  {
    $facet: {

      /* -----------   OUTLOOK   ---------------------------------------- */
      outlook: [

        /* use the whole outlook object as "sc" */
        { $set: { sc: "$outlook" } },
        { $unwind: { path: "$sc.years", preserveNullAndEmptyArrays: false } },

        /* handy aliases */
        { $set: {
            _yr: "$sc.years",
            _meta: {
              planId        : "$sc.planId",
              verId         : "$sc.verId",
              lastUpdatedAt : "$sc.lastUpdatedAt"
            }
        }},

        /* taxonomyAllocations for *this* year -------------------------- */
        { $set: { taxonomyAllocations:
          {
            verId: "$taxDoc.verId",
            taxonomies: {
              $map: {
                input: "$taxDoc.taxonomies",
                as: "tx",
                in: {
                  type: "$$tx.type",

                  /* ---- pull the matching year block inside the taxonomy */
                  pctAllocations: {
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
                        $map: {
                          input: { $ifNull: ["$$yrRec.pctAllocations", []] },
                          as: "alloc",
                          in: {
                            _id : "$$alloc._id",
                            name: "$$alloc.name",

                            /* pct (rounded, null-safe) */
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

                            /* fyCostSplit (rounded, null if pct or cost missing) */
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
                                        { $ne: ["$$pctVal",  null] },
                                        { $ne: ["$$costVal", null] }
                                    ]},
                                    { $round: [ { $multiply: ["$$pctVal","$$costVal"] }, 6 ] },
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
        }},

        /* finished per-year object that will live in the outlook array */
        { $project: {
            yearItem: {
              planId         : "$_meta.planId",
              verId          : "$_meta.verId",
              year           : "$_yr.year",
              lastUpdatedAt  : "$_meta.lastUpdatedAt",
              fyCost         : "$_yr.fyCost",
              fyNonLaborCost : "$_yr.fyNonLaborCost",   // keep or drop any FY fields
              taxonomyAllocations: "$taxonomyAllocations"
            }
        }},
        { $replaceRoot: { newRoot: "$yearItem" } },
        { $group: { _id: null, arr: { $push: "$$ROOT" } } },
        { $project: { _id: 0, arr: 1 } }
      ],

      /* -----------   LIVE   ------------------------------------------ */
      live: [
        { $set: { sc: "$live" } },
        { $unwind: { path: "$sc.years", preserveNullAndEmptyArrays: false } },
        { $set: {
            _yr  : "$sc.years",
            _meta: { planId:"$sc.planId", verId:"$sc.verId", lastUpdatedAt:"$sc.lastUpdatedAt" }
        }},
        { $set: { taxonomyAllocations: { /* ─ identical mapping ─ */ } } },  // ❶ copy from the OUTLOOK block
        { $project: { yearItem: {
            planId:"$_meta.planId", verId:"$_meta.verId", year:"$_yr.year",
            lastUpdatedAt:"$_meta.lastUpdatedAt", fyCost:"$_yr.fyCost",
            fyNonLaborCost:"$_yr.fyNonLaborCost", taxonomyAllocations:"$taxonomyAllocations" } } },
        { $replaceRoot: { newRoot:"$yearItem" } },
        { $group: { _id:null, arr:{ $push:"$$ROOT" } } },
        { $project:{ _id:0, arr:1 } }
      ],

      /* -----------   BUDGET   ---------------------------------------- */
      budget: [
        { $set: { sc: "$budget" } },
        { $unwind: { path: "$sc.years", preserveNullAndEmptyArrays: false } },
        { $set: {
            _yr  : "$sc.years",
            _meta: { planId:"$sc.planId", verId:"$sc.verId", lastUpdatedAt:"$sc.lastUpdatedAt" }
        }},
        { $set: { taxonomyAllocations: { /* ─ identical mapping ─ */ } } },  // ❶
        { $project: { yearItem: {
            planId:"$_meta.planId", verId:"$_meta.verId", year:"$_yr.year",
            lastUpdatedAt:"$_meta.lastUpdatedAt", fyCost:"$_yr.fyCost",
            fyNonLaborCost:"$_yr.fyNonLaborCost", taxonomyAllocations:"$taxonomyAllocations" } } },
        { $replaceRoot: { newRoot:"$yearItem" } },
        { $group: { _id:null, arr:{ $push:"$$ROOT" } } },
        { $project:{ _id:0, arr:1 } }
      ],

      /* -----------   PENDING-APPROVAL   ------------------------------ */
      pendingApproval: [
        { $set: { sc: "$pendingApproval" } },
        { $unwind: { path: "$sc.years", preserveNullAndEmptyArrays: false } },
        { $set: {
            _yr  : "$sc.years",
            _meta: { planId:"$sc.planId", verId:"$sc.verId", lastUpdatedAt:"$sc.lastUpdatedAt" }
        }},
        { $set: { taxonomyAllocations: { /* ─ identical mapping ─ */ } } },  // ❶
        { $project: { yearItem: {
            planId:"$_meta.planId", verId:"$_meta.verId", year:"$_yr.year",
            lastUpdatedAt:"$_meta.lastUpdatedAt", fyCost:"$_yr.fyCost",
            fyNonLaborCost:"$_yr.fyNonLaborCost", taxonomyAllocations:"$taxonomyAllocations" } } },
        { $replaceRoot: { newRoot:"$yearItem" } },
        { $group: { _id:null, arr:{ $push:"$$ROOT" } } },
        { $project:{ _id:0, arr:1 } }
      ],

      /* -----------   passthrough  (keep id & proposalId)   ----------- */
      passthrough: [
        { $project: { _id:1, proposalId:1 } }
      ]
    }
  },

  /* ── 2.  Merge the four arrays (or [] if branch returned nothing) ───── */
  {
    $set: {
      proposalId       : { $first: "$passthrough.proposalId" },

      outlook          : { $ifNull: [ { $first: "$outlook.arr" },          [] ] },
      live             : { $ifNull: [ { $first: "$live.arr" },             [] ] },
      budget           : { $ifNull: [ { $first: "$budget.arr" },           [] ] },
      pendingApproval  : { $ifNull: [ { $first: "$pendingApproval.arr" },  [] ] }
    }
  },
  { $project: { passthrough: 0, taxDoc: 0 } }
])
