/**
 * Script to generate a new Zoho API refresh token
 * 
 * Usage:
 * 1. Run this script: node generate_zoho_token.js
 * 2. Open the authorization URL in your browser
 * 3. Log in to Zoho and authorize the application
 * 4. You will be redirected to the redirect URI with a code parameter
 * 5. Copy the entire redirect URL and paste it when prompted
 * 6. The script will exchange the code for tokens and display them
 */

const axios = require('axios');
const readline = require('readline');
const open = require('open');

// Configuration from your Zoho API client
const CLIENT_ID = '1000.V62XITF7A5T1PPQEADQVTFIIU33CLL';
const CLIENT_SECRET = '336885f0b0dd1d9f62e2807d495f0bd42f25d31479';
const REDIRECT_URI = 'https://www.zoho.com/books';
const SCOPES = 'ZohoBooks.fullaccess.all';

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Step 1: Generate authorization URL for different Zoho domains
const authUrls = {
  'US': `https://accounts.zoho.com/oauth/v2/auth?scope=${SCOPES}&client_id=${CLIENT_ID}&response_type=code&access_type=offline&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`,
  'EU': `https://accounts.zoho.eu/oauth/v2/auth?scope=${SCOPES}&client_id=${CLIENT_ID}&response_type=code&access_type=offline&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`,
  'IN': `https://accounts.zoho.in/oauth/v2/auth?scope=${SCOPES}&client_id=${CLIENT_ID}&response_type=code&access_type=offline&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`,
  'AU': `https://accounts.zoho.com.au/oauth/v2/auth?scope=${SCOPES}&client_id=${CLIENT_ID}&response_type=code&access_type=offline&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`
};

// Display the authorization URLs
console.log('\nZoho API Authorization URLs:');
console.log('---------------------------');
for (const [region, url] of Object.entries(authUrls)) {
  console.log(`\n${region} Region: ${url}`);
}

// Ask which region to use
rl.question('\nWhich region do you want to use? (US/EU/IN/AU): ', async (region) => {
  const upperRegion = region.toUpperCase();
  
  if (!authUrls[upperRegion]) {
    console.error(`Invalid region: ${region}. Please use US, EU, IN, or AU.`);
    rl.close();
    return;
  }
  
  const authUrl = authUrls[upperRegion];
  console.log(`\nOpening ${upperRegion} authorization URL in your browser...`);
  
  // Open the authorization URL in the default browser
  try {
    await open(authUrl);
  } catch (error) {
    console.log(`Could not open browser automatically. Please open this URL manually:\n${authUrl}`);
  }
  
  console.log('\nAfter authorization, you will be redirected to a URL.');
  console.log('Copy the entire redirect URL and paste it below:');
  
  // Step 2: Get the authorization code from the redirect URL
  rl.question('\nPaste the redirect URL here: ', async (redirectUrl) => {
    try {
      // Extract code from redirect URL
      const urlObj = new URL(redirectUrl);
      const code = urlObj.searchParams.get('code');
      
      if (!code) {
        console.error('No code found in the redirect URL');
        rl.close();
        return;
      }
      
      console.log(`\nGot authorization code: ${code}\n`);
      
      // Step 3: Exchange code for tokens
      console.log('Exchanging code for tokens...');
      
      // Token endpoints for different regions
      const tokenEndpoints = {
        'US': 'https://accounts.zoho.com/oauth/v2/token',
        'EU': 'https://accounts.zoho.eu/oauth/v2/token',
        'IN': 'https://accounts.zoho.in/oauth/v2/token',
        'AU': 'https://accounts.zoho.com.au/oauth/v2/token'
      };
      
      try {
        const response = await axios.post(tokenEndpoints[upperRegion], null, {
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
        
        console.log('\n=== IMPORTANT ===');
        console.log('Add these values to your environment variables:');
        console.log(`ZOHO_REFRESH_TOKEN=${response.data.refresh_token}`);
        console.log(`ZOHO_ACCESS_TOKEN=${response.data.access_token}`);
        console.log('=================');
        
        // Generate code to update the environment variables
        console.log('\nTo update your Cloud Run service with the new refresh token, run:');
        console.log(`gcloud run services update houzz-to-zoho \\
  --region=us-central1 \\
  --update-env-vars=ZOHO_REFRESH_TOKEN=${response.data.refresh_token}`);
        
      } catch (error) {
        console.error('\nError exchanging code for tokens:');
        console.error(error.response?.data || error.message);
      }
    } catch (error) {
      console.error('Error:', error.message);
    } finally {
      rl.close();
    }
  });
});
