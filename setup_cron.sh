#!/bin/bash
# Script to set up a cron job for the Houzz to Zoho sync process

# Get the absolute path to the script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Define the cron job (run every 15 minutes)
CRON_JOB="*/15 * * * * cd $SCRIPT_DIR && ./run_sync.sh"

# Check if the cron job already exists
EXISTING_CRON=$(crontab -l 2>/dev/null | grep -F "$SCRIPT_DIR/run_sync.sh")

if [ -n "$EXISTING_CRON" ]; then
    echo "Cron job already exists:"
    echo "$EXISTING_CRON"
    echo "No changes made."
else
    # Add the cron job
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "Cron job added successfully:"
    echo "$CRON_JOB"
fi

# Show the current crontab
echo "Current crontab:"
crontab -l
