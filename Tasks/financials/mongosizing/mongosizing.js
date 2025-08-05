/**
 * DB + Collection Stats (KB/MB/BYTES) with Simple Schema (field -> type)
 * + Optional Max Doc Size (off | sample | full)
 * MongoDB 6.x+, mongosh
 * -------------------------------------------------------
 * Emits a single JSON/EJSON object and saves to ./meta.json.
 */

const CONFIG = {
  // ---- Units for size fields ----
  UNIT: 'KB',                        // 'KB' (default) | 'MB' | 'BYTES'

  // ---- Output file (relative to current working dir) ----
  outputPath: 'meta.json',

  // ---- Scope / behavior ----
  includeSystemDBs: false,           // include admin, config, local
  includeSystemCollections: false,   // include system.* collections
  maxCollectionsPerDB: 0,            // 0 = no limit

  // ---- Schema sampling ----
  schemaSampleDocs: 5,               // set to 1 if docs are uniform
  walkArraysDeep: true,              // expand arrays to "field[].subfield"

  // ---- Max doc size computation ----
  //   'off'    -> skip
  //   'sample' -> compute max over a random sample (fast, approximate)
  //   'full'   -> compute exact max over all docs (full scan; OK for <=50k docs)
  computeMaxDocSize: 'off',
  maxDocSampleSize: 10000,           // used when computeMaxDocSize = 'sample'
  maxTimeMSPerAgg: 60000,            // cap each aggregation to 60s (safety)

  quietWarnings: true                // set false for non-fatal warnings
};

// --- Unit helpers ---
const UNITS = {
  BYTES: { scale: 1, label: 'Bytes' },
  KB:    { scale: 1024, label: 'KB' },
  MB:    { scale: 1024 * 1024, label: 'MB' }
};
const UNIT = UNITS[CONFIG.UNIT] || UNITS.KB;

function toUnit(n) { return (typeof n === 'number') ? n / UNIT.scale : null; }
function round3(n) { return (typeof n === 'number') ? Math.round(n * 1000) / 1000 : n; }
function warn(...args) { if (!CONFIG.quietWarnings) print('[WARN]', ...args); }
function tryCall(fn, fallback) { try { return fn(); } catch (e) { warn(e.message); return fallback; }}

// --- Type detection (BSON-ish) ---
function bsonTypeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (v instanceof Date) return 'date';
  if (v instanceof RegExp) return 'regex';
  if (typeof v === 'string') return 'string';
  if (typeof v === 'boolean') return 'bool';
  if (typeof v === 'number') return Number.isInteger(v) ? 'int' : 'double';
  if (typeof v === 'bigint') return 'long';
  if (v && typeof v === 'object') {
    switch (v._bsontype) {
      case 'ObjectID': return 'objectId';
      case 'Decimal128': return 'decimal';
      case 'Long': return 'long';
      case 'Int32': return 'int';
      case 'Double': return 'double';
      case 'Binary': return 'binData';
      case 'Timestamp': return 'timestamp';
      case 'MinKey': return 'minKey';
      case 'MaxKey': return 'maxKey';
      case 'BSONRegExp': return 'regex';
      case 'Code': return 'javascript';
      case 'DBRef': return 'dbPointer';
    }
    return 'object';
  }
  return 'unknown';
}

// --- Schema (field -> type), no counts ---
function inferSchemaFromDocs(docs) {
  const typesByPath = Object.create(null);

  function add(path, type) {
    let set = typesByPath[path];
    if (!set) set = typesByPath[path] = new Set();
    set.add(type);
  }
  function unify(set) {
    const arr = Array.from(set);
    const noNull = arr.filter(t => t !== 'null' && t !== 'undefined');
    const finalArr = noNull.length ? noNull : arr;
    if (finalArr.length === 0) return 'unknown';
    if (finalArr.length === 1) return finalArr[0];
    return 'mixed<' + finalArr.sort().join('|') + '>';
  }
  function walk(path, val) {
    const t = bsonTypeOf(val);
    if (t === 'object') {
      if (path) add(path, 'object');
      for (const k of Object.keys(val)) walk(path ? path + '.' + k : k, val[k]);
    } else if (t === 'array') {
      let elemTypes = new Set();
      for (let i = 0; i < Math.min(val.length, 50); i++) {
        const et = bsonTypeOf(val[i]);
        elemTypes.add(et);
        if (CONFIG.walkArraysDeep && et === 'object') walk((path ? path : '') + '[]', val[i]);
      }
      elemTypes.delete('null');
      const list = Array.from(elemTypes);
      const elem = list.length === 0 ? 'unknown' : (list.length === 1 ? list[0] : 'mixed');
      add(path, `array<${elem}>`);
    } else {
      add(path, t);
    }
  }

  for (const d of docs) if (d && typeof d === 'object') walk('', d);

  const schema = {};
  for (const [path, set] of Object.entries(typesByPath)) {
    if (path === '') continue;
    schema[path] = unify(set);
  }
  return schema;
}

// --- Compute max doc size (bytes) according to config ---
function getMaxDocSizeBytes(coll) {
  const mode = (CONFIG.computeMaxDocSize || 'off').toLowerCase();
  if (mode === 'off') return null;

  const sampleStage =
    mode === 'sample' ? [{ $sample: { size: Math.max(1, CONFIG.maxDocSampleSize | 0) } }] : [];

  const pipeline = [
    ...sampleStage,
    { $project: { _id: 0, s: { $bsonSize: "$$ROOT" } } },
    { $group: { _id: null, maxS: { $max: "$s" } } }
  ];

  try {
    const res = coll.aggregate(pipeline, {
      allowDiskUse: true,
      maxTimeMS: CONFIG.maxTimeMSPerAgg || undefined
    }).toArray();
    return res[0]?.maxS ?? null;
  } catch (e) {
    warn(`maxDocSize failed for ${coll.getFullName()}: ${e.message}`);
    return null;
  }
}

