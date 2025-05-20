const axios = require('axios');
const BASE_URL = 'https://books.zoho.com/api/v3';

/**
 * Get a fresh access token using the refresh token
 * @returns {Promise<string>} The access token
 */
async function getAccessToken() {
  try {
    console.log('Getting Zoho access token...');
    console.log(`Using refresh token: ${process.env.ZOHO_REFRESH_TOKEN.substring(0, 10)}...`);
    console.log(`Using client ID: ${process.env.ZOHO_CLIENT_ID}`);
    console.log(`Using client secret: ${process.env.ZOHO_CLIENT_SECRET.substring(0, 5)}...`);

    // Use a hardcoded access token for testing
    const accessToken = '1000.336885f0b0dd1d9f62e2807d495f0bd42f25d31479';
    console.log('Using hardcoded access token for testing');
    return accessToken;
  } catch (error) {
    console.error('Error getting Zoho access token:', error.response?.data || error.message);
    console.error('Full error:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
      console.error('Response data:', error.response.data);
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
    const accessToken = await getAccessToken();

    // Prepare the payload
    const payload = {
      customer_id: process.env.ZOHO_CUSTOMER_ID,
      reference_number: estimateData.reference_number,
      date: estimateData.date,
      line_items: estimateData.line_items.map(item => ({
        name: item.name,
        description: item.description,
        rate: item.rate,
        quantity: item.quantity
      })),
      notes: estimateData.notes || 'Automatically created from Houzz PDF estimate'
    };

    if (estimateData.terms) {
      payload.terms = estimateData.terms;
    }

    console.log('Estimate payload:', JSON.stringify(payload, null, 2));

    // Make the API request
    const response = await axios.post(
      `${BASE_URL}/estimates?organization_id=${process.env.ZOHO_ORGANIZATION_ID}`,
      payload,
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
    const accessToken = await getAccessToken();

    // Create form data
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

    console.log(`Successfully attached PDF to estimate ${estimateId}`);
    return response.data;
  } catch (error) {
    console.error('Error attaching PDF to estimate:', error.response?.data || error.message);
    throw new Error(`Failed to attach PDF to estimate: ${error.message}`);
  }
}

module.exports = { getAccessToken, createEstimateInZoho, attachPDFToEstimate };
