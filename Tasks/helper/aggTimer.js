// Connect to your database
use yourDatabaseName;

// Replace with your collection
const collection = db.getCollection("yourCollectionName");

// Paste your Compass aggregation pipeline here 👇
const pipeline = [
  // Example:
  // { $match: { status: "active" } },
  // { $group: { _id: "$category", total: { $sum: "$amount" } } }
];

const start = new Date();
const result = collection.aggregate(pipeline).toArray();
const end = new Date();

console.log(`Aggregation returned ${result.length} documents.`);
console.log(`Aggregation took ${end - start} ms.`);

console.log("Preview of first 20 documents:");
result.slice(0, 20).forEach((doc, i) => {
  print(`--- Document ${i + 1} ---`);
  printjson(doc);
});
