db.collection.aggregate([
  { $match: { _id: ObjectId("681a2c881ae65b56ef498cd0") } },

  {
    $project: {
      numBuckets: { $ceil: { $divide: [{ $size: "$costs" }, 500] } },
      costs: 1,
      allMeta: {
        $mergeObjects: [
          "$$ROOT",
          { costs: "$$REMOVE" } // exclude the large array
        ]
      }
    }
  },
  {
    $project: {
      buckets: {
        $map: {
          input: { $range: [0, "$numBuckets"] },
          as: "i",
          in: {
            $mergeObjects: [
              {
                bucketIndex: "$$i",
                costs: {
                  $slice: ["$costs", { $multiply: ["$$i", 500] }, 500]
                }
              },
              {
                $cond: {
                  if: { $eq: ["$$i", 0] },
                  then: "$allMeta",
                  else: {
                    ipLongId: "$allMeta.ipLongId",
                    planId: "$allMeta.planId",
                    scenario: "$allMeta.scenario"
                  }
                }
              }
            ]
          }
        }
      }
    }
  },
  { $unwind: "$buckets" },
  { $replaceRoot: { newRoot: "$buckets" } },

  // Optional: persist result
  {
    $merge: {
      into: "bucketedCosts",
      whenMatched: "replace",
      whenNotMatched: "insert"
    }
  }
]);
