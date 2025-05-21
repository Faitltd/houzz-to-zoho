#!/usr/bin/env python3
"""
Houzz to Zoho Estimate Sync Tool

This script syncs estimates from Google Drive to Zoho Books.
It can process both Excel files (for estimate line items) and PDF files (for attachments).
"""

import os
import sys
import argparse
import pandas as pd
import traceback
from logger import logger
from drive_manager import DriveManager
from zoho_api import ZohoAPI
from token_manager import TokenManager
from pdf_parser import extract_line_items, extract_customer_info
from email_notifier import EmailNotifier
from config import LOG_FILE

# Import dashboard update function if available
try:
    from dashboard import update_dashboard_data
    dashboard_available = True
except ImportError:
    dashboard_available = False

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Sync estimates from Google Drive to Zoho Books')
    parser.add_argument('--excel-only', action='store_true', help='Only process Excel files, not PDFs')
    parser.add_argument('--pdf-only', action='store_true', help='Only process PDF files, not Excel data')
    parser.add_argument('--auth', action='store_true', help='Run the authorization flow to get a new token')
    parser.add_argument('--estimate-id', help='Attach PDF to an existing estimate ID instead of creating a new one')
    parser.add_argument('--no-move', action='store_true', help='Do not move processed files to the "Processed" folder')
    return parser.parse_args()

def create_sample_data():
    """Create a sample DataFrame for testing."""
    logger.info("Creating sample data for testing")
    return pd.DataFrame({
        'item': ['Framing', 'Plumbing'],
        'description': ['Wood framing', 'Rough plumbing'],
        'Quantity': [1, 1],
        'Unit Price': [2000, 3000]
    })

def process_excel_file(drive_manager, zoho_api, no_move=False):
    """
    Process the latest Excel file and create an estimate.

    Args:
        drive_manager: DriveManager instance
        zoho_api: ZohoAPI instance
        no_move: If True, don't move the file to the "Processed" folder

    Returns:
        Tuple of (estimate_id, estimate_number)
    """
    # Get the latest Excel file
    excel_file = drive_manager.get_latest_excel_file()
    if not excel_file:
        logger.warning("No Excel files found. Using sample data instead.")
        df = create_sample_data()
        # No file to move to processed folder
        file_processed = False
    else:
        try:
            # Read the Excel file into a DataFrame
            df = drive_manager.read_excel_to_dataframe(excel_file['id'])
            if df.empty:
                logger.warning("Excel file is empty. Using sample data instead.")
                df = create_sample_data()
            file_processed = True
        except Exception as e:
            logger.error(f"Error reading Excel file: {str(e)}. Using sample data instead.")
            df = create_sample_data()
            file_processed = False

    # Display a preview of the data
    logger.info("=== Preview of Estimate Data ===")
    logger.info(f"\n{df.head().to_string()}")

    # Create the estimate in Zoho Books
    estimate_id, estimate_number = zoho_api.create_estimate(df)
    logger.info(f"Created estimate {estimate_number} with ID {estimate_id}")

    # Move the file to the "Processed" folder if we processed a real file and not skipping move
    if file_processed and excel_file and not no_move:
        if drive_manager.move_file_to_processed(excel_file['id'], excel_file['name']):
            logger.info(f"Moved Excel file {excel_file['name']} to 'Processed' folder")
        else:
            logger.warning(f"Failed to move Excel file {excel_file['name']} to 'Processed' folder")
    elif file_processed and excel_file and no_move:
        logger.info(f"Skipping move of Excel file {excel_file['name']} to 'Processed' folder (--no-move specified)")

    return estimate_id, estimate_number

