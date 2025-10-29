const { MongoClient, ObjectId } = require('mongodb');
const cfg = require('./config');

const NUM = 1000;
const SAMPLE_FOR_LAG = 100; // measure lag on a subset per request
const TAG = `demo_${Date.now()}`;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function waitCount(coll, filter, expected, label, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const c = await coll.countDocuments(filter);
    if (c === expected) { console.log(`✅ ${label}: ${c}`); return true; }
    await sleep(1000);
  }
  const final = await coll.countDocuments(filter);
  console.log(`❌ ${label}: expected ${expected}, got ${final}`);
  return false;
}

async function main() {
  console.log('Demo Quick Test db1.coll1 -> db2.coll1');
  const client = new MongoClient(cfg.URI);
  await client.connect();
  const s = client.db(cfg.SOURCE_DB).collection(cfg.SOURCE_COLLECTION);
  const d = client.db(cfg.DEST_DB).collection(cfg.DEST_COLLECTION);
  try {
    await s.deleteMany({ tag: TAG });
    await d.deleteMany({ tag: TAG });

    const docs = Array.from({ length: NUM }, (_, i) => ({ _id: new ObjectId(), tag: TAG, n: i, v: 'orig', ts: new Date() }));
    console.log(`Inserting ${NUM} into db1.coll1...`);

    // Insert first 100 sequentially and measure per-doc insert lag
    console.log('Measuring insert replication lag on sample (n=100, sequential)...');
    const sampleDocs = docs.slice(0, SAMPLE_FOR_LAG);
    const insertLags = [];
    for (const doc of sampleDocs) {
      const t0 = Date.now();
      await s.insertOne(doc);
      while (true) {
        const found = await d.findOne({ _id: doc._id });
        if (found) break;
        await sleep(10);
      }
      insertLags.push(Date.now() - t0);
    }

    // Bulk insert the remaining docs
    const remaining = docs.slice(SAMPLE_FOR_LAG);
    if (remaining.length) {
      await s.insertMany(remaining, { ordered: false });
    }
    await waitCount(d, { tag: TAG }, NUM, 'dest inserts');
    const avgInsertLag = insertLags.reduce((a,b)=>a+b,0) / insertLags.length;
    const maxInsertLag = Math.max(...insertLags);
    console.log(`Insert replication lag: avg=${avgInsertLag.toFixed(1)} ms, max=${maxInsertLag} ms (n=${insertLags.length})`);

    console.log('Updating all to v=upd...');
    const updateMarker = new Date();
    await s.updateMany({ tag: TAG }, { $set: { v: 'upd', updatedAt: updateMarker } });

    // Measure update replication lag on the same sample (poll until updated)
    console.log('Measuring update replication lag on sample (n=100)...');
    const updateLags = [];
    for (const doc of sampleDocs) {
      const tStart = Date.now();
      while (true) {
        const ddoc = await d.findOne({ _id: doc._id });
        if (ddoc && ddoc.updatedAt && ddoc.updatedAt >= updateMarker) break;
        await sleep(10);
      }
      updateLags.push(Date.now() - tStart);
    }
    // Ensure all docs reflect update
    await waitCount(d, { tag: TAG, v: 'upd' }, NUM, 'dest updates');
    const avgUpdateLag = updateLags.reduce((a,b)=>a+b,0) / updateLags.length;
    const maxUpdateLag = Math.max(...updateLags);
    console.log(`Update replication lag: avg=${avgUpdateLag.toFixed(1)} ms, max=${maxUpdateLag} ms (n=${updateLags.length})`);

    // Skip deletes for this demo per request
    console.log('Done (insert + update only, no deletes).');
  } finally {
    await client.close();
  }
}

if (require.main === module) main();


