const fs = require("fs");

// Configure these
const rootPath = "./jsons"; // Relative to where mongosh is launched
const dbName = "yourDatabase";
const collectionName = "yourCollection";

// Get collection handle
const collection = db.getSiblingDB(dbName)[collectionName];

for (let i = 1; i <= 691; i++) {
  const filePath = `${rootPath}/${i}.json`;
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const doc = JSON.parse(raw);

    // Upsert based on _id (adjust filter if needed)
    collection.updateOne(
      { _id: doc._id },
      { $set: doc },
      { upsert: true }
    );

    print(`Upserted ${i}.json`);
  } catch (err) {
    print(`Error processing ${i}.json: ${err.message}`);
  }
}

print("All documents processed.");
