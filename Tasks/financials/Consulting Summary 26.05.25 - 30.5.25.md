# Consolidated Technical Summary

## 1. Timestamp Logging
- Implemented timestamp logging at every step of the transaction:
  - L4 upsert
  - Aggregation
  - L3 bulkWrite
  - Audit write
  - Total transaction time

## 2. Transaction Rollback
- Confirmed rollback is fully supported with `bulkWrite`, provided that all operations are wrapped in a `withTransaction()` block and handled with `try...catch` inside the function.
- Exception thrown inside the `withTransaction()` block will trigger a rollback as expected.

## 3. aggResults Loop Bypass
- Loop bypass is not possible when using `bulkWrite` upserts.
- MongoDB requires a per-document filter (e.g., `ipLongId`, `planId`, `year`) for each `updateOne` upsert operation.
- This necessitates iterating over `aggResults` to construct bulk operations.
- If performing a pure `insertMany` (no upsert), then you can bypass the loop and insert as a single batch.

## 4. Importing the Same JSON File Twice
- Importing the same file without `upsert` logic results in duplicate records.
- To ensure upsert behavior:
  - Loop through each document.
  - Extract unique key fields (e.g., `ipLongId`, `planId`, `year`).
  - Use `updateOne(..., { upsert: true })` logic.
- A ZIP file was provided containing logic to loop through files and upsert documents based on unique keys.

## 5. 16KB or 32KB MongoDB Limit
- No official limits exist for 16KB or 32KB in MongoDB.
- Confirmed limits:
  - 16MB max BSON document size.
  - 100MB in-memory cap for aggregation operations (without `allowDiskUse`).
- Will confirm with MongoDB Consulting Engineer if any obscure 16KB/32KB boundaries are internally enforced.

## 6. Schema Validation
- A ZIP file will be provided that includes:
  - Collection creation command with `validator` and `$jsonSchema`.
  - Schema enforcing structure such as array size, required fields, and types (e.g., ensuring 12-element arrays in `monthCost`, valid `fyCost` as number).

## 7. Wildcard Index on `outlook.*.fyCost`
- Attempting to create an index like `{ "outlook.$**.fyCost": 1 }` fails. MongoDB does not allow wildcard indexes beyond one path segment.
- Valid alternative:
  ```js
  db.collection.createIndex({ "outlook.$**": 1 })
  ```
  - This indexes all nested fields under `outlook`, including `fyCost` under `outlook.2025`, `outlook.2026`, etc.
  - Allows queries like:
    ```js
    db.collection.find({ "outlook.2025.fyCost": { $gt: 100000 } })
    ```

## 8. Recommended Structural Change
- To enable precise indexing on `fyCost`, plan is to refactor the `outlook` structure to an array of year-specific objects, such as:
  ```json
  "outlook": [
    { "year": 2025, "fyCost": 12345.67, "monthHC": [...], "monthCost": [...] },
    { "year": 2026, "fyCost": 8910.11, ... }
  ]
  ```
- This structure allows:
  - Creation of efficient compound indexes:
    ```js
    db.collection.createIndex({ "outlook.year": 1, "outlook.fyCost": 1 })
    ```
  - Use of `$elemMatch` queries:
    ```js
    db.collection.find({
      outlook: { $elemMatch: { year: 2025, fyCost: { $gt: 100000 } } }
    });
    ```
