// Load the file system module
const fs = require('fs');
const { exit } = require('process');

// Read the namespaces from the JSON file
const namespacesFilePath = '/Users/home/repos/PeerIslands/MongoLoadGen/Hype/Ranges/Production/Wave1/config.json'; // Replace this with the actual file path
const data = fs.readFileSync(namespacesFilePath, 'utf8');
const namespaces = JSON.parse(data);

// Connect to your MongoDB deployment here before proceeding further

// Iterate over each namespace and create the database and collection if they don't exist
namespaces.include.forEach(({ namespace }) => {
    const [dbName, collectionName] = namespace.split('.');
    // const db = db.getSiblingDB(dbName); // Connect to the database
    
    targetCollection = db.getSiblingDB(dbName).getCollection(collectionName).dropIndexes();
    // targetCollection = db.getSiblingDB("aml-evos").getCollection("subjects").dropIndexes();
    // targetCollection.dropIndexes()

    print(`'${dbName}' and ${collectionName}' indexes Deleted`)
    
});
