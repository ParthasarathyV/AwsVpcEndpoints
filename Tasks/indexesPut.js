const fs = require('fs');

// Load index configurations from the JSON file
const indexConfigurationsPath = '/Users/home/repos/PeerIslands/MongoLoadGen/Hype/Ranges/Production/Wave1/indexConfigTest.json';
const indexConfigurations = JSON.parse(fs.readFileSync(indexConfigurationsPath, 'utf8'));

// Iterate over each index configuration and create indexes
for (const indexConfig of indexConfigurations) {
    const { database, collection, indexes } = indexConfig;


    // Check if the database name is 'aml-evos'
    if (database === 'aml-evos') {

        // Access the collection
        const targetCollection = db.getSiblingDB(database).getCollection(collection).createINdex;

        // Check if the collection exists
        const collectionExists = targetCollection.exists();


        // Create indexes
        for (const index of indexes) {

            if (index.key.hasOwnProperty('_id')) {
                print(`Skipping index creation for _id in collection ${collection} in database ${database}`);
            } 
            
            // if (index.key === '_id' && index.name === '_id_') {
            //     print(`Skipping index creation for _id in collection ${collection} in database ${database}`);
            //     continue;
            // }

            // If collection doesn't exist, create it and proceed to create index
            if (!collectionExists) {
                db.getSiblingDB(database).createCollection(collection);
                print(`Created collection ${collection} in database ${database}`);
                targetCollection = db.getSiblingDB(database).getCollection(collection);
            }

            // const indexInfo = targetCollection.getIndexes().find(i => i.key === index.key);
            // if (indexInfo) {
            //     print(`Index with key ${index.key} already exists in collection ${collection} in database ${database}. Skipping index creation.`);
            //     continue;
            // }

            // print(`Creating Index ${index.name} for collection ${collection} in database ${database}`);
            print(`Creating Index ${JSON.stringify(index.key)} for collection ${collection} in database ${database}`);

            const options = {...index.options };
            if (index.key.hasOwnProperty('_id')) {
                delete options.background;
            } else {
                options.background = true;
            }
            targetCollection.createIndex(index.key, options);
            print(`Index created for collection ${collection} in database ${database}`);
        }
    }
}

print('All indexes created successfully.');
