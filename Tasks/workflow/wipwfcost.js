db.collection.aggregate([
  // Step 1: Flatten costs
  { $unwind: { path: "$costs", preserveNullAndEmptyArrays: true } },

  // Step 2: Group by doc _id + source + type
  {
    $group: {
      _id: {
        _id: "$_id",
        source: "$costs.source",
        type: "$costs.type"
      },
      fycost: { $sum: { $ifNull: ["$costs.fycost", 0] } },
      root: { $first: "$$ROOT" }
    }
  },

  // Step 3: Group by doc _id + source, accumulate details array
  {
    $group: {
      _id: {
        _id: "$_id._id",
        source: "$_id.source"
      },
      total: { $sum: "$fycost" },
      details: {
        $push: {
          type: "$_id.type",
          total: "$fycost"
        }
      },
      root: { $first: "$root" }
    }
  },

  // Step 4: Group by document _id to assemble new costs array
  {
    $group: {
      _id: "$_id._id",
      newCosts: {
        $push: {
          source: "$_id.source",
          total: "$total",
          details: "$details"
        }
      },
      root: { $first: "$root" }
    }
  },

  // Step 5: Reconstruct full document with replaced costs
  {
    $replaceRoot: {
      newRoot: {
        $mergeObjects: ["$root", { costs: "$newCosts" }]
      }
    }
  }
]);
