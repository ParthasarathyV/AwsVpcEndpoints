db.collection.aggregate([
  { $unwind: "$costs" },
  {
    $group: {
      _id: {
        docId: "$_id",
        source: "$costs.source",
        type: "$costs.type"
      },
      typeTotal: { $sum: { $ifNull: ["$costs.fycost", 0] } }
    }
  },
  {
    $group: {
      _id: {
        docId: "$_id.docId",
        source: "$_id.source"
      },
      total: { $sum: "$typeTotal" },
      details: {
        $push: {
          type: "$_id.type",
          total: "$typeTotal"
        }
      }
    }
  },
  {
    $group: {
      _id: "$_id.docId",
      costs: {
        $push: {
          source: "$_id.source",
          total: "$total",
          details: "$details"
        }
      }
    }
  },
  {
    $replaceRoot: {
      newRoot: {
        $mergeObjects: [
          { _id: "$_id" },
          {
            $arrayElemAt: [
              {
                $map: {
                  input: [
                    {
                      $mergeObjects: [
                        "$$ROOT",
                        {
                          $arrayToObject: {
                            $filter: {
                              input: {
                                $map: {
                                  input: { $objectToArray: "$$ROOT" },
                                  as: "pair",
                                  in: "$$pair"
                                }
                              },
                              as: "item",
                              cond: { $ne: ["$$item.k", "costs"] }
                            }
                          }
                        }
                      ]
                    }
                  ],
                  as: "doc",
                  in: "$$doc"
                }
              },
              0
            ]
          }
        ]
      }
    }
  }
]);
