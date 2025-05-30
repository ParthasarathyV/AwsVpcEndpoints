// Load Node.js fs module
const fs = require("fs");

// Step 1: Read input JSON file
const filePath = "input.json"; // Change if needed
const docs = JSON.parse(fs.readFileSync(filePath, "utf8"));

// Step 2: Select database and collection
const dbName = "yourDatabase";         // <-- change this
const collName = "yourCollection";     // <-- change this
const coll = db.getSiblingDB(dbName).getCollection(collName);

// Step 3: Build bulkWrite operations
const bulkOps = docs.map(doc => ({
  updateOne: {
    filter: { _id: doc._id },   // Change this if your unique key is not _id
    replacement: doc,
    upsert: true
  }
}));

// Step 4: Run the bulkWrite
print(`Starting bulk upsert of ${bulkOps.length} documents...`);
const result = coll.bulkWrite(bulkOps);
print("Bulk upsert completed:");
printjson(result);
