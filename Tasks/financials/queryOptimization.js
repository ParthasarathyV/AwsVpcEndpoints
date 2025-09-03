const l1OrgId = "20022"; // change to your L1 orgId

db.orgs.aggregate([
  { $match: { level: 1, orgId: l1OrgId } },

  // Pull the whole subtree in one shot
  {
    $graphLookup: {
      from: "orgs",
      startWith: "$orgId",
      connectFromField: "orgId",
      connectToField: "parentId",
      as: "desc",
      depthField: "depth",
      // Optional filters to keep it lean
      restrictSearchWithMatch: { active: "Y" }
    }
  },

  // Shape it into L2 array, each with its L3 children
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

  { $project: { desc: 0 } }
]).pretty();
