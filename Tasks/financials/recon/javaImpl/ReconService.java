package com.jpmc.recon;

import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.*;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class ReconService {

    @Autowired
    private TestAggrComponent aggrComponent; // builds Aggregation from your static pipeline + page $match

    @Qualifier("financialsMongoTemplate")
    @Autowired
    private MongoTemplate mongo;

    // starting collection for your static pipeline
    private static final String L1 = "lvl1FinancialsSummary";

    /**
     * Entry point. Give just pageSize and parallelism.
     * - Loads all distinct proposalIds (ascending)
     * - Partitions by pageSize
     * - Runs aggregation per chunk in parallel and logs results
     */
    public void run(int pageSize, int parallelism) {
        if (pageSize <= 0) pageSize = 1000;
        if (parallelism <= 0) parallelism = Runtime.getRuntime().availableProcessors();

        // helpful index (no-op if already present)
        mongo.getDb().getCollection(L1).createIndex(new Document("proposalId", 1));

        long t0 = System.nanoTime();
        List<String> allIds = fetchAllProposalIdsSorted(); // ascending, distinct
        long idsMs = (System.nanoTime() - t0) / 1_000_000;
        log.info("Loaded {} proposalIds in {} ms", allIds.size(), idsMs);

        if (allIds.isEmpty()) {
            log.info("No proposalIds found; nothing to do.");
            return;
        }

        List<List<String>> chunks = partition(allIds, pageSize);
        log.info("Dispatching {} chunks (size ~{}), threads={}", chunks.size(), pageSize, parallelism);

        ExecutorService pool = new ThreadPoolExecutor(
                parallelism, parallelism, 30, TimeUnit.SECONDS,
                new LinkedBlockingQueue<>(parallelism * 2),
                new ThreadPoolExecutor.CallerRunsPolicy()
        );
        CompletionService<Void> ecs = new ExecutorCompletionService<>(pool);

        int submitted = 0;
        for (List<String> chunk : chunks) {
            ecs.submit(() -> { aggregateAndLog(chunk); return null; });
            submitted++;

            // backpressure: at most 2×parallel tasks outstanding
            if (submitted >= parallelism * 2) {
                waitFor(ecs, submitted);
                submitted = 0;
            }
        }
        if (submitted > 0) waitFor(ecs, submitted);
        pool.shutdown();

        long totalMs = (System.nanoTime() - t0) / 1_000_000;
        log.info("Recon run completed in {} ms (ids={} ms, agg/log rest)", totalMs, idsMs);
    }

    // ----------------------------------------------------
    // Internals
    // ----------------------------------------------------

    /**
     * Get all distinct proposalIds from L1 in ascending order.
     * Uses aggregation: $group by proposalId -> $sort -> $project.
     * This keeps sorting server-side.
     */
    private List<String> fetchAllProposalIdsSorted() {
    // server returns an unordered set of distinct proposalId values
    List<String> ids = mongo.query(L1)
            .distinct("proposalId")
            .as(String.class)
            .all();

    // sort client-side
    ids.sort(String::compareTo);
    return ids;
}

    /**
     * Run aggregation for one chunk and log results.
     * The Aggregation is provided by your component (static pipeline + $match on the chunk).
     */
    private void aggregateAndLog(List<String> proposalIds) {
        if (proposalIds == null || proposalIds.isEmpty()) return;

        long t0 = System.nanoTime();
        Aggregation agg = aggrComponent.fetchAggregationRecon(proposalIds); // your static pipeline builder
        AggregationResults<ReconRow> results = mongo.aggregate(agg, L1, ReconRow.class);
        long ms = (System.nanoTime() - t0) / 1_000_000;

        int rowCount = results.getMappedResults().size();
        if (rowCount > 0) {
            log.info("recon size={}, rows={}", proposalIds.size(), rowCount);
        }

        // If you want only mismatches, uncomment the filter block and adjust the predicate
        results.getMappedResults()
            // .stream()
            // .filter(r -> Boolean.FALSE.equals(r.getL1ToL2Recon())
            //          || Boolean.FALSE.equals(r.getL1ToL4Recon())
            //          || Boolean.FALSE.equals(r.getL4ToL3Recon()))
            .forEach(r -> log.info(
                "Mismatch pid={} l1OutlookVerId={} l2OutlookVerId={} l3OutlookVerId={} l4OutlookVerId={} isCostsAddedInL4={} flags[L1->L2={}, L1->L4={}, L4->L3={}]",
                r.getProposalId(),
                r.getL1OutlookVerId(),
                r.getL2OutlookVerId(),
                r.getL3OutlookVerId(),
                r.getL4OutlookVerId(),
                r.getIsCostsAddedInL4(),
                r.getL1ToL2Recon(), r.getL1ToL4Recon(), r.getL4ToL3Recon()
            ));

        log.debug("Chunk done: proposals={} rows={} took {} ms", proposalIds.size(), rowCount, ms);
    }

    /**
     * Wait for N tasks to finish (same pattern you used).
     */
    private void waitFor(CompletionService<Void> ecs, int count) {
        for (int i = 0; i < count; i++) {
            try {
                ecs.take().get();
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                return;
            } catch (ExecutionException ee) {
                log.error("Recon task failed", ee.getCause());
            }
        }
    }

    /**
     * Simple list partitioner to keep each $in payload safe and efficient.
     */
    private static <T> List<List<T>> partition(List<T> list, int size) {
        int n = list.size();
        if (n == 0) return List.of();
        if (size >= n) return List.of(list);
        List<List<T>> out = new ArrayList<>((n + size - 1) / size);
        for (int i = 0; i < n; i += size) {
            out.add(list.subList(i, Math.min(n, i + size)));
        }
        return out;
    }
}
