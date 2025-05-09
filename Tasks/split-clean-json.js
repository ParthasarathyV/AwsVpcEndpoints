const fs = require("fs");
const readline = require("readline");

const inputFile = "data.txt";

const rl = readline.createInterface({
  input: fs.createReadStream(inputFile),
  crlfDelay: Infinity
});

let index = 0;
let lineNum = 0;
const lines = [];

rl.on("line", (line) => {
  lineNum++;
  lines.push(line.trim());
});

rl.on("close", () => {
  if (lines.length <= 2) {
    console.log("Not enough lines after skipping brackets.");
    return;
  }

  const contentLines = lines.slice(1, -1); // skip first and last

  contentLines.forEach((line, i) => {
    // remove trailing comma if present
    const cleanLine = line.endsWith(",") ? line.slice(0, -1) : line;
    const filename = `${i + 1}.json`;
    fs.writeFileSync(filename, cleanLine);
    console.log(`Saved ${filename}`);
  });

  console.log(`Done. ${contentLines.length} files created.`);
});
