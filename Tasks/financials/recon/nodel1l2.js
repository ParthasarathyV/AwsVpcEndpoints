/* compare-verIds.js
 *
 * Find proposalIds whose outlook.verId in lvl1financialssummary
 * does NOT match the set of outlook[].verId values in lvl2financialssummary.
 *
 * Run inside an open mongosh session with:
 *     load("compare-verIds.js")
 */

/* ── helper #1 ──  lvl1  :  proposalId → single verId (or null) ──────────── */
function buildMapLvl1() {
  const map = {};  // { proposalId : verId | null }

  db.lvl1financialssummary.aggregate([
    {
      $group: {
        _id:   "$proposalId",
        verId: { $first: "$outlook.verId" }   // only one per doc
      }
    }
  ]).forEach(doc => {
    map[doc._id] = doc.verId;                // may be undefined / null
  });

  return map;
}

/* ── helper #2 ──  lvl2  :  proposalId → sorted array of unique verIds ──── */
function buildMapLvl2() {
  const map = {};  // { proposalId : [verIds…] }

  db.lvl2financialssummary.aggregate([
    { $unwind: "$outlook" },
    {
      $group: {
        _id:    "$proposalId",
        verIds: { $addToSet: "$outlook.verId" }
      }
    }
  ]).forEach(doc => {
    map[doc._id] = doc.verIds.sort();
  });

  return map;
}

/* ── main ── compare the two maps and report mismatches ─────────────────── */
(function compare() {
  const l1 = buildMapLvl1();
  const l2 = buildMapLvl2();

  const allProposals = new Set(Object.keys(l1).concat(Object.keys(l2)));

  allProposals.forEach(pid => {
    const v1  = l1.hasOwnProperty(pid) ? l1[pid]  : null;   // scalar or null
    const v2a = l2[pid] || [];                              // always an array

    const match =
      v1 !== null &&
      v2a.length === 1 &&
      v2a[0] === v1;

    if (!match) {
      print(
        `Mismatch - proposalId: ${pid}` +
        ` | lvl1 verId: ${v1 === null ? "-" : v1}` +
        ` | lvl2 verIds: [${v2a.join(",")}]`
      );
    }
  });
})();

/* ── optional: add these once for big collections to avoid COLLSCANs ───────
db.lvl1financialssummary.createIndex({ proposalId: 1, "outlook.verId": 1 });
db.lvl2financialssummary.createIndex({ proposalId: 1, "outlook.verId": 1 });
*/
