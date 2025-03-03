const fs = require('fs');
const jsonInputPath = '/Users/home/repos/PeerIslands/MongoLoadGen/Hype/Ranges/Production/Wave3/config.json';
const jsonInput = JSON.parse(fs.readFileSync(jsonInputPath, 'utf8'));

let collectionSizes = [];

for (const rangeInfo of jsonInput.include) {
    const databaseName = rangeInfo.namespace.split('.')[0];
    const collectionName = rangeInfo.namespace.split('.')[1];
    
    // Execute collStats command
    const stats = db.getSiblingDB(databaseName).runCommand({ collStats: collectionName });
    
    // Get statistics from the command result
    const storageSizeInBytes = stats.size;

    // Calculate average document size in KB
    const storageSizeInKB = storageSizeInBytes / 1024;

    // Create JSON object for current collection
    const collectionInfo = {
        database: databaseName,
        collection: collectionName,
        avgDocumentSizeKB: storageSizeInKB
    };

    print(storageSizeInKB)

    // Push JSON object to collectionSizes array
    collectionSizes.push(collectionInfo);
}

// Print the JSON string of collectionSizes array
print(JSON.stringify(collectionSizes));
