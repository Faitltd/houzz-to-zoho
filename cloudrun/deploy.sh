#!/bin/bash
# Script to deploy the service to Google Cloud Run

# Configuration
PROJECT_ID="fait-444705"  # Google Cloud project ID
SERVICE_NAME="houzz-to-zoho"
REGION="us-central1"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

# Build the Docker image
echo "Building Docker image..."
docker buildx build --platform linux/amd64 -t $IMAGE_NAME .

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

# Set environment variables from env.yaml file
echo "Setting environment variables..."
gcloud run services update $SERVICE_NAME \
  --region $REGION \
  --update-env-vars-file=env.yaml

echo "Deployment complete!"
