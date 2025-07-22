import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.connection.ConnectionPoolSettings;
import com.mongodb.connection.SocketSettings;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.MongoDatabaseFactory;
import org.springframework.data.mongodb.core.SimpleMongoClientDatabaseFactory;

import java.util.concurrent.TimeUnit;

@Configuration
public class MongoConfig {

    @Value("${spring.data.mongodb.financials.uri}")
    private String financialsUri;

    @Value("${spring.data.mongodb.financials.database}")
    private String financialsDatabase;

    @Bean(name = "financialsMongoDBFactory")
    public MongoDatabaseFactory financialsMongoDbFactory() {
        ConnectionString connString = new ConnectionString(financialsUri);

        MongoClientSettings settings = MongoClientSettings.builder()
                .applyConnectionString(connString)

                // Pooling Defaults
                .applyToConnectionPoolSettings(builder -> builder
                        .minSize(0) // Default: no pre-warmed connections
                        .maxSize(100) // Default maximum connections in pool
                        .maxWaitTime(120000, TimeUnit.MILLISECONDS) // Wait up to 120s for a connection
                        .maxConnectionIdleTime(0, TimeUnit.MILLISECONDS) // 0 means idle connections never expire
                        .maxConnectionLifeTime(0, TimeUnit.MILLISECONDS) // 0 means connections live forever unless broken
                )

                // Socket Settings
                .applyToSocketSettings(builder -> builder
                        .connectTimeout(10000, TimeUnit.MILLISECONDS) // Default: 10 seconds
                        .readTimeout(0, TimeUnit.MILLISECONDS) // Default: no read timeout
                )

                // Server Selection Settings
                .applyToClusterSettings(builder -> builder
                        .serverSelectionTimeout(30000, TimeUnit.MILLISECONDS) // Default: 30 seconds
                )

                .build();

        MongoClient client = MongoClients.create(settings);
        return new SimpleMongoClientDatabaseFactory(client, financialsDatabase);
    }
}
