#!/bin/bash
# Script to deploy the service to Google Cloud Run

# Configuration
PROJECT_ID="fait-444705"  # Google Cloud project ID
SERVICE_NAME="houzz-to-zoho"
REGION="us-central1"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

# Build the Docker image
echo "Building Docker image..."
docker build -t $IMAGE_NAME .

# Push the image to Google Container Registry
echo "Pushing image to Google Container Registry..."
docker push $IMAGE_NAME

# Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated

# Set environment variables from .env file
echo "Setting environment variables..."
ENV_VARS=""
while IFS= read -r line || [[ -n "$line" ]]; do
  # Skip comments and empty lines
  if [[ $line =~ ^#.*$ ]] || [[ -z $line ]]; then
    continue
  fi

  # Add to environment variables string
  if [ -z "$ENV_VARS" ]; then
    ENV_VARS="$line"
  else
    ENV_VARS="$ENV_VARS,$line"
  fi
done < .env

gcloud run services update $SERVICE_NAME \
  --region $REGION \
  --set-env-vars="$ENV_VARS"

echo "Deployment complete!"
