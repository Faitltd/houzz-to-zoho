#!/bin/bash
# Script to run the Cloud Run service locally

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Run the service
echo "Starting the service..."
npm start
