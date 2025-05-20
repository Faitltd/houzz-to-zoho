#!/usr/bin/env python3
"""
Initialize Zoho Token

This script initializes the token file with the current access token.
It's a one-time setup to transition from the old script to the new one.
"""

import json
import time
from config import TOKEN_FILE

def initialize_token():
    """Initialize the token file with the current access token."""
    # Current access token from the successful API call
    access_token = '1000.0d9f75bb0cfec85bb4319b98195473ae.cbdeca7be0a250c9ce9d8380ab3965e4'
    
    # Create token data structure
    token_data = {
        'access_token': access_token,
        'expires_in': 3600,  # Standard Zoho token expiration
        'expires_at': time.time() + 3600,  # Current time + 1 hour
        'api_domain': 'https://www.zohoapis.com',
        'token_type': 'Bearer'
    }
    
    # Save to file
    with open(TOKEN_FILE, 'w') as f:
        json.dump(token_data, f)
    
    print(f"Token file initialized with current access token.")
    print(f"Token will expire at: {time.ctime(token_data['expires_at'])}")
    print(f"To refresh the token or get a new one with a refresh token, run:")
    print(f"python sync_estimates_new.py --auth")

if __name__ == "__main__":
    initialize_token()