def process_pdf_file(drive_manager, zoho_api, estimate_id=None, no_move=False):
    """
    Process the latest PDF file and attach it to an estimate.

    Args:
        drive_manager: DriveManager instance
        zoho_api: ZohoAPI instance
        estimate_id: Optional ID of an existing estimate to attach the PDF to
        no_move: If True, don't move the file to the "Processed" folder

    Returns:
        The estimate ID
    """
    # Get the latest PDF file
    pdf_file = drive_manager.get_latest_pdf_file()
    if not pdf_file:
        logger.warning("No PDF files found. Skipping PDF attachment.")
        return None

    # Download the PDF file
    pdf_content = drive_manager.download_file(pdf_file['id'])

    # If no estimate ID is provided, we need to create a new estimate from the PDF
    if not estimate_id:
        logger.info("No estimate ID provided. Creating a new estimate from PDF data.")

        # Extract line items from the PDF
        df = extract_line_items(pdf_content)

        # Reset the file pointer
        pdf_content.seek(0)

        # Extract customer info from the PDF
        customer_info = extract_customer_info(pdf_content)

        # Display a preview of the data
        logger.info("=== Preview of Estimate Data from PDF ===")
        logger.info(f"\n{df.head().to_string()}")
        logger.info(f"Customer: {customer_info['customer_name']}")
        logger.info(f"Estimate Number: {customer_info['estimate_number']}")
        logger.info(f"Date: {customer_info['date']}")
        logger.info(f"Total: ${customer_info['total']}")

        # Create the estimate in Zoho Books
        estimate_id, estimate_number = zoho_api.create_estimate(df, customer_info)
        logger.info(f"Created estimate {estimate_number} with ID {estimate_id} from PDF data")

    # Reset the file pointer
    pdf_content.seek(0)

    # Attach the PDF to the estimate
    zoho_api.attach_pdf_to_estimate(estimate_id, pdf_content, pdf_file['name'])
    logger.info(f"Attached PDF {pdf_file['name']} to estimate {estimate_id}")

    # Move the file to the "Processed" folder if not skipping move
    if not no_move:
        if drive_manager.move_file_to_processed(pdf_file['id'], pdf_file['name']):
            logger.info(f"Moved PDF file {pdf_file['name']} to 'Processed' folder")
        else:
            logger.warning(f"Failed to move PDF file {pdf_file['name']} to 'Processed' folder")
    else:
        logger.info(f"Skipping move of PDF file {pdf_file['name']} to 'Processed' folder (--no-move specified)")

    return estimate_id

def run_auth_flow():
    """Run the authorization flow to get a new token."""
    token_manager = TokenManager()
    auth_url = token_manager.get_auth_url()

    print("\n=== Zoho Books Authorization ===")
    print("Please visit the following URL to authorize the application:")
    print(auth_url)
    print("\nAfter granting permission, you will be redirected to a URL like:")
    print("https://www.zoho.com/books?code=1000.xxxx.yyyy")
    print("\nCopy the 'code' parameter value from that URL.")

    auth_code = input("\nEnter the authorization code: ")
    token_data = token_manager.save_token_from_auth_code(auth_code)

    print(f"\nAuthorization successful!")
    print(f"Access token: {token_data['access_token']}")
    if 'refresh_token' in token_data:
        print(f"Refresh token: {token_data['refresh_token']}")
    print(f"Token expires in: {token_data.get('expires_in', 'unknown')} seconds")

    return token_data

