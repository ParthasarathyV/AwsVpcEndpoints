const fs = require("fs");

const filePath = "input.json";
let docs;
try {
  docs = JSON.parse(fs.readFileSync(filePath, "utf8"));
  print(`Loaded ${docs.length} documents from ${filePath}`);
} catch (err) {
  print("Failed to read or parse input JSON file.");
  print(err);
  quit(1);
}

const coll = db.getSiblingDB("financials").getCollection("l4Temp");

for (let i = 0; i < docs.length; i++) {
  const doc = docs[i];
  const filter = { ipLongId: doc.ipLongId };

  try {
    const result = coll.replaceOne(filter, doc, { upsert: true });
    print(`Upserted ${i + 1}/${docs.length}`);
    printjson(result);
  } catch (e) {
    print(`Error on document ${i + 1}:`);
    printjson(doc);
    print("Aborting remaining inserts...");
    print(e);
    quit(1);
  }
}
