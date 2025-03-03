const fs = require('fs');

// Path to the index configurations JSON file
const indexConfigurationsPath = '/Users/home/repos/PeerIslands/MongoLoadGen/Hype/Ranges/Production/Wave1/indexConfigurations.json';

// Read index configurations from the JSON file
const indexConfigurations = JSON.parse(fs.readFileSync(indexConfigurationsPath, 'utf8'));

// Object to store index creation status
const indexCreationStatus = {};

// Loop through each index configuration
for (const indexConfig of indexConfigurations) {
    const { database, collection, indexes } = indexConfig;

    // Get the MongoDB collection
    const targetCollection = db.getSiblingDB(database).getCollection(collection);
    
    // Get existing indexes for the collection
    const existingIndexes = targetCollection.getIndexes();

    // Create a key for the index creation status object
    const dbCollection = `${database}.${collection}`;
    indexCreationStatus[dbCollection] = {};

    // Check each index in the configuration
    for (const index of indexes) {
        // Check if the index exists
        const indexExists = existingIndexes.some(existingIndex => JSON.stringify(existingIndex.key) === JSON.stringify(index.key));
        indexCreationStatus[dbCollection][index.name] = indexExists ? 'Created' : 'Not Created';
    }

    // Check if all indexes in the collection are created
    // const allIndexesCreated = indexes.every(index => indexCreationStatus[dbCollection][index.name] === 'Created');
    // if (allIndexesCreated) {
    //     // If all indexes are created, set the collection status to 'Created'
    //     indexCreationStatus[dbCollection] = 'Created';
    // }

    // Check if all collections in the database are done
    // const allCollectionsDone = Object.values(indexCreationStatus[database]).every(status => status === 'Created');
    // if (allCollectionsDone) {
    //     // If all collections are done, mark the database as done and skip collection-level status
    //     indexCreationStatus[database] = 'Created';
    // }
}

// Convert index creation status object to JSON
const indexCreationStatusJSON = JSON.stringify(indexCreationStatus, null, 2);

// Print index creation status JSON
console.log(indexCreationStatusJSON);
