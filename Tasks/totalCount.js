const fs = require('fs');
const jsonInputPath = '/Users/home/repos/PeerIslands/migrator/config.json';
// const jsonInputPath = '/Users/home/repos/PeerIslands/MongoLoadGen/Hype/ProductionDryRunFinal/e/config.json';

const jsonInput = JSON.parse(fs.readFileSync(jsonInputPath, 'utf8'));
 
let totalCount = 0;
let collectionCounts = [];
 
for (const rangeInfo of jsonInput.include) {
    const databaseName = rangeInfo.namespace.split('.')[0];
    const collectionName = rangeInfo.namespace.split('.')[1];
    const collection = db.getSiblingDB(databaseName)[collectionName];
    const count = collection.find().count();
    totalCount += count;
 
    // Create JSON object for current collection
    const collectionInfo = {
        database: databaseName,
        collection: collectionName,
        count: count
    };
    print(count)

    // Push JSON object to collectionCounts array
    collectionCounts.push(collectionInfo);
}
 
// Print the JSON string of collectionCounts array
print(JSON.stringify(collectionCounts));

const currentDate = new Date();
const currentDateTime = currentDate.toLocaleString();

print(`Total Collections ${collectionCounts.length}`)

print(`[${currentDateTime}] Total Document Count: ${totalCount}`);

// print(`Total Document Count : ${totalCount}`);