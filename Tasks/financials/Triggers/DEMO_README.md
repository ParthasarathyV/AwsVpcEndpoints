# End-to-End Demo: Atlas App Services Trigger (db1.coll1 → db2.coll1)

## What this demo shows
- Source namespace: `db1.coll1`
- Destination namespace: `db2.coll1`
- A trigger function upserts inserts/updates from source to destination
- Simple Node test performs 1000 inserts and updates and reports replication lag

## Structure
- `DemoTriggerApp/` — App Services project to deploy
  - `data_sources/mongodb-atlas/config.json` — links to Atlas cluster `TriggerTester`
  - `functions/updateCollectionView.js` — sync logic db1.coll1 → db2.coll1
  - `triggers/trigger0.json` — watches `db1.coll1`
- `DemoTestSuite/` — Node test harness
  - `config.js` — connection string + db/collection names
  - `quickDemoTest.js` — 1000 inserts + updates; measures lag on 100-doc sample

## Prerequisites
- Node 18+
- Atlas App Services CLI installed and logged in
  - See `Triggers/atlasLogin.sh` for example commands
- An Atlas cluster named `TriggerTester` (or update the cluster name in `DemoTriggerApp/data_sources/mongodb-atlas/config.json`)
- A user/connection string with read/write to `db1` and `db2`

## 1) Initialize or use provided app scaffold
This repo already contains a valid project under `DemoTriggerApp/`.
If you needed to initialize from scratch, you could run:
```
appservices apps init --name DemoTriggerApp --provider-region aws-us-east-1 --deployment-model LOCAL -y
```

## 2) Configure cluster/service
- Edit `DemoTriggerApp/data_sources/mongodb-atlas/config.json` if your cluster name isn’t `TriggerTester`.

## 3) Deploy (create or update the app)
From `Triggers/DemoTriggerApp`:
```
appservices push --remote DemoTriggerApp -y
```
- First push will create the app; subsequent pushes will update it.
- Note the generated App ID in the output (e.g., `demotriggerapp-xxxxx`).

## 4) Configure test connection
Edit `Triggers/DemoTestSuite/config.js` and set:
```
URI: 'mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/?retryWrites=true&w=majority',
SOURCE_DB: 'db1', SOURCE_COLLECTION: 'coll1',
DEST_DB: 'db2',   DEST_COLLECTION: 'coll1'
```

## 5) Run the demo (insert + update only)
From `Triggers/DemoTestSuite`:
```
npm install
npm run quick
```
What it does:
- Inserts 1000 docs into `db1.coll1`
  - The first 100 are inserted sequentially and per-document insertion lag is measured
- Bulk updates all to `v=upd` and measures update lag on the same 100-doc sample
- Prints average and max lag numbers

## 6) Expected output
- Insert replication lag roughly sub-second on average (environment-dependent)
- Update replication lag usually faster than inserts

## Troubleshooting
- If push complains about project format, re-run init or ensure directory is the project root
- Make sure the Atlas user has read/write to both `db1` and `db2`
- Check App Services logs for trigger errors
- Increase polling intervals in the test if needed for very slow environments

## Pricing note (Atlas Triggers / App Services)
- **What’s included**: Triggers run on Atlas App Services, which is available on dedicated clusters like M30/M60.
- **Billing**: App Services usage (including Triggers) is billed separately from cluster cost and measured daily with a shared project free tier. Daily free tier thresholds: 50,000 requests, 25 hours of compute, 30,000 minutes of sync runtime, and 0.5 GB of data transfer; beyond that is pay‑as‑you‑go.
- **Official references**:
  - [MongoDB Atlas Pricing](https://www.mongodb.com/pricing)
  - [Atlas App Services Billing](https://www.mongodb.com/docs/atlas/app-services/billing/)
  - [Atlas Triggers Overview](https://www.mongodb.com/docs/atlas/app-services/triggers/overview/)
