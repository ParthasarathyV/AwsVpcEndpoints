import com.mongodb.bulk.BulkWriteResult;
import com.mongodb.client.model.BulkWriteOptions;
import com.mongodb.client.model.UpdateOneModel;
import com.mongodb.client.model.WriteModel;
import org.bson.Document;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class BufferedBulkUpdateService implements DisposableBean {

    private static final long MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
    private static final long MAX_WAIT_SECONDS = 120; // 2 minutes

    private final List<UpdateRequest> buffer = Collections.synchronizedList(new ArrayList<>());
    private final AtomicLong currentSizeBytes = new AtomicLong(0);
    private Instant lastFlushTime = Instant.now();

    @Autowired
    private MongoTemplate mongoTemplate;

    public void queueUpdate(Query query, Update update) {
        Document updateDoc = update.getUpdateObject();
        long size = updateDoc.toJson().getBytes(StandardCharsets.UTF_8).length;
        buffer.add(new UpdateRequest(query, update));
        currentSizeBytes.addAndGet(size);
    }

    @Scheduled(fixedRate = 10000) // Check every 10 seconds
    public void flushIfNeeded() {
        if (Duration.between(lastFlushTime, Instant.now()).toSeconds() >= MAX_WAIT_SECONDS ||
            currentSizeBytes.get() >= MAX_SIZE_BYTES) {
            flushUpdates();
        }
    }

    public synchronized void flushUpdates() {
        if (buffer.isEmpty()) return;

        List<WriteModel<Document>> writeModels = new ArrayList<>();
        for (UpdateRequest request : buffer) {
            writeModels.add(new UpdateOneModel<>(
                    request.getQuery().getQueryObject(),
                    request.getUpdate().getUpdateObject()
            ));
        }

        BulkWriteResult result = mongoTemplate.getCollection("FinGrid")
                .bulkWrite(writeModels, new BulkWriteOptions().ordered(false));

        System.out.println("[BufferedBulkUpdateService] BulkWrite completed with " + result.getModifiedCount() + " updates.");

        buffer.clear();
        currentSizeBytes.set(0);
        lastFlushTime = Instant.now();
    }

    @Override
    public void destroy() {
        flushUpdates(); // Ensure everything is flushed on shutdown
    }

    private static class UpdateRequest {
        private final Query query;
        private final Update update;

        public UpdateRequest(Query query, Update update) {
            this.query = query;
            this.update = update;
        }

        public Query getQuery() {
            return query;
        }

        public Update getUpdate() {
            return update;
        }
    }
}
