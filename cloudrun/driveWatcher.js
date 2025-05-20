const { google } = require('googleapis');

/**
 * Authorize Google Drive API
 * @returns {Promise<Object>} The Google Drive API client
 */
async function authorizeGoogleDrive() {
  try {
    console.log('Authorizing Google Drive...');
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS),
      scopes: ['https://www.googleapis.com/auth/drive']
    });
    return google.drive({ version: 'v3', auth });
  } catch (error) {
    console.error('Error authorizing Google Drive:', error);
    throw new Error(`Failed to authorize Google Drive: ${error.message}`);
  }
}

/**
 * List PDF files in a Google Drive folder
 * @param {Object} drive - The Google Drive API client
 * @param {string} folderId - The folder ID
 * @returns {Promise<Array>} The list of PDF files
 */
async function listPDFFiles(drive, folderId) {
  try {
    console.log(`Listing PDF files in folder ${folderId}...`);
    const res = await drive.files.list({
      q: `'${folderId}' in parents and mimeType='application/pdf'`,
      fields: 'files(id, name, createdTime)',
      orderBy: 'createdTime desc'
    });
    
    const files = res.data.files;
    console.log(`Found ${files.length} PDF files in folder ${folderId}`);
    return files;
  } catch (error) {
    console.error('Error listing PDF files:', error);
    throw new Error(`Failed to list PDF files: ${error.message}`);
  }
}

/**
 * Download a file from Google Drive
 * @param {Object} drive - The Google Drive API client
 * @param {string} fileId - The file ID
 * @returns {Promise<Buffer>} The file buffer
 */
async function downloadFile(drive, fileId) {
  try {
    console.log(`Downloading file ${fileId}...`);
    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );
    
    console.log(`Successfully downloaded file ${fileId}`);
    return Buffer.from(res.data);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw new Error(`Failed to download file: ${error.message}`);
  }
}

/**
 * Create a folder in Google Drive if it doesn't exist
 * @param {Object} drive - The Google Drive API client
 * @param {string} folderName - The folder name
 * @param {string} parentFolderId - The parent folder ID
 * @returns {Promise<string>} The folder ID
 */
async function createFolderIfNotExists(drive, folderName, parentFolderId) {
  try {
    console.log(`Checking if folder ${folderName} exists in ${parentFolderId}...`);
    
    // Check if folder already exists
    const res = await drive.files.list({
      q: `name='${folderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder'`,
      fields: 'files(id, name)'
    });
    
    if (res.data.files.length > 0) {
      console.log(`Folder ${folderName} already exists with ID ${res.data.files[0].id}`);
      return res.data.files[0].id;
    }
    
    // Create the folder
    console.log(`Creating folder ${folderName} in ${parentFolderId}...`);
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId]
    };
    
    const folder = await drive.files.create({
      resource: folderMetadata,
      fields: 'id'
    });
    
    console.log(`Successfully created folder ${folderName} with ID ${folder.data.id}`);
    return folder.data.id;
  } catch (error) {
    console.error('Error creating folder:', error);
    throw new Error(`Failed to create folder: ${error.message}`);
  }
}

/**
 * Move a file to the processed folder
 * @param {Object} drive - The Google Drive API client
 * @param {string} fileId - The file ID
 * @param {string} sourceFolderId - The source folder ID
 * @param {string} targetFolderId - The target folder ID
 * @returns {Promise<Object>} The updated file
 */
async function moveFileToProcessed(drive, fileId, sourceFolderId, targetFolderId) {
  try {
    console.log(`Moving file ${fileId} from ${sourceFolderId} to ${targetFolderId}...`);
    
    // Ensure the processed folder exists
    let processedFolderId = targetFolderId;
    if (targetFolderId.includes('/')) {
      // If the target folder ID is in the format "parentId/folderName"
      const [parentId, folderName] = targetFolderId.split('/');
      processedFolderId = await createFolderIfNotExists(drive, folderName, parentId);
    }
    
    // Move the file
    const file = await drive.files.update({
      fileId,
      addParents: processedFolderId,
      removeParents: sourceFolderId,
      fields: 'id, name, parents'
    });
    
    console.log(`Successfully moved file ${fileId} to ${processedFolderId}`);
    return file.data;
  } catch (error) {
    console.error('Error moving file:', error);
    throw new Error(`Failed to move file: ${error.message}`);
  }
}

module.exports = {
  authorizeGoogleDrive,
  listPDFFiles,
  downloadFile,
  createFolderIfNotExists,
  moveFileToProcessed
};
