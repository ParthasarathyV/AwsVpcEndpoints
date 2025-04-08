@Component
public class FinancialLevel3ChangeStreamListener {

    @Autowired
    private MongoTemplate mongoTemplate;

    @PostConstruct
    public void initChangeStream() {
        System.out.println("\n[ChangeStream] Starting listener on 'financialLevel3'...\n");

        MongoCollection<Document> collection = mongoTemplate.getCollection("financialLevel3");

        List<Bson> pipeline = List.of(Aggregates.match(Filters.eq("operationType", "update")));

        new Thread(() -> {
            try (MongoChangeStreamCursor<ChangeStreamDocument<Document>> cursor =
                         collection.watch(pipeline).cursor()) {

                System.out.println("[ChangeStream] Watching for updates in 'financialLevel3'...");

                while (cursor.hasNext()) {
                    ChangeStreamDocument<Document> change = cursor.next();
                    Document fullDoc = collection.find(
                            Filters.eq("_id", change.getDocumentKey().getObjectId("_id"))
                    ).first();

                    if (fullDoc != null) {
                        handleFinancialUpdate(fullDoc);
                    }
                }
            } catch (Exception e) {
                System.err.println("[ChangeStream] Listener error:");
                e.printStackTrace();
            }
        }).start();
    }

    private void handleFinancialUpdate(Document changedDoc) {
        String ipLongId = changedDoc.getString("ipLongId");
        String scenario = changedDoc.getString("scenario");
        Integer year = changedDoc.getInteger("year");
        String dfKey = scenario + year;

        // 1. Aggregate monthCost and monthHC
        List<Document> matchingDocs = mongoTemplate.find(
                org.springframework.data.mongodb.core.query.Query.query(
                        org.springframework.data.mongodb.core.query.Criteria.where("ipLongId").is(ipLongId)
                                .and("scenario").is(scenario)
                                .and("year").is(year)
                ),
                Document.class,
                "financialLevel3"
        );

        List<Double> monthCost = new ArrayList<>(Collections.nCopies(12, 0.0));
        List<Double> monthHC = new ArrayList<>(Collections.nCopies(12, 0.0));
        double totalCost = 0;

        for (Document doc : matchingDocs) {
            List<Double> docMonthCost = (List<Double>) doc.get("monthCost");
            Double fyCost = doc.getDouble("fyCost");
            if (fyCost != null) totalCost += fyCost;

            if (docMonthCost != null && docMonthCost.size() == 12) {
                for (int i = 0; i < 12; i++) {
                    monthCost.set(i, monthCost.get(i) + docMonthCost.get(i));
                    monthHC.set(i, monthHC.get(i) + docMonthCost.get(i)); // Assuming same cost for HC
                }
            }
        }

        // 2. Update FinGrid
        mongoTemplate.updateFirst(
                org.springframework.data.mongodb.core.query.Query.query(
                        org.springframework.data.mongodb.core.query.Criteria.where("longId").is(ipLongId)
                ),
                new org.springframework.data.mongodb.core.query.Update()
                        .set("detailedFinancials." + dfKey + ".cost", totalCost)
                        .set("detailedFinancials." + dfKey + ".monthCost", monthCost)
                        .set("detailedFinancials." + dfKey + ".monthHC", monthHC),
                "FinGrid"
        );

        System.out.printf("[ChangeStream] FinGrid updated for longId=%s | scenario=%s | year=%d\n",
                ipLongId, scenario, year);

        // 3. Recalculate appMappings
        new AppMappingsChangeStreamListener().handleAppMappingUpdate(
                mongoTemplate.findOne(
                        org.springframework.data.mongodb.core.query.Query.query(
                                org.springframework.data.mongodb.core.query.Criteria.where("longId").is(ipLongId)
                        ),
                        Document.class,
                        "FinGrid"
                )
        );
    }
}
