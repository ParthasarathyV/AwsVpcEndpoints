db.collection.aggregate([
  {
    $project: {
      costs: {
        $map: {
          input: "$costs",
          as: "cost",
          in: {
            type: "$$cost.type",
            subType: "$$cost.subType",
            locVen: {
              $cond: {
                if: { $eq: [ "$$cost.location", null ] },
                then: "Mumbai (India)", // Default or inferred value
                else: "$$cost.location"
              }
            },
            title: "$$cost.title",
            snode: { $toInt: "$$cost.snode" },
            source: "$$cost.source",
            poRefNum: "$$cost.poRefNum",
            fixedAsset: "$$cost.fixedAsset",
            fycost: "$$cost.fycost",
            fyHC: "$$cost.fyHC",
            mthHC: "$$cost.mthHC",
            mthCost: "$$cost.mthCost"
          }
        }
      }
    }
  }
])
