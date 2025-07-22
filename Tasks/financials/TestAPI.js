const fs = require('fs');
const axios = require('axios');

// Load and parse the payload from file
const rawData = fs.readFileSync('./payload.json', 'utf-8');
const payload = JSON.parse(rawData);

// Modify one field
payload.key2 = 'newValue2';  // change key2

// POST request
axios.post('http://localhost:3000/api/data', payload, {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_token_here' // optional
  }
})
.then(res => console.log('Response:', res.data))
.catch(err => console.error('Error:', err.message));
