# Houzz to Zoho Cloud Run Service

This service automatically syncs Houzz PDF estimates from Google Drive to Zoho Books. It's designed to run on Google Cloud Run, providing a serverless solution that can be triggered via HTTP requests or scheduled with Cloud Scheduler.

## Features

- Automatically processes PDF estimates from a Google Drive folder
- Extracts estimate data using PDF parsing
- Creates estimates in Zoho Books
- Attaches the original PDF to the estimate
- Moves processed files to a "Processed" folder
- Provides detailed logging
- Supports both batch processing and individual file processing

## Prerequisites

- Node.js 18 or later
- Google Cloud account
- Google Drive API access
- Zoho Books API access
- Docker (for local testing and deployment)

## Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

4. Update the `.env` file with your credentials:

```
# Zoho API credentials
ZOHO_CLIENT_ID=your_client_id
ZOHO_CLIENT_SECRET=your_client_secret
ZOHO_REFRESH_TOKEN=your_refresh_token
ZOHO_ORGANIZATION_ID=your_organization_id
ZOHO_CUSTOMER_ID=your_customer_id

# Google Drive configuration
GOOGLE_SERVICE_ACCOUNT_CREDENTIALS='{"type":"service_account",...}'
DRIVE_FOLDER_ID=your_drive_folder_id
PROCESSED_FOLDER_ID=your_processed_folder_id

# Server configuration
PORT=8080
```

## Local Development

Run the server locally:

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

## API Endpoints

### Health Check

```
GET /
```

Returns a 200 OK response if the service is running.

### Process Drive Folder

```
GET /process-drive
```

Processes all PDF files in the configured Google Drive folder.

### Process Specific File

```
POST /process-file
```

Processes a specific PDF file by ID.

Request body:
```json
{
  "fileId": "your_file_id"
}
```

## Deployment to Google Cloud Run

1. Build the Docker image:

```bash
docker build -t gcr.io/your-project-id/houzz-to-zoho .
```

2. Push the image to Google Container Registry:

```bash
docker push gcr.io/your-project-id/houzz-to-zoho
```

3. Deploy to Cloud Run:

```bash
gcloud run deploy houzz-to-zoho \
  --image gcr.io/your-project-id/houzz-to-zoho \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

4. Set environment variables:

```bash
gcloud run services update houzz-to-zoho \
  --set-env-vars="ZOHO_CLIENT_ID=your_client_id,ZOHO_CLIENT_SECRET=your_client_secret,..."
```

## Scheduling with Cloud Scheduler

To automatically run the service every 15 minutes:

1. Create a service account with appropriate permissions
2. Create a Cloud Scheduler job:

```bash
gcloud scheduler jobs create http houzz-to-zoho-sync \
  --schedule="*/15 * * * *" \
  --uri="https://your-cloud-run-url/process-drive" \
  --http-method=GET \
  --oidc-service-account-email=your-service-account@your-project.iam.gserviceaccount.com
```

## Security Considerations

- The service uses OAuth 2.0 for authentication with both Google and Zoho APIs
- Sensitive credentials are stored as environment variables
- For production, consider using Google Secret Manager to store credentials
- Restrict access to the Cloud Run service using IAM permissions

## Troubleshooting

- Check the logs in Google Cloud Console
- Verify that the service account has the necessary permissions
- Ensure that the Zoho refresh token is valid
- Check that the Google Drive folder IDs are correct
