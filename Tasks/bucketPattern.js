db.collection.aggregate([
  {
    $match: { _id: ObjectId("681a2c881ae65b56ef498cd0") }
  },
  {
    $project: {
      numBuckets: {
        $ceil: { $divide: [{ $size: "$costs" }, 500] }
      },
      costs: 1,
      ipLongId: 1,
      planId: 1,
      scenario: 1
    }
  },
  {
    $project: {
      buckets: {
        $map: {
          input: { $range: [0, "$numBuckets"] },
          as: "i",
          in: {
            ipLongId: "$ipLongId",
            planId: "$planId",
            scenario: "$scenario",
            bucketIndex: "$$i",
            costs: {
              $slice: ["$costs", { $multiply: ["$$i", 500] }, 500]
            }
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
]);
