[
  {
    $match: { _id: ObjectId("681a2c881ae65b56ef498cd0") }
  },
  {
    $project: {
      numBuckets: {
        $ceil: { $divide: [{ $size: "$costs" }, 500] }
      },
      costs: 1,
      allFields: "$$ROOT"
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
                  $slice: [
                    "$costs",
                    { $multiply: ["$$i", 500] },
                    500
                  ]
                }
              },
              {
                $cond: {
                  if: { $eq: ["$$i", 0] },
                  then: "$allFields",
                  else: {}
                }
              }
            ]
          }
        }
      }
    }
  },
  {
    $unwind: "$buckets"
  },
  {
    $replaceRoot: {
      newRoot: "$buckets"
    }
  }
]
