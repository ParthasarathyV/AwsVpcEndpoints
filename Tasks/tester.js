db.collection.aggregate([
  {
    $addFields: {
      allApps: {
        $reduce: {
          input: "$months",
          initialValue: [],
          in: {
            $concatArrays: [
              "$$value",
              {
                $map: {
                  input: "$$this.applications",
                  as: "app",
                  in: {
                    app_id: "$$app.app_id",
                    capPct: { $divide: ["$$app.ip_cap_pct", 12] },
                    appPct: { $divide: ["$$app.app_pct", 12] }
                  }
                }
              }
            ]
          }
        }
      }
    }
  },
  {
    $addFields: {
      years: {
        $reduce: {
          input: "$allApps",
          initialValue: [],
          in: {
            $let: {
              vars: {
                existing: {
                  $filter: {
                    input: "$$value",
                    as: "item",
                    cond: { $eq: ["$$item.id", "$$this.app_id"] }
                  }
                }
              },
              in: {
                $cond: [
                  { $gt: [{ $size: "$$existing" }, 0] },
                  {
                    $map: {
                      input: "$$value",
                      as: "entry",
                      in: {
                        $cond: [
                          { $eq: ["$$entry.id", "$$this.app_id"] },
                          {
                            id: "$$entry.id",
                            capPct: { $add: ["$$entry.capPct", "$$this.capPct"] },
                            appPct: { $add: ["$$entry.appPct", "$$this.appPct"] }
                          },
                          "$$entry"
                        ]
                      }
                    }
                  },
                  {
                    $concatArrays: [
                      "$$value",
                      [{
                        id: "$$this.app_id",
                        capPct: "$$this.capPct",
                        appPct: "$$this.appPct"
                      }]
                    ]
                  }
                ]
              }
            }
          }
        }
      }
    }
  },
  {
    $project: {
      months: 0,
      allApps: 0
    }
  }
])
