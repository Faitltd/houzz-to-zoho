#!/usr/bin/env python3
"""
Test script for the OCR-based PDF parser
"""

import os
import sys
import json
import argparse
from ocr_pdf_parser import extract_text_with_ocr, extract_customer_info, extract_line_items

def test_ocr_extraction(pdf_path):
    """
    Test the OCR text extraction functionality
    """
    print(f"\n=== Testing OCR Text Extraction ===")
    print(f"PDF file: {pdf_path}")
    
    try:
        with open(pdf_path, 'rb') as pdf_file:
            # Extract text using OCR
            print("Extracting text with OCR...")
            text = extract_text_with_ocr(pdf_file)
            
            # Print a sample of the extracted text
            print(f"\nExtracted {len(text)} characters of text")
            print("Sample of extracted text:")
            print("-" * 50)
            print(text[:500] + "..." if len(text) > 500 else text)
            print("-" * 50)
            
            return text
    except Exception as e:
        print(f"❌ OCR text extraction failed: {str(e)}")
        return None

def test_customer_info_extraction(text):
    """
    Test the customer information extraction functionality
    """
    print(f"\n=== Testing Customer Info Extraction ===")
    
    if not text:
        print("❌ No text to extract customer info from")
        return None
    
    try:
        # Extract customer info
        print("Extracting customer info...")
        customer_info = extract_customer_info(text)
        
        # Print the extracted customer info
        print("\nExtracted customer info:")
        print("-" * 50)
        for key, value in customer_info.items():
            print(f"{key}: {value}")
        print("-" * 50)
        
        return customer_info
    except Exception as e:
        print(f"❌ Customer info extraction failed: {str(e)}")
        return None

def test_line_item_extraction(text):
    """
    Test the line item extraction functionality
    """
    print(f"\n=== Testing Line Item Extraction ===")
    
    if not text:
        print("❌ No text to extract line items from")
        return None
    
    try:
        # Extract line items
        print("Extracting line items...")
        line_items_df = extract_line_items(text)
        
        # Convert DataFrame to list of dictionaries
        line_items = line_items_df.to_dict('records')
        
        # Print the extracted line items
        print(f"\nExtracted {len(line_items)} line items:")
        print("-" * 50)
        for i, item in enumerate(line_items):
            print(f"Item {i+1}:")
            for key, value in item.items():
                print(f"  {key}: {value}")
            print()
        print("-" * 50)
        
        return line_items
    except Exception as e:
        print(f"❌ Line item extraction failed: {str(e)}")
        return None

def test_full_extraction(pdf_path):
    """
    Test the full extraction process
    """
    print(f"\n=== Testing Full Extraction Process ===")
    print(f"PDF file: {pdf_path}")
    
    try:
        with open(pdf_path, 'rb') as pdf_file:
            # Extract text using OCR
            print("Extracting text with OCR...")
            text = extract_text_with_ocr(pdf_file)
            
            # Extract customer info
            print("Extracting customer info...")
            customer_info = extract_customer_info(text)
            
            # Extract line items
            print("Extracting line items...")
            line_items_df = extract_line_items(text)
            line_items = line_items_df.to_dict('records')
            
            # Create result object
            result = {
                'customer_info': customer_info,
                'line_items': line_items,
                'total_amount': float(line_items_df['Unit Price'].sum()) if not line_items_df.empty else 0
            }
            
            # Print the result as JSON
            print("\nFull extraction result:")
            print("-" * 50)
            print(json.dumps(result, indent=2))
            print("-" * 50)
            
            return result
    except Exception as e:
        print(f"❌ Full extraction failed: {str(e)}")
        return None

def main():
    parser = argparse.ArgumentParser(description='Test the OCR-based PDF parser')
    parser.add_argument('pdf_file', help='Path to the PDF file to test')
    parser.add_argument('--test', choices=['text', 'customer', 'items', 'full'], default='full',
                        help='Which test to run (default: full)')
    
    args = parser.parse_args()
    
    # Check if the PDF file exists
    if not os.path.isfile(args.pdf_file):
        print(f"Error: PDF file '{args.pdf_file}' not found")
        return 1
    
    # Run the requested test
    if args.test == 'text':
        test_ocr_extraction(args.pdf_file)
    elif args.test == 'customer':
        text = test_ocr_extraction(args.pdf_file)
        test_customer_info_extraction(text)
    elif args.test == 'items':
        text = test_ocr_extraction(args.pdf_file)
        test_line_item_extraction(text)
    else:  # full
        test_full_extraction(args.pdf_file)
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
