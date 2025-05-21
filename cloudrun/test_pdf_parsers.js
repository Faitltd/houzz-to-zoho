/**
 * Test script for PDF parsers
 * 
 * This script tests the different PDF parsers:
 * 1. Python parser (pdfplumber)
 * 2. OCR parser (Google Cloud Vision)
 * 3. JavaScript parser (pdf-parse)
 * 
 * Usage:
 * node test_pdf_parsers.js
 */

const fs = require('fs');
const path = require('path');
const { parsePdfWithPython } = require('./pythonPdfParser');
const { parseOcrPdf } = require('./ocrPdfParser');
const { parseEstimatePDF } = require('./parseEstimatePDF');

// Path to test PDF
const TEST_PDF_PATH = path.join(__dirname, '..', 'test-estimate.pdf');

// Test the Python parser
async function testPythonParser() {
  console.log('\n=== Testing Python Parser (pdfplumber) ===');
  
  try {
    const pdfBuffer = fs.readFileSync(TEST_PDF_PATH);
    console.log(`Loaded test PDF from ${TEST_PDF_PATH} (${pdfBuffer.length} bytes)`);
    
    console.log('Parsing with Python parser...');
    const result = await parsePdfWithPython(pdfBuffer);
    
    console.log('✅ Python parser succeeded!');
    console.log('Result:');
    console.log(JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.log('❌ Python parser failed!');
    console.log(`Error: ${error.message}`);
    return null;
  }
}

// Test the OCR parser
async function testOcrParser() {
  console.log('\n=== Testing OCR Parser (Google Cloud Vision) ===');
  
  try {
    const pdfBuffer = fs.readFileSync(TEST_PDF_PATH);
    console.log(`Loaded test PDF from ${TEST_PDF_PATH} (${pdfBuffer.length} bytes)`);
    
    console.log('Parsing with OCR parser...');
    const result = await parseOcrPdf(pdfBuffer);
    
    console.log('✅ OCR parser succeeded!');
    console.log('Result:');
    console.log(JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.log('❌ OCR parser failed!');
    console.log(`Error: ${error.message}`);
    return null;
  }
}

// Test the main parser with fallback mechanism
async function testMainParser() {
  console.log('\n=== Testing Main Parser with Fallback Mechanism ===');
  
  try {
    const pdfBuffer = fs.readFileSync(TEST_PDF_PATH);
    console.log(`Loaded test PDF from ${TEST_PDF_PATH} (${pdfBuffer.length} bytes)`);
    
    console.log('Parsing with main parser (with fallbacks)...');
    const result = await parseEstimatePDF(pdfBuffer);
    
    console.log('✅ Main parser succeeded!');
    console.log('Result:');
    console.log(JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.log('❌ Main parser failed!');
    console.log(`Error: ${error.message}`);
    return null;
  }
}

// Validate the parser results
function validateResults(pythonResult, ocrResult, mainResult) {
  console.log('\n=== Validating Parser Results ===');
  
  // Check if we have results from all parsers
  const allParsersSucceeded = pythonResult && ocrResult && mainResult;
  if (!allParsersSucceeded) {
    console.log('❌ Not all parsers succeeded, skipping validation');
    return;
  }
  
  // Check if customer name is consistent
  const customerNames = [
    pythonResult.customer_name,
    ocrResult.customer_name,
    mainResult.customer_name
  ];
  
  const uniqueCustomerNames = [...new Set(customerNames)];
  if (uniqueCustomerNames.length === 1) {
    console.log(`✅ Customer name is consistent across all parsers: "${uniqueCustomerNames[0]}"`);
  } else {
    console.log('❌ Customer name is inconsistent across parsers:');
    console.log(`  - Python: "${pythonResult.customer_name}"`);
    console.log(`  - OCR: "${ocrResult.customer_name}"`);
    console.log(`  - Main: "${mainResult.customer_name}"`);
  }
  
  // Check if line items were extracted
  const lineItemCounts = [
    pythonResult.line_items?.length || 0,
    ocrResult.line_items?.length || 0,
    mainResult.line_items?.length || 0
  ];
  
  console.log('Line item counts:');
  console.log(`  - Python: ${lineItemCounts[0]} items`);
  console.log(`  - OCR: ${lineItemCounts[1]} items`);
  console.log(`  - Main: ${lineItemCounts[2]} items`);
  
  // Check which parser extracted the most line items
  const maxLineItems = Math.max(...lineItemCounts);
  const bestParserIndex = lineItemCounts.indexOf(maxLineItems);
  const parserNames = ['Python', 'OCR', 'Main'];
  
  if (maxLineItems > 0) {
    console.log(`✅ Best parser for line items: ${parserNames[bestParserIndex]} (${maxLineItems} items)`);
  } else {
    console.log('❌ No parser was able to extract line items');
  }
}

// Run all tests
async function runTests() {
  try {
    console.log('Starting PDF parser tests...');
    
    // Test each parser
    const pythonResult = await testPythonParser();
    const ocrResult = await testOcrParser();
    const mainResult = await testMainParser();
    
    // Validate results
    validateResults(pythonResult, ocrResult, mainResult);
    
    console.log('\nTests completed!');
  } catch (error) {
    console.error('Error running tests:', error.message);
  }
}

// Run the tests
runTests();
