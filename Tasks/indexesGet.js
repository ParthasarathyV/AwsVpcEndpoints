const fs = require('fs');
const jsonInputPath = '/Users/home/repos/PeerIslands/MongoLoadGen/Hype/Ranges/Production/Wave2/config.json';
const jsonInput = JSON.parse(fs.readFileSync(jsonInputPath, 'utf8'));

let indexConfigurations = [];

for (const rangeInfo of jsonInput.include) {
    const databaseName = rangeInfo.namespace.split('.')[0];
    const collectionName = rangeInfo.namespace.split('.')[1];
    const collection = db.getSiblingDB(databaseName)[collectionName];

    // Check if the collection exists, if not, create it
    if (!collection.exists()) {
        db.getSiblingDB(databaseName).createCollection(collectionName);
        // print(`Collection '${collectionName}' created in database '${databaseName}'`);
    }

    // Retrieve index configurations for the current collection
    const indexes = collection.getIndexes();

    indexes.forEach(idx => {
        if (!idx.key._id) {
            let options = idx;
            delete options.v;
            delete options.ns;

            let createIndexStatement = `db.getSiblingDB('${databaseName}').${collectionName}.createIndex(${JSON.stringify(idx.key)}, ${JSON.stringify(options)})`;
            print(createIndexStatement);
        }
    });

    // Create JSON object for current collection's index configurations
    // const indexConfig = {
        // database: databaseName,
        // collection: collectionName,
        // indexes: indexes
    // };

    // Push JSON object to indexConfigurations array
    // indexConfigurations.push(indexConfig);
}

// Save indexConfigurations to a JSON file
const outputPath = '/Users/home/repos/PeerIslands/MongoLoadGen/Hype/Ranges/Production/Wave3/indexConfigurationsDest.json';
fs.writeFileSync(outputPath, JSON.stringify(indexConfigurations, null, 2));
