import com.mongodb.MongoClient;
import com.mongodb.MongoClientURI;
import com.mongodb.client.MongoDatabase;
import org.bson.Document;

public class ShardKeyExample {

    public static void main(String[] args) {
        // Connect to the MongoDB sharded cluster
        MongoClientURI uri = new MongoClientURI("mongodb://<MONGOS-HOST>:<MONGOS-PORT>");
        MongoClient client = new MongoClient(uri);

        // Access the config database to retrieve shard key information
        MongoDatabase configDatabase = client.getDatabase("config");

        // Execute the listShards command
        Document listShardsCommand = new Document("listShards", 1);
        Document listShardsResult = configDatabase.runCommand(listShardsCommand);

        // Extract and display the shard key information
        for (Document shardInfo : listShardsResult.getList("shards", Document.class)) {
            String shardName = shardInfo.getString("_id");
            Document shardKey = shardInfo.get("key", Document.class);

            System.out.println("Shard: " + shardName);
            System.out.println("Shard Key: " + shardKey.toJson());
            System.out.println();
        }

        // Close the MongoDB client
        client.close();
    }
}
