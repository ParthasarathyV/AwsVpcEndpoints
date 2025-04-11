// This script can be copied directly into mongosh to simulate concurrent updateOne operations.
// It updates a document in the "appMappings" collection with a random value and a timestamp.

(async function() {
  // Get the appMappings collection from your current database.
  const coll = db.getCollection("appMappings");

  // Define a filter to select a document. For example, updating a specific document.
  // Replace "YOUR_OBJECT_ID" with an actual _id if needed or use {} to update any document.
  const updateCriteria = { _id: ObjectId("YOUR_OBJECT_ID") };  

  // Number of concurrent updateOne operations to simulate.
  const numUpdates = 10;
  let updatePromises = [];

  // Create an array of update promises.
  for (let i = 0; i < numUpdates; i++) {
    updatePromises.push(
      coll.updateOne(
        updateCriteria,
        { $set: { 
            updatedAt: new Date(),
            updateIndex: i,
            randomValue: Math.random() 
          } }
      )
    );
  }

  // Trigger all updates concurrently.
  const results = await Promise.all(updatePromises);
  print("Concurrent update results:");
  printjson(results);
})();
