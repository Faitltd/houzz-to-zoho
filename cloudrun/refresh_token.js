/**
 * Script to refresh Zoho access token
 * 
 * Usage:
 * node refresh_token.js
 */

const axios = require('axios');

// Configuration
const CLIENT_ID = '1000.V62XITF7A5T1PPQEADQVTFIIU33CLL';
const CLIENT_SECRET = '336885f0b0dd1d9f62e2807d495f0bd42f25d31479';
const REFRESH_TOKEN = '1000.0d9f75bb0cfec85bb4319b98195473ae.cbdeca7be0a250c9ce9d8380ab3965e4';

// Test endpoints
const endpoints = [
  {
    name: 'US',
    url: 'https://accounts.zoho.com/oauth/v2/token'
  },
  {
    name: 'EU',
    url: 'https://accounts.zoho.eu/oauth/v2/token'
  },
  {
    name: 'AU',
    url: 'https://accounts.zoho.com.au/oauth/v2/token'
  },
  {
    name: 'IN',
    url: 'https://accounts.zoho.in/oauth/v2/token'
  }
];

// Test each endpoint
async function refreshToken() {
  console.log('Attempting to refresh Zoho access token...\n');
  
  for (const endpoint of endpoints) {
    console.log(`Testing ${endpoint.name} endpoint: ${endpoint.url}`);
    
    try {
      const response = await axios.post(endpoint.url, null, {
        params: {
          refresh_token: REFRESH_TOKEN,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          grant_type: 'refresh_token'
        }
      });
      
      console.log(`✅ ${endpoint.name} endpoint works!`);
      console.log(`Status: ${response.status}`);
      console.log(`Response: ${JSON.stringify(response.data, null, 2)}\n`);
      
      // Save the access token to a file
      console.log(`Access Token: ${response.data.access_token}`);
      console.log(`Expires In: ${response.data.expires_in} seconds`);
      
      return response.data;
    } catch (error) {
      console.log(`❌ ${endpoint.name} endpoint failed!`);
      console.log(`Status: ${error.response?.status || 'Unknown'}`);
      console.log(`Error: ${error.response?.data ? JSON.stringify(error.response.data, null, 2) : error.message}\n`);
    }
  }
  
  console.log('❌ All endpoints failed to refresh the token.');
  return null;
}

// Run the refresh
refreshToken()
  .then(result => {
    if (result) {
      console.log('✅ Successfully refreshed token!');
    } else {
      console.log('❌ Failed to refresh token.');
    }
  })
  .catch(error => {
    console.error('Error:', error.message);
  });
