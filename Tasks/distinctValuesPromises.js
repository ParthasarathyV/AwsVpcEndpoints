// distinctValuesWithTiming.js
// This script collects distinct values for multiple fields from the proposals collection,
// logs the time taken for each distinct query, and outputs the final results.

// List the fields for which you want distinct values:
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

// Object to hold the final results for each field
const results = {};

// Record start of entire operation
const overallStart = new Date().getTime();

// Loop through each field and execute the distinct query synchronously
fields.forEach(function(field) {
  // Log the start time for this field
  const startTime = new Date().getTime();
  
  // Run the distinct query for the current field
  let distinctValues = db.proposals.distinct(field);
  
  // Log the end time for this query
  const endTime = new Date().getTime();
  
  // Calculate the time difference in milliseconds
  const diff = endTime - startTime;
  
  // Sort the distinct values for predictable output
  distinctValues.sort();
  
  // Save the sorted values in the results object
  results[field] = distinctValues;
  
  // Log the time taken for this distinct query
  print("Field: " + field + " - Time taken: " + diff + " ms");
});

// Log the overall time taken
const overallEnd = new Date().getTime();
print("Overall time taken: " + (overallEnd - overallStart) + " ms");

// Finally, print the aggregated results
printjson(results);
