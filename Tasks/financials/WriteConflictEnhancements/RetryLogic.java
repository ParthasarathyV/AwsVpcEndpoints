import com.mongodb.MongoException;
import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Recover;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;

@Slf4j
@Service
public class CostDetailsService {

    @Autowired
    private TransactionTemplate transactionTemplate;

    @Autowired
    private AuditService auditService;

    // other @Autowired components (like objectMapper, etc.)

    @Retryable(
        include = { MongoException.class },
        maxAttempts = 4,
        backoff = @Backoff(delay = 250, multiplier = 2.0)
    )
    public void saveDataTransactionally(String ipLongId, String planId, String scenario,
                                        String costs, Audit audit) {

        log.info("{} :: {}, {}, {} saving cost data transactionally",
                EventType.IP_COST_DETAILS.getEventType(), ipLongId, planId, scenario);

        transactionTemplate.executeWithoutResult(status -> {
            try {
                // 1. Upsert to lvl4
                String collectionName = determineCollectionName(scenario, CollectionType.L4_MC);
                upsertCostData(ipLongId, planId, scenario, costs, collectionName);

                // 2. L4 → L3 Aggregation
                List<Document> aggregatedResults = executeAggregation(ipLongId, planId, scenario, collectionName);
                List<Integer> currentYears = saveAggregatedResults(ipLongId, planId, scenario, aggregatedResults);

                // 3. Deletes & Audit
                handleDeletions(ipLongId, planId, scenario, currentYears);
                auditService.performAuditWrite(ipLongId, audit);

            } catch (MongoException me) {
                log.error("{} :: {}, {}, {} Transaction failed. MongoException: {}",
                        EventType.IP_COST_DETAILS.getEventType(), ipLongId, planId, scenario, me.getMessage());
                status.setRollbackOnly();
                throw me; // 🔁 Will trigger retry
            } catch (Exception e) {
                log.error("{} :: {}, {}, {} Transaction failed. Non-Mongo Exception: {}",
                        EventType.IP_COST_DETAILS.getEventType(), ipLongId, planId, scenario, e.getMessage());
                status.setRollbackOnly();
                throw new RuntimeException("Non-retryable failure", e);
            }
        });
    }

    @Recover
    public void recover(MongoException e, String ipLongId, String planId,
                        String scenario, String costs, Audit audit) {
        log.error("{} :: {}, {}, {} Retries Failed. Final Exception: {}",
                EventType.IP_COST_DETAILS.getEventType(), ipLongId, planId, scenario, e.getMessage());

        // Log audit as failed
        auditService.performAuditWrite(ipLongId, audit);

        // Optional: send to DLQ, alert, or persist retry-failure state
    }

    // your existing private methods: determineCollectionName, upsertCostData, etc.
}
