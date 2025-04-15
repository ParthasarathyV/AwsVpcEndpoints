// script.js
// This script is intended for use in mongosh.
// It will run distinct queries for each of the specified fields,
// sort the results, and print a JSON object mapping each field to its distinct values.

// Update your field array as needed:
const fields = [
  "rag",
  "executionState",
  "executionOnly",
  "openForTimeEntry",
  "type",
  "state",
  "benefitsReportingLevel",
  "l1SponsorOrganization",
  "l2SponsorOrganization",
  "l3SponsorOrganization",
  "l1OwningOrganization",
  "l2OwningOrganization",
  "l3OwningOrganization",
  "inPlan",
  "regionalImpact",
  "milestoneDeliveryTeams"
];

// This object will hold the distinct values for each field
const results = {};

// Create an array of Promises for each field
const distinctPromises = fields.map(field => {
  return db.proposals.distinct(field).then(values => {
    // Sort the array of distinct values for consistent output
    values.sort();
    // Store it in our results object under the field name
    results[field] = values;
  });
});

// Wait for all distinct queries to finish
await Promise.all(distinctPromises);

// Print the final JSON object
printjson(results);
