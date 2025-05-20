const axios = require('axios');
const BASE_URL = 'https://books.zoho.com/api/v3';

// Cache the access token to avoid making too many requests
let cachedAccessToken = null;
let tokenExpiry = null;

/**
 * Get a fresh access token using the refresh token
 * @returns {Promise<string>} The access token
 */
async function getAccessToken() {
  try {
    console.log('Getting Zoho access token...');

    // Check if we have a valid cached token
    const now = new Date();
    if (cachedAccessToken && tokenExpiry && now < tokenExpiry) {
      console.log('Using cached access token');
      return cachedAccessToken;
    }

    // If we're in mock mode, return a dummy token
    if (process.env.ZOHO_MOCK_MODE === 'true') {
      console.log('Using dummy access token (MOCK MODE)');
      return 'dummy_access_token';
    }

    // If we have a hardcoded access token, use it
    if (process.env.ZOHO_ACCESS_TOKEN) {
      console.log('Using hardcoded access token');

      // Cache the token
      cachedAccessToken = process.env.ZOHO_ACCESS_TOKEN;

      // Set expiry time (default to 50 minutes)
      tokenExpiry = new Date(now.getTime() + 3000 * 1000); // 50 minutes in seconds

      return cachedAccessToken;
    }

    // If we have a refresh token, try to use it
    if (process.env.ZOHO_REFRESH_TOKEN) {
      console.log(`Using refresh token: ${process.env.ZOHO_REFRESH_TOKEN?.substring(0, 10)}...`);

      // Try different Zoho API domains
      const domains = [
        'https://accounts.zoho.com',
        'https://accounts.zoho.eu',
        'https://accounts.zoho.in',
        'https://accounts.zoho.com.au'
      ];

      let lastError = null;

      for (const domain of domains) {
        try {
          console.log(`Trying ${domain} for token refresh...`);

          const response = await axios.post(`${domain}/oauth/v2/token`, null, {
            params: {
              refresh_token: process.env.ZOHO_REFRESH_TOKEN,
              client_id: process.env.ZOHO_CLIENT_ID,
              client_secret: process.env.ZOHO_CLIENT_SECRET,
              grant_type: 'refresh_token'
            }
          });

          if (response.data && response.data.access_token) {
            console.log(`Successfully obtained access token from ${domain}`);

            // Cache the token
            cachedAccessToken = response.data.access_token;

            // Set expiry time (default to 50 minutes if not provided)
            const expiresIn = response.data.expires_in || 3000; // 50 minutes in seconds
            tokenExpiry = new Date(now.getTime() + expiresIn * 1000);

            return cachedAccessToken;
          }
        } catch (error) {
          console.log(`Failed to get token from ${domain}: ${error.message}`);
          lastError = error;
        }
      }

      // If we get here, all domains failed
      throw lastError || new Error('Failed to refresh token from all Zoho domains');
    }

    // If we get here, we don't have a refresh token or access token
    throw new Error('No refresh token or access token available');
  } catch (error) {
    console.error('Error getting Zoho access token:', error.message);

    // If we're in development mode, fall back to a dummy token
    if (process.env.NODE_ENV === 'development') {
      console.log('Using dummy access token (DEVELOPMENT MODE)');
      return 'dummy_access_token';
    }

    throw new Error(`Failed to get Zoho access token: ${error.message}`);
  }
}

/**
 * Create an estimate in Zoho Books
 * @param {Object} estimateData - The estimate data
 * @returns {Promise<Object>} The Zoho API response
 */
async function createEstimateInZoho(estimateData) {
  try {
    console.log('Creating estimate in Zoho Books...');
    console.log('Estimate data:', JSON.stringify(estimateData, null, 2));

    // If we're in mock mode, return a dummy response
    if (process.env.ZOHO_MOCK_MODE === 'true') {
      console.log('Using mock mode for create estimate');
      return {
        estimate: {
          estimate_id: 'dummy_estimate_id',
          estimate_number: 'EST-00001',
          date: new Date().toISOString().split('T')[0],
          status: 'draft'
        }
      };
    }

    // Get a fresh access token
    const accessToken = await getAccessToken();

    // Make the API request
    const response = await axios.post(
      `${BASE_URL}/estimates?organization_id=${process.env.ZOHO_ORGANIZATION_ID}`,
      estimateData,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Successfully created estimate in Zoho Books');
    return response.data;
  } catch (error) {
    console.error('Error creating estimate in Zoho:', error.response?.data || error.message);

    // If we're in development mode, return a dummy response
    if (process.env.NODE_ENV === 'development') {
      console.log('Using dummy response for create estimate (DEVELOPMENT MODE)');
      return {
        estimate: {
          estimate_id: 'dummy_estimate_id',
          estimate_number: 'EST-00001',
          date: new Date().toISOString().split('T')[0],
          status: 'draft'
        }
      };
    }

    throw new Error(`Failed to create estimate in Zoho: ${error.message}`);
  }
}

/**
 * Attach a PDF file to an estimate in Zoho Books
 * @param {string} estimateId - The Zoho estimate ID
 * @param {Buffer} pdfBuffer - The PDF file buffer
 * @param {string} fileName - The PDF file name
 * @returns {Promise<Object>} The Zoho API response
 */
async function attachPDFToEstimate(estimateId, pdfBuffer, fileName) {
  try {
    console.log(`Attaching PDF to estimate ${estimateId}...`);
    console.log(`Attaching file ${fileName} (${pdfBuffer.length} bytes) to estimate ${estimateId}`);

    // If we're in mock mode, return a dummy response
    if (process.env.ZOHO_MOCK_MODE === 'true') {
      console.log('Using mock mode for attach PDF');
      return {
        message: 'Attachment added successfully'
      };
    }

    // Get a fresh access token
    const accessToken = await getAccessToken();

    // Create a FormData object for the file upload
    const FormData = require('form-data');
    const form = new FormData();
    form.append('attachment', pdfBuffer, {
      filename: fileName,
      contentType: 'application/pdf'
    });

    // Make the API request
    const response = await axios.post(
      `${BASE_URL}/estimates/${estimateId}/attachment?organization_id=${process.env.ZOHO_ORGANIZATION_ID}`,
      form,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          ...form.getHeaders()
        }
      }
    );

    console.log('Successfully attached PDF to estimate');
    return response.data;
  } catch (error) {
    console.error('Error attaching PDF to estimate:', error.response?.data || error.message);

    // If we're in development mode, return a dummy response
    if (process.env.NODE_ENV === 'development') {
      console.log('Using dummy response for attach PDF (DEVELOPMENT MODE)');
      return {
        message: 'Attachment added successfully'
      };
    }

    throw new Error(`Failed to attach PDF to estimate: ${error.message}`);
  }
}

module.exports = { getAccessToken, createEstimateInZoho, attachPDFToEstimate, BASE_URL };
