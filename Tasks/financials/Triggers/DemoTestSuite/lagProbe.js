const { MongoClient, ObjectId } = require('mongodb');
const cfg = require('./config');

const N = 50;
const TAG = `lag_${Date.now()}`;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function measure() {
  console.log('Lag probe (per-doc sequential, N=50)');
  const client = new MongoClient(cfg.URI);
  await client.connect();
  const s = client.db(cfg.SOURCE_DB).collection(cfg.SOURCE_COLLECTION);
  const d = client.db(cfg.DEST_DB).collection(cfg.DEST_COLLECTION);

  try {
    await s.deleteMany({ tag: TAG });
    await d.deleteMany({ tag: TAG });

    const insertLags = [];
    const ids = [];

    // Insert sequentially and measure replication time per doc
    for (let i = 0; i < N; i++) {
      const _id = new ObjectId();
      const ts = new Date();
      await s.insertOne({ _id, tag: TAG, n: i, v: 'orig', ts });
      const t0 = ts.getTime();
      // Poll destination until present
      while (true) {
        const doc = await d.findOne({ _id });
        if (doc) break;
        await sleep(10);
      }
      insertLags.push(Date.now() - t0);
      ids.push(_id);
    }

    const avgIns = insertLags.reduce((a,b)=>a+b,0)/insertLags.length;
    const p95Ins = insertLags.slice().sort((a,b)=>a-b)[Math.floor(0.95*(insertLags.length-1))];
    console.log(`Insert lag: avg=${avgIns.toFixed(1)} ms, p95=${p95Ins} ms, max=${Math.max(...insertLags)} ms`);

    // Update sequentially and measure replication
    const updateLags = [];
    for (let i = 0; i < N; i++) {
      const _id = ids[i];
      const marker = new Date();
      await s.updateOne({ _id }, { $set: { v: 'upd', updatedAt: marker } });
      const t0 = Date.now();
      while (true) {
        const doc = await d.findOne({ _id });
        if (doc && doc.updatedAt && doc.updatedAt >= marker) break;
        await sleep(10);
      }
      updateLags.push(Date.now() - t0);
    }

    const avgUpd = updateLags.reduce((a,b)=>a+b,0)/updateLags.length;
    const p95Upd = updateLags.slice().sort((a,b)=>a-b)[Math.floor(0.95*(updateLags.length-1))];
    console.log(`Update lag: avg=${avgUpd.toFixed(1)} ms, p95=${p95Upd} ms, max=${Math.max(...updateLags)} ms`);

  } finally {
    await client.close();
  }
}

if (require.main === module) measure();


