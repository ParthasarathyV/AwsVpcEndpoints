[
  {
    "$match": {
      "allSidsInDocument": { "$ne": null }
    }
  },
  {
    "$set": {
      "owner": {
        "$cond": {
          "if": { "$eq": [ { "$ifNull": [ "$owner.sid", null ] }, null ] },
          "then": null,
          "else": "$owner"
        }
      },
      "technologyLead": {
        "$cond": {
          "if": { "$eq": [ { "$ifNull": [ "$technologyLead.sid", null ] }, null ] },
          "then": null,
          "else": "$technologyLead"
        }
      },
      "primaryFbmContact": {
        "$cond": {
          "if": { "$eq": [ { "$ifNull": [ "$primaryFbmContact.sid", null ] }, null ] },
          "then": null,
          "else": "$primaryFbmContact"
        }
      },
      "chiefTechnologyOfficer": {
        "$cond": {
          "if": { "$eq": [ { "$ifNull": [ "$chiefTechnologyOfficer.sid", null ] }, null ] },
          "then": null,
          "else": "$chiefTechnologyOfficer"
        }
      },
      "chiefBusinessTechnologist": {
        "$cond": {
          "if": { "$eq": [ { "$ifNull": [ "$chiefBusinessTechnologist.sid", null ] }, null ] },
          "then": null,
          "else": "$chiefBusinessTechnologist"
        }
      },
      "closureSignatory": {
        "$cond": {
          "if": { "$eq": [ { "$ifNull": [ "$closureSignatory.sid", null ] }, null ] },
          "then": null,
          "else": "$closureSignatory"
        }
      },
      "product.productOwner": {
        "$cond": {
          "if": { "$eq": [ { "$ifNull": [ "$product.productOwner.sid", null ] }, null ] },
          "then": null,
          "else": "$product.productOwner"
        }
      },
      "openCreator": {
        "$cond": {
          "if": { "$eq": [ { "$ifNull": [ "$openCreator.sid", null ] }, null ] },
          "then": null,
          "else": "$openCreator"
        }
      },
      "createdBy": {
        "$cond": {
          "if": { "$eq": [ { "$ifNull": [ "$createdBy.sid", null ] }, null ] },
          "then": null,
          "else": "$createdBy"
        }
      },
      "lastUpdatedBy": {
        "$cond": {
          "if": { "$eq": [ { "$ifNull": [ "$lastUpdatedBy.sid", null ] }, null ] },
          "then": null,
          "else": "$lastUpdatedBy"
        }
      },
      "governanceStructure.productLeads": {
        "$map": {
          "input": { "$ifNull": [ "$governanceStructure.productLeads", [] ] },
          "as": "item",
          "in": {
            "$cond": {
              "if": { "$eq": [ { "$ifNull": [ "$$item.sid", null ] }, null ] },
              "then": null,
              "else": "$$item"
            }
          }
        }
      },
      "governanceStructure.operationsLeads": {
        "$map": {
          "input": { "$ifNull": [ "$governanceStructure.operationsLeads", [] ] },
          "as": "item",
          "in": {
            "$cond": {
              "if": { "$eq": [ { "$ifNull": [ "$$item.sid", null ] }, null ] },
              "then": null,
              "else": "$$item"
            }
          }
        }
      },
      "governanceStructure.technologyLeads": {
        "$map": {
          "input": { "$ifNull": [ "$governanceStructure.technologyLeads", [] ] },
          "as": "item",
          "in": {
            "$cond": {
              "if": { "$eq": [ { "$ifNull": [ "$$item.sid", null ] }, null ] },
              "then": null,
              "else": "$$item"
            }
          }
        }
      },
      "governanceStructure.lastUpdatedBy": {
        "$cond": {
          "if": { "$eq": [ { "$ifNull": [ "$governanceStructure.lastUpdatedBy.sid", null ] }, null ] },
          "then": null,
          "else": "$governanceStructure.lastUpdatedBy"
        }
      },
      "secondaryFbmContacts": {
        "$map": {
          "input": { "$ifNull": [ "$secondaryFbmContacts", [] ] },
          "as": "item",
          "in": {
            "$cond": {
              "if": { "$eq": [ { "$ifNull": [ "$$item.sid", null ] }, null ] },
              "then": null,
              "else": "$$item"
            }
          }
        }
      },
      "coOwners": {
        "$map": {
          "input": { "$ifNull": [ "$coOwners", [] ] },
          "as": "item",
          "in": {
            "$cond": {
              "if": { "$eq": [ { "$ifNull": [ "$$item.sid", null ] }, null ] },
              "then": null,
              "else": "$$item"
            }
          }
        }
      },
      "sponsors": {
        "$map": {
          "input": { "$ifNull": [ "$sponsors", [] ] },
          "as": "item",
          "in": {
            "$cond": {
              "if": { "$eq": [ { "$ifNull": [ "$$item.sid", null ] }, null ] },
              "then": null,
              "else": "$$item"
            }
          }
        }
      },
      "collaborators": {
        "$map": {
          "input": { "$ifNull": [ "$collaborators", [] ] },
          "as": "item",
          "in": {
            "$cond": {
              "if": { "$eq": [ { "$ifNull": [ "$$item.sid", null ] }, null ] },
              "then": null,
              "else": "$$item"
            }
          }
        }
      },
      "agreementApprovers": {
        "$map": {
          "input": { "$ifNull": [ "$agreementApprovers", [] ] },
          "as": "item",
          "in": {
            "$cond": {
              "if": { "$eq": [ { "$ifNull": [ "$$item.sid", null ] }, null ] },
              "then": null,
              "else": "$$item"
            }
          }
        }
      },
      "functionalOwners": {
        "$map": {
          "input": { "$ifNull": [ "$functionalOwners", [] ] },
          "as": "outerItem",
          "in": {
            "$mergeObjects": [
              "$$outerItem",
              {
                "owners": {
                  "$map": {
                    "input": { "$ifNull": [ "$$outerItem.owners", [] ] },
                    "as": "innerItem",
                    "in": {
                      "$cond": {
                        "if": { "$eq": [ { "$ifNull": [ "$$innerItem.sid", null ] }, null ] },
                        "then": null,
                        "else": "$$innerItem"
                      }
                    }
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
    "$merge": {
      "into": "testProposal",
      "on": "_id",
      "whenMatched": "merge",
      "whenNotMatched": "discard"
    }
  }
]
