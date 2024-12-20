db.collection.aggregate([
  // Step 1: Duplicate the documents 5 times (adjust to create 100k total)
  { $unionWith: { coll: "collection" } },
  { $unionWith: { coll: "collection" } },
  { $unionWith: { coll: "collection" } },
  { $unionWith: { coll: "collection" } },

  // Step 2: Add a new ObjectId for each replicated document
  { $addFields: { _id: { $function: {
      body: function() { return new ObjectId(); },
      args: [],
      lang: "js"
    }} 
  }},

  // Step 3: Insert the results into the same collection or a new one
  { $merge: { into: "new_collection" } } // Replace "new_collection" with the desired collection name
]);
