package com.jpmc.recon;

import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationOperation;
import org.springframework.data.mongodb.core.aggregation.AggregationOptions;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.*;
import java.util.stream.Stream;

@Slf4j
@Service
public class ReconRunner {

    private static final String L1 = "lvl1"; // starting collection for your static pipeline

    private final MongoTemplate mongo;
    private final StaticPipelineProvider pipelines;

    public ReconRunner(MongoTemplate mongo, StaticPipelineProvider pipelines) {
        this.mongo = mongo;
        this.pipelines = pipelines;
    }

    /**
     * Run recon across all lvl1 docs.
     * @param pageSize    e.g. 1000
     * @param parallelism e.g. 6–12 (tune to cluster/cpu)
     */
    public void run(int pageSize, int parallelism) {
        // Helpful indexes
        mongo.getDb().getCollection(L1).createIndex(new Document("_id", 1));
        mongo.getDb().getCollection(L1).createIndex(new Document("proposalId", 1));

        ExecutorService pool = new ThreadPoolExecutor(
            parallelism, parallelism,
            30, TimeUnit.SECONDS,
            new LinkedBlockingQueue<>(parallelism * 2),
            new ThreadPoolExecutor.CallerRunsPolicy()
        );
        CompletionService<Void> ecs = new ExecutorCompletionService<>(pool);

        int submitted = 0;
        ObjectId last = null;

        while (true) {
            List<L1IdWindow> page = fetchNextPage(last, pageSize);
            if (page.isEmpty()) break;

            last = page.get(page.size() - 1).getId();
            List<String> pidPage = page.stream().map(L1IdWindow::getProposalId).toList();

            ecs.submit(() -> { aggregateAndLog(pidPage); return null; });
            submitted++;

            // keep at most 2×parallel tasks outstanding
            if (submitted >= parallelism * 2) {
                waitFor(ecs, submitted);
                submitted = 0;
            }
        }

        if (submitted > 0) waitFor(ecs, submitted);
        pool.shutdown();
        log.info("Recon run completed");
    }

    // ---- internals ----

    /** Step 1: sequential page by _id (no skip). */
    private List<L1IdWindow> fetchNextPage(ObjectId lastId, int limit) {
        Query q = new Query();
        if (lastId != null) q.addCriteria(Criteria.where("_id").gt(lastId));
        q.fields().include("_id").include("proposalId");
        q.with(Sort.by(Sort.Direction.ASC, "_id"));
        q.limit(limit);
        List<L1IdWindow> res = mongo.find(q, L1IdWindow.class, L1);
        return Objects.requireNonNullElse(res, Collections.emptyList());
    }

    /** Step 2: prepend page $match to your static pipeline; log mismatches only. */
    private void aggregateAndLog(List<String> proposalIds) {
        if (proposalIds == null || proposalIds.isEmpty()) return;

        AggregationOperation pageMatch =
            Aggregation.match(Criteria.where("proposalId").in(proposalIds));

        List<AggregationOperation> ops = Stream.concat(
            Stream.of(pageMatch),
            pipelines.stages().stream()
        ).toList();

        Aggregation agg = Aggregation.newAggregation(
            AggregationOptions.builder()
                .allowDiskUse(true)
                .cursorBatchSize(1000)
                .build(),
            ops
        );

        long t0 = System.nanoTime();
        AggregationResults<ReconRow> results = mongo.aggregate(agg, L1, ReconRow.class);
        long ms = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - t0);

        // Stream results and log only mismatches
        results.getMappedResults().stream()
            .filter(ReconRow::isL1ToL2Recon           // or whatever flag(s) define "mismatch" for you
                    .negate())                        // example: log when L1→L2 recon is false
            .forEach(r -> log.info(
                "Mismatch pid={} l1OutlookVerId={} l2OutlookVerId={} l3OutlookVerId={} l4OutlookVerId={} isCostsAddedInL4={} flags[L1→L2={}, L1→L4={}, L4→L3={}]",
                r.getProposalId(),
                r.getL1OutlookVerId(),
                r.getL2OutlookVerId(),
                r.getL3OutlookVerId(),
                r.getL4OutlookVerId(),
                r.getIsCostsAddedInL4(),
                r.getL1ToL2Recon(), r.getL1ToL4Recon(), r.getL4ToL3Recon()
            ));

        log.debug("Page done: {} proposals in {} ms", proposalIds.size(), ms);
    }

    /** Wait for N tasks to finish. */
    private void waitFor(CompletionService<Void> ecs, int count) {
        for (int i = 0; i < count; i++) {
            try {
                ecs.take().get();
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                return;
            } catch (ExecutionException ee) {
                // swallow or rethrow as needed
                log.error("Recon task failed", ee.getCause());
            }
        }
    }
}
