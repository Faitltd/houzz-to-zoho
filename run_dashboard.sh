#!/bin/bash
# Script to run the Houzz to Zoho dashboard

# Change to the script directory
cd "$(dirname "$0")"

# Activate the virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Install Flask if not already installed
pip install flask

# Run the dashboard
python dashboard.py
