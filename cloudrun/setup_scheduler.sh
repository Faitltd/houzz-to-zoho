#!/bin/bash
# Script to set up a Cloud Scheduler job for the service

# Configuration
PROJECT_ID="fait-444705"  # Google Cloud project ID
SERVICE_NAME="houzz-to-zoho"
REGION="us-central1"
SCHEDULER_LOCATION="us-central1"  # Cloud Scheduler location
SERVICE_ACCOUNT="houzz-to-zoho-invoker@$PROJECT_ID.iam.gserviceaccount.com"
SCHEDULE="0 * * * *"  # Every hour at minute 0

# Get the Cloud Run service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format="value(status.url)")

# Create a service account if it doesn't exist
if ! gcloud iam service-accounts describe $SERVICE_ACCOUNT &>/dev/null; then
  echo "Creating service account..."
  gcloud iam service-accounts create houzz-to-zoho-invoker \
    --display-name="Houzz to Zoho Invoker"
fi

# Grant the service account permission to invoke the Cloud Run service
echo "Granting permissions..."
gcloud run services add-iam-policy-binding $SERVICE_NAME \
  --region=$REGION \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/run.invoker"

# Create the Cloud Scheduler job
echo "Creating Cloud Scheduler job..."
gcloud scheduler jobs create http $SERVICE_NAME-sync \
  --location=$SCHEDULER_LOCATION \
  --schedule="$SCHEDULE" \
  --uri="$SERVICE_URL/process-drive" \
  --http-method=GET \
  --oidc-service-account-email=$SERVICE_ACCOUNT \
  --oidc-token-audience=$SERVICE_URL

echo "Cloud Scheduler job created!"
echo "The service will run every hour."
