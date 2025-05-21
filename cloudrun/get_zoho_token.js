/**
 * Script to get a new Zoho refresh token
 * 
 * Usage:
 * 1. Run this script: node get_zoho_token.js
 * 2. Open the URL in your browser
 * 3. Authorize the application
 * 4. Copy the code from the redirect URL
 * 5. Paste the code when prompted
 */

const axios = require('axios');
const readline = require('readline');

// Configuration
const CLIENT_ID = '1000.V62XITF7A5T1PPQEADQVTFIIU33CLL';
const CLIENT_SECRET = '336885f0b0dd1d9f62e2807d495f0bd42f25d31479';
const REDIRECT_URI = 'http://localhost:8000/callback';
const SCOPES = 'ZohoBooks.fullaccess.all';

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Step 1: Generate authorization URL
const authUrl = `https://accounts.zoho.com/oauth/v2/auth?scope=${SCOPES}&client_id=${CLIENT_ID}&response_type=code&access_type=offline&redirect_uri=${REDIRECT_URI}`;

console.log(`\nOpen this URL in your browser:\n${authUrl}\n`);
console.log('After authorization, you will be redirected to a URL containing a code parameter.');
console.log('Copy the entire redirect URL and paste it below:\n');

// Step 2: Get authorization code from user
rl.question('Paste the redirect URL here: ', async (redirectUrl) => {
  try {
    // Extract code from redirect URL
    const url = new URL(redirectUrl);
    const code = url.searchParams.get('code');
    
    if (!code) {
      console.error('No code found in the redirect URL');
      rl.close();
      return;
    }
    
    console.log(`\nGot authorization code: ${code}\n`);
    
    // Step 3: Exchange code for tokens
    console.log('Exchanging code for tokens...');
    
    // Try US endpoint
    try {
      console.log('Trying US endpoint...');
      const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
        params: {
          grant_type: 'authorization_code',
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code: code,
          redirect_uri: REDIRECT_URI
        }
      });
      
      console.log('\nSuccess! Here are your tokens:');
      console.log(JSON.stringify(response.data, null, 2));
      console.log('\nAdd the refresh_token to your environment variables as ZOHO_REFRESH_TOKEN');
    } catch (usError) {
      console.log('Failed with US endpoint, trying EU endpoint...');
      
      try {
        const response = await axios.post('https://accounts.zoho.eu/oauth/v2/token', null, {
          params: {
            grant_type: 'authorization_code',
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code: code,
            redirect_uri: REDIRECT_URI
          }
        });
        
        console.log('\nSuccess! Here are your tokens:');
        console.log(JSON.stringify(response.data, null, 2));
        console.log('\nAdd the refresh_token to your environment variables as ZOHO_REFRESH_TOKEN');
      } catch (euError) {
        console.log('Failed with EU endpoint, trying AU endpoint...');
        
        try {
          const response = await axios.post('https://accounts.zoho.com.au/oauth/v2/token', null, {
            params: {
              grant_type: 'authorization_code',
              client_id: CLIENT_ID,
              client_secret: CLIENT_SECRET,
              code: code,
              redirect_uri: REDIRECT_URI
            }
          });
          
          console.log('\nSuccess! Here are your tokens:');
          console.log(JSON.stringify(response.data, null, 2));
          console.log('\nAdd the refresh_token to your environment variables as ZOHO_REFRESH_TOKEN');
        } catch (auError) {
          console.error('\nFailed to exchange code for tokens with all endpoints');
          console.error('US Error:', usError.response?.data || usError.message);
          console.error('EU Error:', euError.response?.data || euError.message);
          console.error('AU Error:', auError.response?.data || auError.message);
        }
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    rl.close();
  }
});
