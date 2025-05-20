# Houzz to Zoho Estimate Sync

This tool syncs estimates from Google Drive to Zoho Books. It can process both Excel files (for estimate line items) and PDF files (for attachments).

## Features

- Automatically retrieves the latest Excel and PDF files from a Google Drive folder
- Creates estimates in Zoho Books based on Excel data or PDF content
- Extracts line items and customer information from PDF files
- Attaches PDF files to estimates
- Handles token refresh automatically with secure token storage
- Moves processed files to a "Processed" folder to avoid duplicate processing
- Provides detailed logging
- Supports command-line arguments for flexible usage
- Includes retry mechanisms for API calls
- Sends email notifications for successful syncs and errors
- Provides a web dashboard for monitoring sync status

## Setup

1. Make sure you have the required Python packages installed:

```bash
pip install google-auth google-api-python-client pandas openpyxl requests pdfplumber cryptography flask
```

2. Initialize the token file with your current access token:

```bash
python initialize_token.py
```

3. To get a new access token with a refresh token (recommended for long-term use):

```bash
python sync_estimates_new.py --auth
```

4. Configure email notifications (optional):

Edit `config.py` and update the email notification settings:

```python
# Email notification configuration
ENABLE_EMAIL_NOTIFICATIONS = True  # Set to True to enable email notifications
SMTP_SERVER = 'smtp.gmail.com'  # SMTP server for sending emails
SMTP_PORT = 465  # SMTP port (465 for SSL, 587 for TLS)
SMTP_USERNAME = 'your-email@gmail.com'  # SMTP username
SMTP_PASSWORD = 'your-app-password'  # SMTP password (use app password for Gmail)
NOTIFICATION_EMAIL_FROM = 'your-email@gmail.com'  # From email address
NOTIFICATION_EMAIL_TO = 'recipient@example.com'  # To email address
```

## Configuration

All configuration is stored in `config.py`. You can modify this file to change:

- Google Drive folder ID
- Service account file path
- Zoho API credentials
- Organization and customer IDs
- Logging settings
- File type settings

## Usage

### Basic Usage

To sync both Excel and PDF files (prioritizing PDF if available):

```bash
python sync_estimates_new.py
```

### Advanced Usage

Process only Excel files (create estimate without PDF):

```bash
python sync_estimates_new.py --excel-only
```

Process only PDF files (create a new estimate from PDF data and attach the PDF):

```bash
python sync_estimates_new.py --pdf-only
```

Attach a PDF to an existing estimate:

```bash
python sync_estimates_new.py --pdf-only --estimate-id YOUR_ESTIMATE_ID
```

Run the authorization flow to get a new token:

```bash
python sync_estimates_new.py --auth
```

Skip moving processed files to the "Processed" folder:

```bash
python sync_estimates_new.py --no-move
```

## Logging

Logs are written to `sync_estimates.log` and also displayed in the console. The log level can be configured in `config.py`.

## Files

### Python Implementation
- `sync_estimates_new.py`: Main script
- `config.py`: Configuration settings
- `token_manager.py`: Handles Zoho API token management
- `drive_manager.py`: Handles Google Drive interactions
- `zoho_api.py`: Handles Zoho Books API interactions
- `pdf_parser.py`: Extracts data from PDF files
- `logger.py`: Configures logging
- `email_notifier.py`: Handles email notifications
- `dashboard.py`: Web dashboard for monitoring
- `initialize_token.py`: One-time setup script
- `run_sync.sh`: Shell script to run the sync process
- `run_dashboard.sh`: Shell script to run the dashboard
- `setup_cron.sh`: Shell script to set up a cron job

### Node.js Cloud Run Implementation
- `cloudrun/index.js`: Main Express server
- `cloudrun/zohoApi.js`: Handles Zoho Books API interactions
- `cloudrun/driveWatcher.js`: Handles Google Drive interactions
- `cloudrun/parseEstimatePDF.js`: Extracts data from PDF files
- `cloudrun/customerResolver.js`: Resolves customer names to IDs
- `cloudrun/itemCatalogCache.js`: Caches and matches Zoho items
- `cloudrun/emailNotify.js`: Handles email notifications
- `cloudrun/Dockerfile`: Docker configuration for Cloud Run
- `cloudrun/run_local.sh`: Script to run the service locally
- `cloudrun/deploy.sh`: Script to deploy to Google Cloud Run
- `cloudrun/setup_scheduler.sh`: Script to set up Cloud Scheduler

- `README.md`: This file

## Scheduling

You can schedule this script to run automatically using the provided scripts:

1. Make the scripts executable:

```bash
chmod +x run_sync.sh setup_cron.sh
```

2. Set up a cron job to run every 15 minutes:

```bash
./setup_cron.sh
```

Or manually add a cron job:

```bash
# Run every 15 minutes
*/15 * * * * cd /path/to/houzz-to-zoho && ./run_sync.sh

# Run daily at 8 AM
0 8 * * * cd /path/to/houzz-to-zoho && ./run_sync.sh
```

## Dashboard

The integration includes a web dashboard for monitoring the sync status. To run the dashboard:

```bash
./run_dashboard.sh
```

Then open your browser and go to http://localhost:5000

The dashboard shows:
- Sync status (last sync time, success/failure)
- Token status (valid/expired)
- Recent syncs
- Recent estimates
- Recent log entries

## Cloud Run Implementation

The project also includes a Node.js implementation designed to run on Google Cloud Run. This serverless implementation provides the following benefits:

- Fully automated, serverless operation
- Scheduled execution with Cloud Scheduler
- Automatic scaling based on demand
- No need to maintain a server
- Built-in customer resolution and item matching
- Email notifications for success and failure

### Running Locally

To run the Cloud Run implementation locally:

```bash
cd cloudrun
npm install
./run_local.sh
```

### Deploying to Google Cloud Run

To deploy the Cloud Run implementation:

1. Update the `.env` file with your credentials
2. Edit the `deploy.sh` script to set your Google Cloud project ID
3. Run the deployment script:

```bash
cd cloudrun
./deploy.sh
```

4. Set up a Cloud Scheduler job to run the service automatically:

```bash
cd cloudrun
./setup_scheduler.sh
```

### API Endpoints

The Cloud Run implementation provides the following API endpoints:

- `GET /` - Health check
- `GET /process-drive` - Process all PDF files in the configured Google Drive folder
- `POST /process-file` - Process a specific PDF file by ID

## How It Works

1. The script checks for PDF files in the Google Drive folder
2. If a PDF is found, it extracts line items and customer information from the PDF
3. It creates an estimate in Zoho Books with the extracted data
4. It attaches the PDF to the estimate
5. It moves the processed file to a "Processed" folder to avoid duplicate processing
6. If no PDF is found, it looks for Excel files and processes them instead
7. It sends email notifications for successful syncs and errors
8. It updates the dashboard with the sync status
