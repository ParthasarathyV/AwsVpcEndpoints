// Switch to the correct DB if needed
const targetDB = getSiblingDB("yourDbName"); // replace with actual DB name
const collection = targetDB.yourCollectionName; // replace with actual collection

// Input array — normally you'd load this from a file or paste it inline
const input = [
  { _id: "abc", outlookVerIdOld: ["123", "456"] },
  { _id: "def", outlookVerIdOld: ["789"] }
];

// Iterate through each entry
input.forEach(doc => {
  const query = {
    proposalId: doc._id,
    "outlook.verId": { $in: doc.outlookVerIdOld }
  };

  // Print the query
  print("Delete Query:", tojson(query));

  // Execute the delete
  const result = collection.deleteMany(query);

  // Log result
  print("Deleted count:", result.deletedCount);
});
