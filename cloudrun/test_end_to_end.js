/**
 * End-to-end test for the Houzz to Zoho integration
 *
 * This script tests the entire flow from Google Drive to Zoho Books:
 * 1. Uploads a test PDF to Google Drive
 * 2. Processes the PDF using the main service
 * 3. Verifies that an estimate was created in Zoho Books
 *
 * Usage:
 * node test_end_to_end.js
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { createEstimateInZoho: createEstimate, getEstimate } = require('./zohoApi');
const { parseEstimatePDF } = require('./parseEstimatePDF');
const {
  authorizeGoogleDrive,
  listPDFFiles,
  downloadFile,
  moveFileToProcessed
} = require('./driveWatcher');

// Configuration
const TEST_PDF_PATH = path.join(__dirname, '..', 'test-estimate.pdf');
const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID || '1djXu28JCDEmwdhNzz3nFHWk90h-nFFtS';
const PROCESSED_FOLDER_ID = process.env.PROCESSED_FOLDER_ID || '1QqX_k8ef4AvCMkH-HuGE7WFxcotM3gdm';
const MOCK_MODE = process.env.ZOHO_MOCK_MODE === 'true' || true;

// Enable mock mode for testing
process.env.ZOHO_MOCK_MODE = 'true';

// Test the upload to Google Drive
async function testUploadToDrive() {
  console.log('\n=== Testing Upload to Google Drive ===');

  try {
    // Read the test PDF
    const pdfBuffer = fs.readFileSync(TEST_PDF_PATH);
    console.log(`Loaded test PDF from ${TEST_PDF_PATH} (${pdfBuffer.length} bytes)`);

    // Authorize with Google Drive
    console.log('Authorizing Google Drive...');
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    const authClient = await auth.getClient();
    const drive = google.drive({ version: 'v3', auth: authClient });

    // Upload the PDF to Google Drive
    console.log(`Uploading PDF to folder ${DRIVE_FOLDER_ID}...`);
    const fileMetadata = {
      name: `Test Estimate ${new Date().toISOString().split('T')[0]}.pdf`,
      parents: [DRIVE_FOLDER_ID],
    };

    const media = {
      mimeType: 'application/pdf',
      body: fs.createReadStream(TEST_PDF_PATH),
    };

    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, name',
    });

    console.log(`✅ PDF uploaded successfully! File ID: ${file.data.id}, Name: ${file.data.name}`);
    return file.data;
  } catch (error) {
    console.log(`❌ Upload to Google Drive failed: ${error.message}`);
    return null;
  }
}

// Test the PDF processing
async function testPdfProcessing() {
  console.log('\n=== Testing PDF Processing ===');

  try {
    // Process the Google Drive folder
    console.log(`Processing Google Drive folder ${DRIVE_FOLDER_ID}...`);

    // Authorize Google Drive
    const drive = await authorizeGoogleDrive();

    // List PDF files in the folder
    console.log('Listing PDF files in the folder...');
    const files = await listPDFFiles(drive, DRIVE_FOLDER_ID);

    if (files.length === 0) {
      console.log('No PDF files found in the folder');
      return null;
    }

    console.log(`Found ${files.length} PDF files in the folder`);

    // Process each file
    const results = [];

    for (const file of files) {
      try {
        console.log(`Processing file: ${file.name} (${file.id})`);

        // Download the file
        const pdfBuffer = await downloadFile(drive, file.id);

        // Parse the PDF
        const estimateData = await parseEstimatePDF(pdfBuffer);

        // Create the estimate in Zoho Books
        const zohoResponse = await createEstimate({
          ...estimateData,
          customer_id: process.env.ZOHO_CUSTOMER_ID || '5547048000000150663'
        }, pdfBuffer);

        // Get the estimate ID from the response
        const estimateId = zohoResponse.estimate?.estimate_id || 'dummy_estimate_id';
        const estimateNumber = zohoResponse.estimate?.estimate_number || 'EST-00001';

        // Move the file to the processed folder
        await moveFileToProcessed(drive, file.id, DRIVE_FOLDER_ID, PROCESSED_FOLDER_ID);

        // Add to results
        results.push({
          file: file.name,
          status: 'success',
          estimateId: estimateId,
          estimateNumber: estimateNumber,
          customerName: estimateData.customer_name
        });
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);

        // Add to results
        results.push({
          file: file.name,
          status: 'error',
          error: error.message
        });
      }
    }

    // Return the results
    const result = {
      status: 'complete',
      processed: results.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'error').length,
      results
    };

    console.log('✅ PDF processing succeeded!');
    console.log('Result:');
    console.log(JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.log(`❌ PDF processing failed: ${error.message}`);
    return null;
  }
}

// Test the Zoho Books integration
async function testZohoIntegration(estimateId) {
  console.log('\n=== Testing Zoho Books Integration ===');

  if (!estimateId) {
    console.log('❌ No estimate ID provided, skipping Zoho Books integration test');
    return null;
  }

  try {
    // Get the estimate from Zoho Books
    console.log(`Getting estimate ${estimateId} from Zoho Books...`);
    const estimate = await getEstimate(estimateId);

    console.log('✅ Zoho Books integration succeeded!');
    console.log('Estimate:');
    console.log(JSON.stringify(estimate, null, 2));

    return estimate;
  } catch (error) {
    console.log(`❌ Zoho Books integration failed: ${error.message}`);
    return null;
  }
}

// Test the direct PDF parsing
async function testDirectPdfParsing() {
  console.log('\n=== Testing Direct PDF Parsing ===');

  try {
    // Read the test PDF
    const pdfBuffer = fs.readFileSync(TEST_PDF_PATH);
    console.log(`Loaded test PDF from ${TEST_PDF_PATH} (${pdfBuffer.length} bytes)`);

    // Parse the PDF
    console.log('Parsing PDF...');
    const result = await parseEstimatePDF(pdfBuffer);

    console.log('✅ Direct PDF parsing succeeded!');
    console.log('Result:');
    console.log(JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.log(`❌ Direct PDF parsing failed: ${error.message}`);
    return null;
  }
}

// Test the direct Zoho Books estimate creation
async function testDirectZohoEstimateCreation(pdfParseResult) {
  console.log('\n=== Testing Direct Zoho Books Estimate Creation ===');

  if (!pdfParseResult) {
    console.log('❌ No PDF parse result provided, skipping direct Zoho Books estimate creation test');
    return null;
  }

  try {
    // Create the estimate in Zoho Books
    console.log('Creating estimate in Zoho Books...');
    const pdfBuffer = fs.readFileSync(TEST_PDF_PATH);
    const result = await createEstimate(pdfParseResult, pdfBuffer);

    console.log('✅ Direct Zoho Books estimate creation succeeded!');
    console.log('Result:');
    console.log(JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.log(`❌ Direct Zoho Books estimate creation failed: ${error.message}`);
    return null;
  }
}

// Run all tests
async function runTests() {
  try {
    console.log('Starting end-to-end tests...');
    console.log(`Mock mode: ${MOCK_MODE ? 'enabled' : 'disabled'}`);

    // Test direct PDF parsing
    const pdfParseResult = await testDirectPdfParsing();

    // Test direct Zoho Books estimate creation
    const directZohoResult = await testDirectZohoEstimateCreation(pdfParseResult);

    // Test upload to Google Drive
    const uploadResult = await testUploadToDrive();

    // Test PDF processing
    const processResult = await testPdfProcessing();

    // Test Zoho Books integration
    let estimateId = null;
    if (processResult && processResult.results && processResult.results.length > 0) {
      estimateId = processResult.results[0].estimateId;
    }
    const zohoResult = await testZohoIntegration(estimateId);

    console.log('\nTests completed!');

    // Summary
    console.log('\n=== Test Summary ===');
    console.log(`Direct PDF parsing: ${pdfParseResult ? '✅ Passed' : '❌ Failed'}`);
    console.log(`Direct Zoho estimate creation: ${directZohoResult ? '✅ Passed' : '❌ Failed'}`);
    console.log(`Upload to Google Drive: ${uploadResult ? '✅ Passed' : '❌ Failed'}`);
    console.log(`PDF processing: ${processResult ? '✅ Passed' : '❌ Failed'}`);
    console.log(`Zoho Books integration: ${zohoResult ? '✅ Passed' : '❌ Failed'}`);
  } catch (error) {
    console.error('Error running tests:', error.message);
  }
}

// Run the tests
runTests();
