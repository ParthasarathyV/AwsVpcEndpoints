databaseChangeLog:
  - changeSet:
      id: drop-and-recreate-indexes
      changes:
        - ext:javascript:
            code: |
              const dbName = "financials";
              const dbRef = db.getSiblingDB(dbName);

              const indexConfigs = [
                // L4 collections (proposalId + scenario)
                {
                  coll: "lvl4CostDetailsOutlook",
                  oldName: "idx_l4cd_outlook_unq",
                  newKeys: { proposalId: 1, scenario: 1 },
                  newName: "idx_l4cd_outlook_prpid_scnr_unq"
                },
                {
                  coll: "lvl4CostDetailsLive",
                  oldName: "idx_l4cd_live_unq",
                  newKeys: { proposalId: 1, scenario: 1 },
                  newName: "idx_l4cd_live_prpid_scnr_unq"
                },
                {
                  coll: "lvl4CostDetailsBudget",
                  oldName: "idx_l4cd_budget_unq",
                  newKeys: { proposalId: 1, scenario: 1 },
                  newName: "idx_l4cd_budget_prpid_scnr_unq"
                },

                // L3 collections (proposalId + scenario + year)
                {
                  coll: "lvl3CostDetailsOutlook",
                  oldName: "idx_l3cd_outlook_unq",
                  newKeys: { proposalId: 1, scenario: 1, year: 1 },
                  newName: "idx_l3cd_outlook_prpid_scnr_year_unq"
                },
                {
                  coll: "lvl3CostDetailsLive",
                  oldName: "idx_l3cd_live_unq",
                  newKeys: { proposalId: 1, scenario: 1, year: 1 },
                  newName: "idx_l3cd_live_prpid_scnr_year_unq"
                },
                {
                  coll: "lvl3CostDetailsBudget",
                  oldName: "idx_l3cd_budget_unq",
                  newKeys: { proposalId: 1, scenario: 1, year: 1 },
                  newName: "idx_l3cd_budget_prpid_scnr_year_unq"
                }
              ];

              indexConfigs.forEach(cfg => {
                const coll = dbRef[cfg.coll];
                const existing = coll.getIndexes().map(ix => ix.name);

                // Drop old index if exists
                if (existing.includes(cfg.oldName)) {
                  coll.dropIndex(cfg.oldName);
                  print("Dropped index " + cfg.oldName + " on " + cfg.coll);
                } else {
                  print("Index " + cfg.oldName + " not found on " + cfg.coll + ", skipping drop.");
                }

                // Create new index
                coll.createIndex(cfg.newKeys, { unique: true, name: cfg.newName });
                print("Created new index " + cfg.newName + " on " + cfg.coll);
              });

              print("Index recreation complete.");
