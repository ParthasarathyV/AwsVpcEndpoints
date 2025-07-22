const fs = require('fs');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Load payload from file
const payload = JSON.parse(fs.readFileSync('./payload.json', 'utf-8'));

// Replace a field (e.g., key2 or ipLongId) with UUID
payload.key2 = uuidv4(); // or payload.ipLongId = uuidv4();

// Set up query params
const params = {
  eventType: 'IP_COST_DETAILS',
  ipLongId: '8710bb01-d407-48ba-98b6-ce731888d37e',
  planId: '8263cc2d-e38d-46e5-a305-620460857f29',
  scenario: 'outlook',
  verId: '2024-03-01-22-00-02-000004-EST',
  action: 'delete'
};

// Axios POST with query params and payload body
axios.post('http://localhost:8080/financials-cost-consumer/costs/testPost', payload, {
  headers: {
    'Content-Type': 'application/json'
  },
  params
})
.then(response => {
  console.log('Status:', response.status);
  console.log('Response:', response.data);
})
.catch(error => {
  console.error('Request failed:', error.message);
});
