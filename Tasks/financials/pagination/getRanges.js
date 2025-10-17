// getRanges.js
// Hardcoded for db.financials.costsAuditCollection
// Usage inside mongosh:
//   load("getRanges.js")
//   getRanges(1000)    // page size argument only

function getRanges(pageSize) {
  const dbName = "financials";
  const colName = "costsAuditCollection";

  const coll = db.getSiblingDB(dbName).getCollection(colName);
  const total = coll.estimatedDocumentCount();
  if (total === 0) {
    print(`No documents found in ${dbName}.${colName}`);
    return;
  }

  const totalPages = Math.ceil(total / pageSize);
  const maxDoc = coll.find({}, { _id: 1 }).sort({ _id: -1 }).limit(1).toArray();
  const maxId = maxDoc[0]._id;

  const ranges = [];
  let lastId = null;

  print(`Building ranges for ${dbName}.${colName}`);
  print(`Estimated total docs: ${total}, Page size: ${pageSize}, Expected pages: ${totalPages}`);

  for (let page = 1; page <= totalPages; page++) {
    const query = lastId
      ? { _id: { $gt: lastId, $lte: maxId } }
      : { _id: { $lte: maxId } };

    const batch = coll.find(query, { _id: 1 })
                      .sort({ _id: 1 })
                      .limit(pageSize)
                      .toArray();

    if (batch.length === 0) {
      print(`Stopped early at page ${page} (no more documents found).`);
      break;
    }

    ranges.push(batch[0]._id.valueOf());
    lastId = batch[batch.length - 1]._id;

    if (page % 10 === 0 || page === totalPages) {
      const pct = ((page / totalPages) * 100).toFixed(1);
      print(`Progress: ${page}/${totalPages} pages (${pct}%)`);
    }

    // Safety stop: prevent runaway loops
    if (page > totalPages * 2) {
      print("Safety stop triggered (loop exceeded 2x expected pages).");
      break;
    }
  }

  const out = ranges.map((startId, i) => ({
    page: i + 1,
    startId,
    nextStartId: ranges[i + 1] || null
  }));

  const result = {
    database: dbName,
    collection: colName,
    pageSize,
    pages: out.length,
    estimatedTotalDocs: total,
    maxId: maxId.valueOf(),
    ranges: out
  };

  const json = JSON.stringify(result, null, 2);
  const filename = `ranges_${colName}_${pageSize}.json`;

  writeFile(filename, json);
  print(`Created ${filename} (${out.length} ranges)`);

  return result;
}

// Helper to safely write files from mongosh
function writeFile(filename, data) {
  const f = new File(filename, "w");
  f.write(data);
  f.close();
}
