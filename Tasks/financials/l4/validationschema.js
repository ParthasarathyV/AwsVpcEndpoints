/**
 * MongoDB Collection Validator for `l4CostDetails`
 *
 * This schema enforces the structure and constraints for storing detailed financial cost records.
 *
 * Key Features:
 * - Enforces required top-level fields like `ipLongId`, `planId`, `scenario`, `totalCost`, etc.
 * - All date fields (`asOf`, `createdDate`, `lastUpdatedDate`) must be valid BSON Date objects.
 * - Arrays such as `hc`, `mthCost`, `mthHC`, `mthRegHrs`, `mthOtHrs`, etc. must contain exactly 12 items.
 * - Each item in the `costs` array represents an individual cost entry, and must also follow strict structure,
 *   including 12-month breakdowns and financial attributes.
 * - Ensures that incorrect data structure or types (like string instead of date, or wrong array lengths)
 *   are rejected at the database level.
 * 
 * Usage: Run this command in `mongosh` or MongoDB Shell to create the collection with schema validation.
 */

db.createCollection("l4CostDetails", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["ipLongId", "planId", "scenario", "ipType", "yyyymm", "asOf", "createdDate", "lastUpdatedDate", "totalCost", "hc", "mthCost", "costs"],
      properties: {
        ipLongId: { bsonType: "string" },
        planId: { bsonType: "string" },
        scenario: { bsonType: "string" },
        ipType: { bsonType: "string" },
        yyyymm: { bsonType: "string" },
        asOf: { bsonType: "date" },
        createdBy: { bsonType: "string" },
        createdDate: { bsonType: "date" },
        lastUpdatedBy: { bsonType: "string" },
        lastUpdatedDate: { bsonType: "date" },
        versionId: { bsonType: "string" },
        orgId: { bsonType: "string" },
        extras: {},
        totalCost: { bsonType: "double" },
        hc: {
          bsonType: "array",
          minItems: 12,
          maxItems: 12,
          items: { bsonType: "double" }
        },
        mthCost: {
          bsonType: "array",
          minItems: 12,
          maxItems: 12,
          items: { bsonType: "double" }
        },
        costs: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["id", "mergedId", "type", "snode", "sid", "financialCategory", "year", "ytdTotal", "fyCost", "fyHC", "mthHC", "mthCost"],
            properties: {
              id: { bsonType: "string" },
              mergedId: { bsonType: "string" },
              type: { bsonType: "string" },
              subType: { bsonType: "string" },
              location: { bsonType: "string" },
              vendor: { bsonType: "string" },
              locVerN: { bsonType: "string" },
              titleId: { bsonType: "string" },
              snode: { bsonType: "string" },
              sid: { bsonType: "string" },
              poRefNum: { bsonType: "string" },
              fixedAsset: { bsonType: "string" },
              financialCategory: { bsonType: "string" },
              year: { bsonType: "int" },
              ytdTotal: { bsonType: "double" },
              futureTotal: { bsonType: "double" },
              fyCost: { bsonType: "double" },
              fyHC: { bsonType: "double" },
              source: { bsonType: "string" },
              extras: {},
              createdBy: { bsonType: "string" },
              createdDate: { bsonType: "date" },
              lastUpdatedBy: { bsonType: "string" },
              lastUpdatedDate: { bsonType: "date" },
              entryMethod: { bsonType: "string" },
              customField1Name: { bsonType: "string" },
              customField1Value: { bsonType: "string" },
              customField2Name: { bsonType: "string" },
              customField2Value: { bsonType: "string" },
              mthHC: {
                bsonType: "array",
                minItems: 12,
                maxItems: 12,
                items: { bsonType: "double" }
              },
              mthCost: {
                bsonType: "array",
                minItems: 12,
                maxItems: 12,
                items: { bsonType: "double" }
              },
              mthRegHrs: {
                bsonType: "array",
                minItems: 12,
                maxItems: 12,
                items: { bsonType: "double" }
              },
              mthRegTotal: {
                bsonType: "array",
                minItems: 12,
                maxItems: 12,
                items: { bsonType: "double" }
              },
              mthOtHrs: {
                bsonType: "array",
                minItems: 12,
                maxItems: 12,
                items: { bsonType: "double" }
              },
              mthOtTotal: {
                bsonType: "array",
                minItems: 12,
                maxItems: 12,
                items: { bsonType: "double" }
              }
            }
          }
        }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});
