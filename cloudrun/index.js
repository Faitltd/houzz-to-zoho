require('dotenv').config();
const express = require('express');
const { parseEstimatePDF } = require('./parseEstimatePDF');
const { createEstimateInZoho, attachPDFToEstimate } = require('./zohoApi');
const {
  authorizeGoogleDrive,
  listPDFFiles,
  downloadFile,
  moveFileToProcessed
} = require('./driveWatcher');
const { refreshItemCatalog, matchItemByName } = require('./itemCatalogCache');
const { findCustomerId } = require('./customerResolver');
const {
  sendSuccessNotification,
  sendErrorNotification,
  sendSyncSummary
} = require('./emailNotify');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware to parse JSON bodies
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).send('Houzz to Zoho Integration Service is running');
});

// Process all PDFs in the Drive folder
app.get('/process-drive', async (req, res) => {
  console.log('Received request to process Drive folder');

  try {
    // Get configuration from environment variables
    const folderId = process.env.DRIVE_FOLDER_ID;
    const processedFolderId = process.env.PROCESSED_FOLDER_ID;

    if (!folderId) {
      return res.status(400).json({ error: 'DRIVE_FOLDER_ID environment variable is not set' });
    }

    if (!processedFolderId) {
      return res.status(400).json({ error: 'PROCESSED_FOLDER_ID environment variable is not set' });
    }

    // Authorize Google Drive
    const drive = await authorizeGoogleDrive();

    // Refresh the item catalog
    await refreshItemCatalog();

    // List PDF files in the folder
    const files = await listPDFFiles(drive, folderId);

    if (files.length === 0) {
      return res.status(200).json({ message: 'No PDF files found in the folder' });
    }

    // Process each file
    const results = [];
    const processedFiles = [];
    const createdEstimates = [];
    const errors = [];

    for (const file of files) {
      try {
        console.log(`Processing file: ${file.name} (${file.id})`);

        // Download the file
        const pdfBuffer = await downloadFile(drive, file.id);

        // Parse the PDF
        const estimateData = await parseEstimatePDF(pdfBuffer);

        // Find customer ID
        const customerId = await findCustomerId(estimateData.customer_name);
        if (!customerId) {
          const errorMsg = `Customer not found: ${estimateData.customer_name}`;
          console.error(errorMsg);
          errors.push(errorMsg);

          results.push({
            file: file.name,
            status: 'error',
            error: errorMsg
          });

          continue;
        }

        // Match line items with Zoho catalog items
        estimateData.line_items = estimateData.line_items.map(item => {
          const match = matchItemByName(item.name);
          return match ? { ...item, item_id: match.item_id } : item;
        });

        // Create the estimate in Zoho
        const zohoResponse = await createEstimateInZoho({
          ...estimateData,
          customer_id: customerId
        });

        // Get the estimate ID from the response
        const estimateId = zohoResponse.estimate?.estimate_id;
        const estimateNumber = zohoResponse.estimate?.estimate_number;

        if (estimateId) {
          // Attach the PDF to the estimate
          await attachPDFToEstimate(estimateId, pdfBuffer, file.name);

          // Send success notification
          await sendSuccessNotification(
            estimateId,
            estimateNumber,
            estimateData.customer_name
          );

          // Add to tracking arrays
          processedFiles.push(file.name);
          createdEstimates.push([estimateId, estimateNumber]);
        }

        // Move the file to the processed folder
        await moveFileToProcessed(drive, file.id, folderId, processedFolderId);

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
        errors.push(`${file.name}: ${error.message}`);

        // Add to results
        results.push({
          file: file.name,
          status: 'error',
          error: error.message
        });
      }
    }

    // Send sync summary if any files were processed
    if (processedFiles.length > 0 || errors.length > 0) {
      await sendSyncSummary(processedFiles, createdEstimates, errors);
    }

    // Return the results
    res.json({
      status: 'complete',
      processed: results.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'error').length,
      results
    });
  } catch (err) {
    console.error('Error processing Drive folder:', err);

    // Send error notification
    await sendErrorNotification(`Error processing Drive folder: ${err.message}`);

    res.status(500).json({ error: `Error processing estimates: ${err.message}` });
  }
});

// Process a specific PDF file
app.post('/process-file', async (req, res) => {
  console.log('Received request to process specific file');

  try {
    const { fileId } = req.body;

    if (!fileId) {
      return res.status(400).json({ error: 'fileId is required' });
    }

    // Authorize Google Drive
    const drive = await authorizeGoogleDrive();

    // Refresh the item catalog
    await refreshItemCatalog();

    // Download the file
    const pdfBuffer = await downloadFile(drive, fileId);

    // Get the file metadata
    const fileMetadata = await drive.files.get({
      fileId,
      fields: 'name, parents'
    });

    const fileName = fileMetadata.data.name;
    const parentFolderId = fileMetadata.data.parents[0];

    // Parse the PDF
    const estimateData = await parseEstimatePDF(pdfBuffer);

    // Find customer ID
    const customerId = await findCustomerId(estimateData.customer_name);
    if (!customerId) {
      const errorMsg = `Customer not found: ${estimateData.customer_name}`;
      console.error(errorMsg);

      // Send error notification
      await sendErrorNotification(errorMsg);

      return res.status(400).json({
        status: 'error',
        error: errorMsg
      });
    }

    // Match line items with Zoho catalog items
    estimateData.line_items = estimateData.line_items.map(item => {
      const match = matchItemByName(item.name);
      return match ? { ...item, item_id: match.item_id } : item;
    });

    // Create the estimate in Zoho
    const zohoResponse = await createEstimateInZoho({
      ...estimateData,
      customer_id: customerId
    });

    // Get the estimate ID from the response
    const estimateId = zohoResponse.estimate?.estimate_id;
    const estimateNumber = zohoResponse.estimate?.estimate_number;

    if (estimateId) {
      // Attach the PDF to the estimate
      await attachPDFToEstimate(estimateId, pdfBuffer, fileName);

      // Send success notification
      await sendSuccessNotification(
        estimateId,
        estimateNumber,
        estimateData.customer_name
      );
    }

    // Move the file to the processed folder if processedFolderId is set
    if (process.env.PROCESSED_FOLDER_ID) {
      await moveFileToProcessed(drive, fileId, parentFolderId, process.env.PROCESSED_FOLDER_ID);
    }

    // Return the result
    res.json({
      status: 'success',
      file: fileName,
      estimateId: estimateId,
      estimateNumber: estimateNumber,
      customerName: estimateData.customer_name
    });
  } catch (err) {
    console.error('Error processing file:', err);

    // Send error notification
    await sendErrorNotification(`Error processing file: ${err.message}`);

    res.status(500).json({ error: `Error processing file: ${err.message}` });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/`);
  console.log(`Process Drive: http://localhost:${PORT}/process-drive`);
});
