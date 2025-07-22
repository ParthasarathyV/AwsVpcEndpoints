const fs = require('fs');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Load base payload template
const basePayload = JSON.parse(fs.readFileSync('./payload.json', 'utf-8'));

// Function to create a single request with unique UUID
const createRequest = () => {
  const proposalId = uuidv4();
  
  // Clone and modify payload
  const payload = JSON.parse(JSON.stringify(basePayload));
  payload.proposalId = proposalId;

  // Define query parameters
  const params = {
    eventType: 'IP_COST_DETAILS',
    ipLongId: proposalId,
    planId: '8263cc2d-e38d-46e5-a305-620460857f29',
    scenario: 'outlook',
    verId: '2024-03-01-22-00-02-000004-EST',
    action: 'delete'
  };

  // Return the axios POST request promise
  return axios.post('http://localhost:8080/financials-cost-consumer/costs/testPost', payload, {
    headers: { 'Content-Type': 'application/json' },
    params
  });
};

// Create 10 promises
const requests = Array.from({ length: 10 }, createRequest);

// Send all requests concurrently
Promise.allSettled(requests)
  .then(results => {
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        console.log(`Request ${i + 1} - ✅ Status: ${result.value.status}`);
      } else {
        console.error(`Request ${i + 1} - ❌ Error: ${result.reason.message}`);
      }
    });
  });
