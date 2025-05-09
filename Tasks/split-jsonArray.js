const fs = require("fs");

const inputFile = "data.json"; // your source file
const chunkSize = 10000; // number of docs per file

const rawData = fs.readFileSync(inputFile);
const docs = JSON.parse(rawData);

const totalChunks = Math.ceil(docs.length / chunkSize);

for (let i = 0; i < totalChunks; i++) {
  const chunk = docs.slice(i * chunkSize, (i + 1) * chunkSize);
  const filename = `${i + 1}.json`;
  fs.writeFileSync(filename, JSON.stringify(chunk, null, 2));
  console.log(`Written ${filename} with ${chunk.length} documents`);
}