def main():
    """Main function to run the sync process."""
    # Parse command line arguments
    args = parse_arguments()

    # Run the authorization flow if requested
    if args.auth:
        run_auth_flow()
        return

    # Initialize the email notifier
    email_notifier = EmailNotifier()

    # Track processed files and created estimates
    processed_files = []
    created_estimates = []
    errors = []

    try:
        # Initialize the managers
        drive_manager = DriveManager()
        zoho_api = ZohoAPI()

        # Process files based on arguments
        if args.pdf_only and args.estimate_id:
            # Only attach PDF to an existing estimate
            pdf_file = drive_manager.get_latest_pdf_file()
            if pdf_file:
                estimate_id = process_pdf_file(drive_manager, zoho_api, args.estimate_id, args.no_move)
                if estimate_id:
                    processed_files.append(pdf_file['name'])
                    # Get the estimate details
                    estimate_data = zoho_api.get_estimate(estimate_id)
                    if estimate_data:
                        estimate_number = estimate_data.get('estimate', {}).get('estimate_number')
                        created_estimates.append((estimate_id, estimate_number))
            else:
                logger.warning("No PDF files found.")
        elif args.pdf_only:
            # Create a new estimate from PDF data and attach the PDF
            pdf_file = drive_manager.get_latest_pdf_file()
            if pdf_file:
                estimate_id = process_pdf_file(drive_manager, zoho_api, no_move=args.no_move)
                if estimate_id:
                    processed_files.append(pdf_file['name'])
                    # Get the estimate details
                    estimate_data = zoho_api.get_estimate(estimate_id)
                    if estimate_data:
                        estimate_number = estimate_data.get('estimate', {}).get('estimate_number')
                        created_estimates.append((estimate_id, estimate_number))

                        # Send success notification
                        customer_name = None
                        if 'estimate' in estimate_data and 'customer_name' in estimate_data['estimate']:
                            customer_name = estimate_data['estimate']['customer_name']
                        email_notifier.send_success_notification(estimate_id, estimate_number, customer_name)
            else:
                logger.warning("No PDF files found.")
        elif args.excel_only:
            # Only create an estimate from Excel data
            excel_file = drive_manager.get_latest_excel_file()
            if excel_file:
                estimate_id, estimate_number = process_excel_file(drive_manager, zoho_api, no_move=args.no_move)
                if estimate_id:
                    processed_files.append(excel_file['name'])
                    created_estimates.append((estimate_id, estimate_number))

                    # Send success notification
                    email_notifier.send_success_notification(estimate_id, estimate_number)
            else:
                logger.warning("No Excel files found.")
        else:
            # By default, prioritize PDF processing if available
            pdf_file = drive_manager.get_latest_pdf_file()
            if pdf_file:
                logger.info("Found PDF file. Creating estimate from PDF data.")
                estimate_id = process_pdf_file(drive_manager, zoho_api, no_move=args.no_move)
                if estimate_id:
                    processed_files.append(pdf_file['name'])
                    # Get the estimate details
                    estimate_data = zoho_api.get_estimate(estimate_id)
                    if estimate_data:
                        estimate_number = estimate_data.get('estimate', {}).get('estimate_number')
                        created_estimates.append((estimate_id, estimate_number))

                        # Send success notification
                        customer_name = None
                        if 'estimate' in estimate_data and 'customer_name' in estimate_data['estimate']:
                            customer_name = estimate_data['estimate']['customer_name']
                        email_notifier.send_success_notification(estimate_id, estimate_number, customer_name)
            else:
                logger.info("No PDF file found. Creating estimate from Excel data.")
                excel_file = drive_manager.get_latest_excel_file()
                if excel_file:
                    estimate_id, estimate_number = process_excel_file(drive_manager, zoho_api, no_move=args.no_move)
                    if estimate_id:
                        processed_files.append(excel_file['name'])
                        created_estimates.append((estimate_id, estimate_number))

                        # Send success notification
                        email_notifier.send_success_notification(estimate_id, estimate_number)
                else:
                    logger.warning("No Excel files found.")

        # Send sync summary
        if processed_files or created_estimates:
            email_notifier.send_sync_summary(processed_files, created_estimates, errors)

        # Update dashboard data
        if dashboard_available:
            update_dashboard_data('Success', created_estimates, processed_files)

        logger.info("Sync completed successfully")
    except Exception as e:
        error_message = str(e)
        stack_trace = traceback.format_exc()
        logger.error(f"Sync failed: {error_message}\n{stack_trace}")

        # Send error notification
        email_notifier.send_error_notification(error_message, LOG_FILE)

        # Update dashboard data
        if dashboard_available:
            update_dashboard_data('Failed', created_estimates, processed_files)

        return 1

    return 0

if __name__ == "__main__":
    sys.exit(main())
