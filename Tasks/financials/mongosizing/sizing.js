db.getMongo().getDBNames().forEach(function(database) {
if (database != 'admin' && database != 'local' && database != 'config') {
      db.getSiblingDB(database).getCollectionNames().forEach(function(collection) {
                stats = db.getSiblingDB(database)[collection].stats()
                if (stats.count > 0) {
                print(database + "," + collection + "," + stats.count + "," + stats.size + "," + stats.size/stats.count + "," + stats.totalIndexSize + "," + stats.totalIndexSize/stats.count + "," + stats.storageSize/stats.size + "," + stats.nindexes);
      }});
}});
