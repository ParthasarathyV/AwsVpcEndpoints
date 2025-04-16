const db = db.getSiblingDB("metadata"); // Replace with actual DB name

print("Loading refBU into memory...");

// Load refBU into memory (keyed by sNode)
const refBUCursor = db.refBU.find({}, { sNode: 1, sdmL5: 1, sdmL6: 1, sdmL7: 1, sdmL8: 1, sdmL9: 1, sdmL10: 1, sdmL11: 1, sdmL12: 1, sdmL13: 1 });
const refBUMap = {};

while (refBUCursor.hasNext()) {
  const ref = refBUCursor.next();
  refBUMap[ref.sNode] = {
    sdmL5: ref.sdmL5,
    sdmL6: ref.sdmL6,
    sdmL7: ref.sdmL7,
    sdmL8: ref.sdmL8,
    sdmL9: ref.sdmL9,
    sdmL10: ref.sdmL10,
    sdmL11: ref.sdmL11,
    sdmL12: ref.sdmL12,
    sdmL13: ref.sdmL13
  };
}

print("refBU loaded into memory.");

db.billingKeyHeaderTemp.drop();

print("Processing billingKeyHeader documents...");

const cursor = db.billingKeyHeader.find();
let count = 0;

while (cursor.hasNext()) {
  const doc = cursor.next();

  // Enrich each allocation with corresponding levels from refBUMap
  const enrichedAllocations = (doc.allocations || []).map(a => {
    const refData = refBUMap[a.SNODE];
    return {
      ...a,
      levels: refData || null
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
  if (count % 1000 === 0) print(`Processed ${count} documents...`);
}

print(`Done. Processed ${count} documents into billingKeyHeaderTemp.`);
