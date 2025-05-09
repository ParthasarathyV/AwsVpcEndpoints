const fs = require("fs");
const readline = require("readline");

const inputFile = "data.txt";
const rl = readline.createInterface({
  input: fs.createReadStream(inputFile),
  crlfDelay: Infinity
});

let index = 1;

rl.on("line", (line) => {
  const filename = `${index}.txt`;
  fs.writeFileSync(filename, line.trim());
  console.log(`Saved ${filename}`);
  index++;
});

rl.on("close", () => {
  console.log("Done splitting lines into individual .txt files.");
});
