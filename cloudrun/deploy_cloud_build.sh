#!/bin/bash
# Script to deploy the service to Google Cloud Run using Cloud Build

# Configuration
PROJECT_ID="fait-444705"  # Google Cloud project ID
REGION="us-central1"

# Submit the build to Cloud Build
echo "Submitting build to Cloud Build..."
gcloud builds submit --config=cloudbuild.yaml --project=$PROJECT_ID

echo "Deployment complete!"
