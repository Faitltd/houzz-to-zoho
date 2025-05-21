/**
 * Script to upload a test PDF to the Google Drive folder
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// Google Drive folder ID
const DRIVE_FOLDER_ID = '1djXu28JCDEmwdhNzz3nFHWk90h-nFFtS';

// Path to the test PDF
const TEST_PDF_PATH = path.join(__dirname, '..', 'Caverly Estimate.pdf');

/**
 * Authorize with Google Drive
 * @returns {Promise<google.auth.OAuth2>} The authorized Google OAuth2 client
 */
async function authorize() {
  try {
    console.log('Authorizing with Google Drive...');

    // Check if we have a service account file
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log(`Using service account from ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
      const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/drive']
      });
      return auth;
    }

    // If no service account, use the default credentials
    console.log('Using default credentials');
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/drive']
    });
    return auth;
  } catch (error) {
    console.error('Error authorizing with Google Drive:', error.message);
    throw error;
  }
}

/**
 * Upload a test PDF to the Google Drive folder
 */
async function uploadTestPdf() {
  try {
    console.log(`Uploading test PDF to folder ${DRIVE_FOLDER_ID}...`);

    // Authorize with Google Drive
    const auth = await authorize();
    const drive = google.drive({ version: 'v3', auth });

    // Read the test PDF
    const fileContent = fs.readFileSync(TEST_PDF_PATH);

    // Upload the file
    const response = await drive.files.create({
      requestBody: {
        name: `Test Estimate ${new Date().toISOString().split('T')[0]}.pdf`,
        mimeType: 'application/pdf',
        parents: [DRIVE_FOLDER_ID]
      },
      media: {
        mimeType: 'application/pdf',
        body: fs.createReadStream(TEST_PDF_PATH)
      }
    });

    console.log(`Successfully uploaded file with ID: ${response.data.id}`);

    // Make the file publicly accessible
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    console.log(`File is now publicly accessible`);

    // Get the file's web view link
    const file = await drive.files.get({
      fileId: response.data.id,
      fields: 'webViewLink'
    });

    console.log(`File web view link: ${file.data.webViewLink}`);

    return response.data;
  } catch (error) {
    console.error('Error uploading test PDF:', error.message);
    throw error;
  }
}

// Run the script
uploadTestPdf()
  .then(() => console.log('Done!'))
  .catch(error => console.error('Error:', error));
