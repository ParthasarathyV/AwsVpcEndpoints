import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.CreateClusterOptions;
import com.mongodb.client.model.CreateSyncSourceOptions;
import com.mongodb.client.model.Sync;

public class ClusterSyncExample {

    public static void main(String[] args) {
        // Configure source and target cluster details
        String sourceConnectionString = "mongodb+srv://<SOURCE-CLUSTER-CONNECTION-STRING>";
        String targetConnectionString = "mongodb+srv://<TARGET-CLUSTER-CONNECTION-STRING>";
        String sourceClusterName = "<SOURCE-CLUSTER-NAME>";
        String targetClusterName = "<TARGET-CLUSTER-NAME>";
        String databaseName = "<DATABASE-NAME>";
        String collectionName = "<COLLECTION-NAME>";

        // Create MongoDB client for source and target clusters
        MongoClient sourceClient = createMongoClient(sourceConnectionString);
        MongoClient targetClient = createMongoClient(targetConnectionString);

        // Get the source and target databases
        MongoDatabase sourceDatabase = sourceClient.getDatabase(databaseName);
        MongoDatabase targetDatabase = targetClient.getDatabase(databaseName);

        // Create Cluster Sync source and target
        Sync sync = new Sync(sourceClusterName);
        CreateSyncSourceOptions sourceOptions = new CreateSyncSourceOptions().sync(sync);
        targetDatabase.createCollection(collectionName, new CreateClusterOptions().syncSourceOptions(sourceOptions));

        // Start Cluster Sync
        targetDatabase.runCommand(new Document("configureClusterSync", targetClusterName));

        // Close the MongoDB clients
        sourceClient.close();
        targetClient.close();
    }

    private static MongoClient createMongoClient(String connectionString) {
        ConnectionString connString = new ConnectionString(connectionString);
        MongoClientSettings settings = MongoClientSettings.builder()
                .applyConnectionString(connString)
                .build();
        return MongoClients.create(settings);
    }
}
