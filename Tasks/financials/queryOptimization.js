db.orgs.aggregate([
  // Work on all Level-1 roots that are active
  { $match: { level: 1, active: "Y" } },

  // Keep only what we need from the root going forward
  { $project: { _id: 0, orgId: 1, name: 1, level: 1 } },

  /*
   * $graphLookup recursively walks the same collection to collect descendants.
   * - from:           collection to search (same as the current one)
   * - startWith:      value(s) to begin traversal with (here: this L1's orgId)
   * - connectFromField: field on each found doc whose value we follow outward
   * - connectToField:   field on candidate docs that must equal connectFromField
   *                     (classic parent/child: child's parentId == parent's orgId)
   * - as:             array field to store all matched descendants
   * - depthField:     adds 0 for direct children, 1 for grandchildren, etc.
   *
   * Note: per your requirement, we DO NOT filter descendants by active:Y here.
   */
  {
    $graphLookup: {
      from: "orgs",
      startWith: "$orgId",
      connectFromField: "orgId",
      connectToField: "parentId",
      as: "desc",
      depthField: "depth"
    }
  },

  // Build L2 array; for each L2, attach its L3 array. Project minimal fields.
  {
    $set: {
      l2OwningOrganizations: {
        $map: {
          input: {
            $filter: {
              input: "$desc",
              as: "d",
              cond: { $eq: ["$$d.level", 2] }
            }
          },
          as: "l2",
          in: {
            orgId: "$$l2.orgId",
            name: "$$l2.name",
            l3OwningOrganizations: {
              $map: {
                input: {
                  $filter: {
                    input: "$desc",
                    as: "d2",
                    cond: {
                      $and: [
                        { $eq: ["$$d2.level", 3] },
                        { $eq: ["$$d2.parentId", "$$l2.orgId"] }
                      ]
                    }
                  }
                },
                as: "l3",
                in: { orgId: "$$l3.orgId", name: "$$l3.name" }
              }
            }
          }
        }
      }
    }
  },

  // Return only the root fields you care about plus the computed arrays
  { $project: { level: 0, desc: 0 } } // drop temp fields
]).pretty();
