const fs = require('fs');

const indexConfigurationsPath = '/Users/home/repos/PeerIslands/MongoLoadGen/Hype/Ranges/Production/Wave1/indexConfigurations.json';
const indexConfigurations = JSON.parse(fs.readFileSync(indexConfigurationsPath, 'utf8'));

for (const indexConfig of indexConfigurations) {
    const { database, collection, indexes } = indexConfig;

    if (database === 'antiMoneyLaundering') {
        const targetCollection = db.getSiblingDB(database).getCollection(collection);
        const collectionExists = targetCollection.exists();

        if (!collectionExists) {
            db.getSiblingDB(database).createCollection(collection);
            print(`Created collection ${collection} in database ${database}`);
        }

        const indexSpecs = indexes.map(index => ({ key: index.key, name: String(index.name), ...index.options }));

        // Trigger index creations without waiting for them to complete
        targetCollection.createIndexes(indexSpecs);

        print(`Indexes creation triggered for collection ${collection} in database ${database}:`);
        indexSpecs.forEach((indexSpec, index) => {
            print(`Index ${index + 1}: Name: ${indexSpec.name}, Key: ${JSON.stringify(indexSpec.key)}`);
        });
    }
}

print('Index creation triggered successfully. Actual completion status may vary.'); // Indicate that index creation is triggered, but actual completion may vary
