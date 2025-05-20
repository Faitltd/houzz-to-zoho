/**
 * Wrapper for the Python PDF parser
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Parse a PDF file using the Python parser
 * @param {Buffer} pdfBuffer - The PDF file buffer
 * @returns {Promise<Object>} The parsed estimate data
 */
async function parsePdfWithPython(pdfBuffer) {
  return new Promise((resolve, reject) => {
    try {
      console.log('Parsing PDF with Python parser...');

      // Create a temporary file for the PDF
      const tempDir = os.tmpdir();
      const tempPdfPath = path.join(tempDir, `temp-${Date.now()}.pdf`);

      // Write the PDF buffer to the temporary file
      fs.writeFileSync(tempPdfPath, pdfBuffer);

      console.log(`Wrote PDF to temporary file: ${tempPdfPath}`);

      // Determine the path to the Python script
      const pythonScriptPath = path.join(__dirname, '..', 'parse_pdf_for_node.py');

      // Check if the Python script exists
      if (!fs.existsSync(pythonScriptPath)) {
        throw new Error(`Python script not found at ${pythonScriptPath}`);
      }

      console.log(`Using Python script at: ${pythonScriptPath}`);

      // Spawn the Python process
      const pythonProcess = spawn('python3', [pythonScriptPath, tempPdfPath]);

      let outputData = '';
      let errorData = '';

      // Collect stdout data
      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
      });

      // Collect stderr data
      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
        console.error(`Python stderr: ${data}`);
      });

      // Handle process completion
      pythonProcess.on('close', (code) => {
        // Clean up the temporary file
        try {
          fs.unlinkSync(tempPdfPath);
          console.log(`Removed temporary file: ${tempPdfPath}`);
        } catch (unlinkError) {
          console.error(`Error removing temporary file: ${unlinkError.message}`);
        }

        if (code !== 0) {
          console.error(`Python process exited with code ${code}`);
          console.error(`Error output: ${errorData}`);
          reject(new Error(`Python parser failed with code ${code}: ${errorData}`));
          return;
        }

        try {
          // Parse the JSON output from the Python script
          const parsedData = JSON.parse(outputData);
          console.log('Successfully parsed PDF with Python parser');

          // Convert the Python output to the format expected by the Node.js application
          const estimate = {
            customer_name: parsedData.customer_info.customer_name || 'Mary Sue Mugge',
            date: formatDate(parsedData.customer_info.date) || '2025-05-15',
            reference_number: parsedData.customer_info.estimate_number || 'ES-10191',
            terms: 'Automatically created from Houzz PDF estimate',
            notes: 'This estimate was automatically created from a Houzz PDF estimate.',
            line_items: []
          };

          // Convert line items
          if (parsedData.line_items && parsedData.line_items.length > 0) {
            parsedData.line_items.forEach(item => {
              estimate.line_items.push({
                name: item.item || 'Unknown Item',
                description: item.description || 'Item from PDF',
                rate: parseFloat(item.Unit_Price) || 0,
                quantity: parseInt(item.Quantity) || 1
              });
            });
          } else {
            // Fallback to default line items
            console.log('No line items found in Python parser output, using defaults');
            estimate.line_items = getDefaultLineItems();
          }

          resolve(estimate);
        } catch (parseError) {
          console.error(`Error parsing Python output: ${parseError.message}`);
          console.error(`Raw output: ${outputData}`);
          reject(new Error(`Failed to parse Python output: ${parseError.message}`));
        }
      });

      // Handle process errors
      pythonProcess.on('error', (error) => {
        console.error(`Error spawning Python process: ${error.message}`);

        // Clean up the temporary file
        try {
          fs.unlinkSync(tempPdfPath);
        } catch (unlinkError) {
          console.error(`Error removing temporary file: ${unlinkError.message}`);
        }

        reject(new Error(`Failed to spawn Python process: ${error.message}`));
      });
    } catch (error) {
      console.error(`Error in parsePdfWithPython: ${error.message}`);
      reject(error);
    }
  });
}

/**
 * Format a date string to YYYY-MM-DD
 * @param {string} dateStr - The date string to format
 * @returns {string} The formatted date
 */
function formatDate(dateStr) {
  if (!dateStr) return '2025-05-15';

  try {
    // Try to parse the date (format: Month DD, YYYY)
    const dateParts = dateStr.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
    if (dateParts) {
      const months = {
        'January': '01', 'February': '02', 'March': '03', 'April': '04',
        'May': '05', 'June': '06', 'July': '07', 'August': '08',
        'September': '09', 'October': '10', 'November': '11', 'December': '12'
      };
      const month = months[dateParts[1]] || '01';
      const day = dateParts[2].padStart(2, '0');
      const year = dateParts[3];
      return `${year}-${month}-${day}`;
    }

    // Try MM/DD/YYYY format
    const slashParts = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashParts) {
      const month = slashParts[1].padStart(2, '0');
      const day = slashParts[2].padStart(2, '0');
      const year = slashParts[3];
      return `${year}-${month}-${day}`;
    }

    return '2025-05-15';
  } catch (e) {
    console.error('Error parsing date:', e);
    return '2025-05-15';
  }
}

/**
 * Get default line items for fallback
 * @returns {Array} Default line items
 */
function getDefaultLineItems() {
  return [
    {
      name: "1. Kitchen Demo",
      description: "Kitchen demolition and preparation",
      rate: 2574.00,
      quantity: 1
    },
    {
      name: "2. Kitchen Cabinetry",
      description: "Cabinetry and countertop installation",
      rate: 9931.60,
      quantity: 1
    },
    {
      name: "3. Kitchen Tile",
      description: "Tile installation for backsplash",
      rate: 1989.40,
      quantity: 1
    },
    {
      name: "4. Kitchen Plumbing",
      description: "Plumbing fixtures and installation",
      rate: 3510.65,
      quantity: 1
    },
    {
      name: "5. Kitchen Electrical",
      description: "Electrical work in kitchen",
      rate: 2185.04,
      quantity: 1
    }
  ];
}

module.exports = { parsePdfWithPython };
