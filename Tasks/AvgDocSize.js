const fs = require('fs');
const jsonInputPath = '/Users/home/repos/PeerIslands/MongoLoadGen/Hype/Ranges/Production/Wave2/config.json';
const jsonInput = JSON.parse(fs.readFileSync(jsonInputPath, 'utf8'));

let totalSizeBytes = 0;
let totalCount = 0;
let collectionSizes = [];

for (const rangeInfo of jsonInput.include) {
    const databaseName = rangeInfo.namespace.split('.')[0];
    const collectionName = rangeInfo.namespace.split('.')[1];
    
    // Execute collStats command
    const stats = db.getSiblingDB(databaseName).runCommand({ collStats: collectionName });
    
    // Get statistics from the command result
    const avgObjSizeBytes = stats.avgObjSize;

    // Calculate average document size in KB
    const avgDocSizeKB = avgObjSizeBytes / 1024;

    // Create JSON object for current collection
    const collectionInfo = {
        database: databaseName,
        collection: collectionName,
        avgDocumentSizeKB: avgDocSizeKB
    };

    print(avgDocSizeKB)

    // Push JSON object to collectionSizes array
    collectionSizes.push(collectionInfo);
}

// Print the JSON string of collectionSizes array
print(JSON.stringify(collectionSizes));
