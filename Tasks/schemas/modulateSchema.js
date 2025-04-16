const db = db.getSiblingDB("metadata");

db.billingKeyHeaderTemp.drop();

print("Processing billingKeyHeader with per-document refBU lookup...");

const cursor = db.billingKeyHeader.find();
let count = 0;

while (cursor.hasNext()) {
  const doc = cursor.next();

  const enrichedAllocations = (doc.allocations || []).map(a => {
    const ref = db.refBU.findOne(
      { sNode: a.SNODE },
      {
        projection: {
          _id: 0,
          sdmL5: 1,
          sdmL6: 1,
          sdmL7: 1,
          sdmL8: 1,
          sdmL9: 1,
          sdmL10: 1,
          sdmL11: 1,
          sdmL12: 1,
          sdmL13: 1
        }
      }
    );

    return {
      ...a,
      levels: ref || null
    };
  });

  const newDoc = {
    ipLongId: doc.ipLongId,
    planId: doc.planId,
    headerId: doc.headerId,
    bkId: doc.bkId,
    reason: doc.reason,
    type: doc.type,
    year: doc.year,
    scenario: doc.scenario,
    allocations: enrichedAllocations
  };

  db.billingKeyHeaderTemp.insertOne(newDoc);
  count++;
  if (count % 500 === 0) print(`Processed ${count} documents...`);
}

print(`Done. Enriched and inserted ${count} documents into billingKeyHeaderTemp.`);
