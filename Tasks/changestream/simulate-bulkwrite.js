// simulate-mongo-bulk.js

const targetId = ObjectId("YOUR_OBJECT_ID_HERE"); // Replace with your _id

function getRandomPercent() {
  return parseFloat((Math.random() * 0.2).toFixed(4));
}

// Fetch document
const doc = db.financialLevel3.findOne({ _id: targetId });

if (!doc || !doc.months || doc.months.length === 0) {
  print("Document not found or no months array.");
  quit();
}

const bulkOps = [];

print("=== Preparing 100 Random Updates ===");

for (let i = 0; i < 100; i++) {
  const monthIndex = Math.floor(Math.random() * doc.months.length);
  const month = doc.months[monthIndex];

  if (!month.application || month.application.length === 0) {
    print(`Skipping update ${i + 1}: Month index ${monthIndex} has no applications.`);
    continue;
  }

  const appIndex = Math.floor(Math.random() * month.application.length);
  const newValue = getRandomPercent();
  const updatePath = `months.${monthIndex}.application.${appIndex}.ip_cap_percent`;

  print(`Update ${i + 1}: SET ${updatePath} = ${newValue}`);

  bulkOps.push({
    updateOne: {
      filter: { _id: targetId },
      update: { $set: { [updatePath]: newValue } }
    }
  });
}

if (bulkOps.length > 0) {
  const result = db.financialLevel3.bulkWrite(bulkOps);
  print("=== Bulk Write Result ===");
  printjson(result);
} else {
  print("No updates were prepared.");
}
