/**
 * Test script to check Zoho API connectivity
 * 
 * Usage:
 * node test_zoho_api.js
 */

const axios = require('axios');

// Configuration
const CLIENT_ID = '1000.V62XITF7A5T1PPQEADQVTFIIU33CLL';
const CLIENT_SECRET = '336885f0b0dd1d9f62e2807d495f0bd42f25d31479';
const ORGANIZATION_ID = '862183465';
const ACCESS_TOKEN = '336885f0b0dd1d9f62e2807d495f0bd42f25d31479';

// Test endpoints
const endpoints = [
  {
    name: 'US',
    url: 'https://books.zoho.com/api/v3/organizations',
    headers: {
      'Authorization': `Zoho-oauthtoken ${ACCESS_TOKEN}`
    },
    params: {
      organization_id: ORGANIZATION_ID
    }
  },
  {
    name: 'EU',
    url: 'https://books.zoho.eu/api/v3/organizations',
    headers: {
      'Authorization': `Zoho-oauthtoken ${ACCESS_TOKEN}`
    },
    params: {
      organization_id: ORGANIZATION_ID
    }
  },
  {
    name: 'AU',
    url: 'https://books.zoho.com.au/api/v3/organizations',
    headers: {
      'Authorization': `Zoho-oauthtoken ${ACCESS_TOKEN}`
    },
    params: {
      organization_id: ORGANIZATION_ID
    }
  }
];

// Test each endpoint
async function testEndpoints() {
  console.log('Testing Zoho API endpoints...\n');
  
  for (const endpoint of endpoints) {
    console.log(`Testing ${endpoint.name} endpoint: ${endpoint.url}`);
    
    try {
      const response = await axios.get(endpoint.url, {
        headers: endpoint.headers,
        params: endpoint.params
      });
      
      console.log(`✅ ${endpoint.name} endpoint works!`);
      console.log(`Status: ${response.status}`);
      console.log(`Response: ${JSON.stringify(response.data, null, 2)}\n`);
    } catch (error) {
      console.log(`❌ ${endpoint.name} endpoint failed!`);
      console.log(`Status: ${error.response?.status || 'Unknown'}`);
      console.log(`Error: ${error.response?.data ? JSON.stringify(error.response.data, null, 2) : error.message}\n`);
    }
  }
}

// Test with different authorization formats
async function testAuthFormats() {
  console.log('Testing different authorization formats...\n');
  
  const authFormats = [
    {
      name: 'Zoho-oauthtoken',
      header: `Zoho-oauthtoken ${ACCESS_TOKEN}`
    },
    {
      name: 'Bearer',
      header: `Bearer ${ACCESS_TOKEN}`
    },
    {
      name: 'OAuth',
      header: `OAuth ${ACCESS_TOKEN}`
    }
  ];
  
  for (const format of authFormats) {
    console.log(`Testing ${format.name} format: ${format.header}`);
    
    try {
      const response = await axios.get('https://books.zoho.com/api/v3/organizations', {
        headers: {
          'Authorization': format.header
        },
        params: {
          organization_id: ORGANIZATION_ID
        }
      });
      
      console.log(`✅ ${format.name} format works!`);
      console.log(`Status: ${response.status}`);
      console.log(`Response: ${JSON.stringify(response.data, null, 2)}\n`);
    } catch (error) {
      console.log(`❌ ${format.name} format failed!`);
      console.log(`Status: ${error.response?.status || 'Unknown'}`);
      console.log(`Error: ${error.response?.data ? JSON.stringify(error.response.data, null, 2) : error.message}\n`);
    }
  }
}

// Run tests
async function runTests() {
  try {
    await testEndpoints();
    await testAuthFormats();
  } catch (error) {
    console.error('Error running tests:', error.message);
  }
}

runTests();
