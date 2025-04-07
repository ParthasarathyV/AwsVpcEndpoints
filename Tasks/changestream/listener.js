const { MongoClient } = require("mongodb");

const uri = "YOUR_MONGODB_URI";
const dbName = "your_db_name";

const client = new MongoClient(uri);

async function watchAppMappings() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(dbName);
    const appMappings = db.collection("appMappings");
    const finGrid = db.collection("FinGrid");

    const changeStream = appMappings.watch([{ $match: { operationType: "update" } }]);
    console.log("Watching for updates in appMappings...");

    changeStream.on("change", async (change) => {
      const updatedDocId = change.documentKey._id;
      const updatedDoc = await appMappings.findOne({ _id: updatedDocId });

      if (!updatedDoc) return;

      const { ipLongId, scenario, year } = updatedDoc;
      const dfKey = `${scenario}${year}`;

      const allMappings = await appMappings.find({ ipLongId, scenario, year }).toArray();

      const finDoc = await finGrid.findOne({ longId: ipLongId });
      const monthCost =
        finDoc?.detailedFinancials?.[dfKey]?.monthCost || [];

      if (monthCost.length !== 12) {
        console.warn("Month cost invalid or missing for", ipLongId);
        return;
      }

      const monthValues = Array.from({ length: 12 }, (_, i) => ({
        month: String(i + 1).padStart(2, '0'),
        application: []
      }));

      for (const doc of allMappings) {
        doc.months?.forEach((monthData, i) => {
          if (monthData?.application?.length) {
            monthData.application.forEach(app => {
              const baseCost = monthCost[i] || 0;
              monthValues[i].application.push({
                ...app,
                cap_cost: (app.ip_cap_percent || 0) * baseCost,
                app_cost: (app.app_percentage || 0) * baseCost
              });
            });
          }
        });
      }

      const yearlyMap = {};

      monthValues.forEach(m => {
        m.application.forEach(app => {
          const key = app.app_id;
          if (!yearlyMap[key]) {
            yearlyMap[key] = {
              app_id: app.app_id,
              ip_cap_percent: 0,
              app_percentage: 0,
              cap_cost: 0,
              app_cost: 0
            };
          }

          yearlyMap[key].ip_cap_percent += app.ip_cap_percent || 0;
          yearlyMap[key].app_percentage += app.app_percentage || 0;
          yearlyMap[key].cap_cost += app.cap_cost || 0;
          yearlyMap[key].app_cost += app.app_cost || 0;
        });
      });

      const yearlyValues = Object.values(yearlyMap);

      await finGrid.updateOne(
        { longId: ipLongId },
        {
          $set: {
            [`detailedFinancials.${dfKey}.appMappings.monthValues`]: monthValues,
            [`detailedFinancials.${dfKey}.appMappings.yearlyValues`]: yearlyValues
          }
        }
      );

      console.log(`Updated FinGrid for ${ipLongId} (${scenario} - ${year})`);
    });

  } catch (err) {
    console.error("Error in listener:", err);
  }
}

watchAppMappings();