// --- Per-collection ---
function analyzeCollection(dbName, ci) {
  const name = ci.name;
  if (!CONFIG.includeSystemCollections && name.startsWith('system.')) return null;

  const targetDB = db.getSiblingDB(dbName);
  const coll = targetDB.getCollection(name);
  const type = ci.type || 'collection';

  // coll.stats: size fields scaled by UNIT.scale; avgObjSize is bytes -> convert
  const stats = tryCall(() => coll.stats({ scale: UNIT.scale }), {});
  const count = (typeof stats.count === 'number') ? stats.count
               : tryCall(() => coll.estimatedDocumentCount(), null);

  const out = {
    collection: name,
    type,
    count
  };

  // Avg doc size (converted to UNIT)
  const avgKey = 'avgDocSize' + UNIT.label;
  out[avgKey] = (typeof stats.avgObjSize === 'number') ? round3(toUnit(stats.avgObjSize)) : null;

  // Optional: Max doc size (converted to UNIT)
  const mode = (CONFIG.computeMaxDocSize || 'off').toLowerCase();
  if (mode !== 'off') {
    const maxBytes = getMaxDocSizeBytes(coll);
    const maxKey = 'maxDocSize' + UNIT.label;
    out[maxKey] = (typeof maxBytes === 'number') ? round3(toUnit(maxBytes)) : null;
  }

  // Minimal schema from sample docs
  let schema = {};
  if (CONFIG.schemaSampleDocs > 0) {
    const cur = tryCall(
      () => coll.aggregate([{ $sample: { size: CONFIG.schemaSampleDocs } }], { allowDiskUse: true }),
      null
    );
    if (cur) {
      const docs = [];
      let i = 0;
      try { while (cur.hasNext() && i < CONFIG.schemaSampleDocs) { docs.push(cur.next()); i++; } }
      catch (e) { warn(`Sampling ${dbName}.${name}: ${e.message}`); }
      schema = inferSchemaFromDocs(docs);
    }
  }
  out.schema = schema;

  return out;
}

// --- Per-database ---
function analyzeDatabase(dbName) {
  const targetDB = db.getSiblingDB(dbName);
  const s = tryCall(() => targetDB.stats(UNIT.scale), {}); // size fields scaled; avgObjSize bytes

  const dataKey = 'dataSize' + UNIT.label;
  const storageKey = 'storageSize' + UNIT.label;
  const indexKey = 'indexSize' + UNIT.label;
  const avgKey = 'avgObjSize' + UNIT.label;

  const dbStats = {
    collections: s.collections,
    objects: s.objects,
    [dataKey]: typeof s.dataSize === 'number' ? round3(s.dataSize) : null,
    [storageKey]: typeof s.storageSize === 'number' ? round3(s.storageSize) : null,
    [indexKey]: typeof s.indexSize === 'number' ? round3(s.indexSize) : null,
    [avgKey]: typeof s.avgObjSize === 'number' ? round3(toUnit(s.avgObjSize)) : null
  };

  let collInfos = [];
  try { collInfos = targetDB.getCollectionInfos({}); }
  catch (e) { return { db: dbName, error: e.message, dbStats, collections: [] }; }

  const collections = [];
  let processed = 0;
  for (const ci of collInfos) {
    if (CONFIG.maxCollectionsPerDB && processed >= CONFIG.maxCollectionsPerDB) break;
    const info = analyzeCollection(dbName, ci);
    if (info) { collections.push(info); processed++; }
  }

  return { db: dbName, dbStats, collections };
}

// --- EJSON-friendly "generatedAt" (ISO string for simplicity) ---
function nowIso() {
  // Use ISO string to avoid EJSON $date shape (HTML viewer handles both anyway)
  return new Date().toISOString();
}

// --- Main ---
(function main() {
  const dbsRes = tryCall(() => db.adminCommand({ listDatabases: 1, nameOnly: true }), null);
  let dbNames = dbsRes && dbsRes.ok === 1 && dbsRes.databases ? dbsRes.databases.map(d => d.name) : [db.getName()];
  if (!CONFIG.includeSystemDBs) dbNames = dbNames.filter(n => !['admin','config','local'].includes(n));

  const databases = [];
  for (const name of dbNames) databases.push(analyzeDatabase(name));

  const result = { generatedAt: nowIso(), config: { ...CONFIG, UNIT: UNIT.label }, databases };

  // Prepare output (prefer EJSON relaxed for readability)
  let outStr;
  try { outStr = EJSON.stringify(result, { relaxed: true, indent: 2 }); }
  catch (e) { outStr = JSON.stringify(result, null, 2); }

  // Write to file (and print)
  try {
    const path = require('path');
    const fs = require('fs');
    const outPath = path.isAbsolute(CONFIG.outputPath)
      ? CONFIG.outputPath
      : path.resolve(process.cwd(), CONFIG.outputPath);
    fs.writeFileSync(outPath, outStr + '\n', 'utf8');
    print(`Saved report to: ${outPath}`);
  } catch (e) {
    print(`[WARN] Could not write file: ${e.message}`);
  }

  print(outStr);
})();
