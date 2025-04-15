db.yourCollection.aggregate([
  {
    $facet: {
      rag: [
        {
          $group: {
            _id: null,
            values: { $addToSet: { $ifNull: ["$rag", ""] } }
          }
        },
        {
          $set: {
            values: {
              $sortArray: { input: "$values", sortBy: 1 }
            }
          }
        }
      ],
      executionState: [
        {
          $group: {
            _id: null,
            values: { $addToSet: { $ifNull: ["$executionState", ""] } }
          }
        },
        {
          $set: {
            values: {
              $sortArray: { input: "$values", sortBy: 1 }
            }
          }
        }
      ],
      executionOnly: [
        {
          $group: {
            _id: null,
            values: { $addToSet: { $ifNull: ["$executionOnly", ""] } }
          }
        },
        {
          $set: {
            values: {
              $sortArray: { input: "$values", sortBy: 1 }
            }
          }
        }
      ],
      openForTimeEntry: [
        {
          $group: {
            _id: null,
            values: { $addToSet: { $ifNull: ["$openForTimeEntry", ""] } }
          }
        },
        {
          $set: {
            values: {
              $sortArray: { input: "$values", sortBy: 1 }
            }
          }
        }
      ],
      type: [
        {
          $group: {
            _id: null,
            values: { $addToSet: { $ifNull: ["$type", ""] } }
          }
        },
        {
          $set: {
            values: {
              $sortArray: { input: "$values", sortBy: 1 }
            }
          }
        }
      ],
      benefitsReportingLevel: [
        {
          $group: {
            _id: null,
            values: { $addToSet: { $ifNull: ["$benefitsReportingLevel", ""] } }
          }
        },
        {
          $set: {
            values: {
              $sortArray: { input: "$values", sortBy: 1 }
            }
          }
        }
      ],
      l1SponsorOrganization: [
        {
          $group: {
            _id: null,
            values: { $addToSet: { $ifNull: ["$l1SponsorOrganization", ""] } }
          }
        },
        {
          $set: {
            values: {
              $sortArray: { input: "$values", sortBy: 1 }
            }
          }
        }
      ],
      l2SponsorOrganization: [
        {
          $group: {
            _id: null,
            values: { $addToSet: { $ifNull: ["$l2SponsorOrganization", ""] } }
          }
        },
        {
          $set: {
            values: {
              $sortArray: { input: "$values", sortBy: 1 }
            }
          }
        }
      ],
      l3SponsorOrganization: [
        {
          $group: {
            _id: null,
            values: { $addToSet: { $ifNull: ["$l3SponsorOrganization", ""] } }
          }
        },
        {
          $set: {
            values: {
              $sortArray: { input: "$values", sortBy: 1 }
            }
          }
        }
      ],
      l1OwningOrganization: [
        {
          $group: {
            _id: null,
            values: { $addToSet: { $ifNull: ["$l1OwningOrganization", ""] } }
          }
        },
        {
          $set: {
            values: {
              $sortArray: { input: "$values", sortBy: 1 }
            }
          }
        }
      ],
      l2OwningOrganization: [
        {
          $group: {
            _id: null,
            values: { $addToSet: { $ifNull: ["$l2OwningOrganization", ""] } }
          }
        },
        {
          $set: {
            values: {
              $sortArray: { input: "$values", sortBy: 1 }
            }
          }
        }
      ],
      l3OwningOrganization: [
        {
          $group: {
            _id: null,
            values: { $addToSet: { $ifNull: ["$l3OwningOrganization", ""] } }
          }
        },
        {
          $set: {
            values: {
              $sortArray: { input: "$values", sortBy: 1 }
            }
          }
        }
      ],
      inPlan: [
        {
          $group: {
            _id: null,
            values: { $addToSet: { $ifNull: ["$inPlan", ""] } }
          }
        },
        {
          $set: {
            values: {
              $sortArray: { input: "$values", sortBy: 1 }
            }
          }
        }
      ],
      regionalImpact: [
        {
          $group: {
            _id: null,
            values: { $addToSet: { $ifNull: ["$regionalImpact", ""] } }
          }
        },
        {
          $set: {
            values: {
              $sortArray: { input: "$values", sortBy: 1 }
            }
          }
        }
      ],
      milestoneDeliveryTeams: [
        {
          $group: {
            _id: null,
            values: { $addToSet: { $ifNull: ["$milestoneDeliveryTeams", ""] } }
          }
        },
        {
          $set: {
            values: {
              $sortArray: { input: "$values", sortBy: 1 }
            }
          }
        }
      ]
    }
  },
  {
    // Flatten each facet so we end with top-level arrays for each field
    $project: {
      rag: { $arrayElemAt: ["$rag.values", 0] },
      executionState: { $arrayElemAt: ["$executionState.values", 0] },
      executionOnly: { $arrayElemAt: ["$executionOnly.values", 0] },
      openForTimeEntry: { $arrayElemAt: ["$openForTimeEntry.values", 0] },
      type: { $arrayElemAt: ["$type.values", 0] },
      benefitsReportingLevel: { $arrayElemAt: ["$benefitsReportingLevel.values", 0] },
      l1SponsorOrganization: { $arrayElemAt: ["$l1SponsorOrganization.values", 0] },
      l2SponsorOrganization: { $arrayElemAt: ["$l2SponsorOrganization.values", 0] },
      l3SponsorOrganization: { $arrayElemAt: ["$l3SponsorOrganization.values", 0] },
      l1OwningOrganization: { $arrayElemAt: ["$l1OwningOrganization.values", 0] },
      l2OwningOrganization: { $arrayElemAt: ["$l2OwningOrganization.values", 0] },
      l3OwningOrganization: { $arrayElemAt: ["$l3OwningOrganization.values", 0] },
      inPlan: { $arrayElemAt: ["$inPlan.values", 0] },
      regionalImpact: { $arrayElemAt: ["$regionalImpact.values", 0] },
      milestoneDeliveryTeams: { $arrayElemAt: ["$milestoneDeliveryTeams.values", 0] }
    }
  }
]);
