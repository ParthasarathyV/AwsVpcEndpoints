// update-ip-cap.js

// Generate 100 random doubles < 0.2
const randomValues = Array.from({ length: 100 }, () =>
  parseFloat((Math.random() * 0.2).toFixed(4))
);

// Log the values you're going to use
print("Generated random ip_cap_percent values:");
printjson(randomValues);

// Perform 100 updates using bulkWrite
const bulkOps = randomValues.map((val, index) => {
  return {
    updateOne: {
      filter: {
        "months.application.ip_cap_percent": { $lt: 0.2 }
      },
      update: {
        $set: {
          [`months.$[].application.$[app${index}].ip_cap_percent`]: val
        }
      },
      arrayFilters: [
        { [`app${index}.ip_cap_percent`]: { $lt: 0.2 } }
      ]
    }
  };
});

// Use your collection name here:
const result = db.financialLevel3.bulkWrite(bulkOps);

print("Bulk update result:");
printjson(result);
