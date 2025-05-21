#!/bin/bash
# Script to run the Houzz to Zoho sync process

# Change to the script directory
cd "$(dirname "$0")"

# Activate the virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Set up logging
LOG_FILE="cron.log"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

echo "[$TIMESTAMP] Starting Houzz to Zoho sync" >> $LOG_FILE

# Run the sync script
python sync_estimates_new.py >> $LOG_FILE 2>&1

# Check the exit code
if [ $? -eq 0 ]; then
    echo "[$TIMESTAMP] Sync completed successfully" >> $LOG_FILE
else
    echo "[$TIMESTAMP] Sync failed" >> $LOG_FILE
fi

# Deactivate the virtual environment if it was activated
if [ -n "$VIRTUAL_ENV" ]; then
    deactivate
fi
