import os
import json
import time
import base64
import requests
import logging
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from config import (
    CLIENT_ID, CLIENT_SECRET, REDIRECT_URI,
    TOKEN_FILE, ZOHO_TOKEN_URL, TOKEN_ENCRYPTION_KEY
)

logger = logging.getLogger(__name__)

class TokenManager:
    """Manages Zoho API tokens, including storage, retrieval, and refresh."""

    def __init__(self):
        self.token_file = TOKEN_FILE
        self.client_id = CLIENT_ID
        self.client_secret = CLIENT_SECRET
        self.redirect_uri = REDIRECT_URI
        self.token_url = ZOHO_TOKEN_URL
        self.encryption_key = self._get_encryption_key()

    def _get_encryption_key(self):
        """Generate an encryption key from the secret key."""
        # Use PBKDF2 to derive a key from the secret
        salt = b'houzz_to_zoho_salt'  # A fixed salt is fine for this application
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(TOKEN_ENCRYPTION_KEY.encode()))
        return Fernet(key)

    def get_access_token(self):
        """Get a valid access token, refreshing if necessary."""
        token_data = self._load_token_data()

        if not token_data:
            logger.error("No token data found. Please run the authorization process.")
            raise Exception("No token data found. Please run the authorization process.")

        # Check if token is expired or about to expire (within 5 minutes)
        current_time = time.time()
        if 'expires_at' not in token_data or current_time >= token_data['expires_at'] - 300:
            logger.info("Access token expired or about to expire. Refreshing...")
            if 'refresh_token' not in token_data:
                logger.error("No refresh token available. Please run the authorization process again.")
                raise Exception("No refresh token available. Please run the authorization process again.")

            try:
                token_data = self._refresh_token(token_data['refresh_token'])
            except Exception as e:
                logger.error(f"Failed to refresh token: {str(e)}")
                # If the refresh token is invalid, we need to re-authorize
                if "invalid_grant" in str(e).lower():
                    logger.error("Refresh token is invalid. Please run the authorization process again.")
                    raise Exception("Refresh token is invalid. Please run the authorization process again.")
                raise

        return token_data['access_token']

    def save_token_from_auth_code(self, auth_code):
        """Exchange authorization code for tokens and save them."""
        params = {
            'grant_type': 'authorization_code',
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'redirect_uri': self.redirect_uri,
            'code': auth_code
        }

        try:
            response = requests.post(self.token_url, data=params)

            if response.status_code != 200:
                logger.error(f"Failed to get token: {response.text}")
                raise Exception(f"Failed to get token: {response.text}")

            token_data = response.json()

            # Make sure we have a refresh token
            if 'refresh_token' not in token_data:
                logger.warning("No refresh token in response. Adding access_type=offline to auth URL may help.")

            self._save_token_data(token_data)
            logger.info("Successfully saved new tokens from authorization code")
            return token_data
        except requests.RequestException as e:
            logger.error(f"Network error while getting token: {str(e)}")
            raise Exception(f"Network error while getting token: {str(e)}")

    def _refresh_token(self, refresh_token):
        """Refresh the access token using the refresh token."""
        params = {
            'grant_type': 'refresh_token',
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'refresh_token': refresh_token
        }

        try:
            response = requests.post(self.token_url, data=params)

            if response.status_code != 200:
                logger.error(f"Failed to refresh token: {response.text}")
                raise Exception(f"Failed to refresh token: {response.text}")

            token_data = response.json()

            # Preserve the refresh token if it's not included in the response
            if 'refresh_token' not in token_data:
                token_data['refresh_token'] = refresh_token

            self._save_token_data(token_data)
            logger.info("Successfully refreshed access token")
            return token_data
        except requests.RequestException as e:
            logger.error(f"Network error while refreshing token: {str(e)}")
            raise Exception(f"Network error while refreshing token: {str(e)}")

    def _save_token_data(self, token_data):
        """Save token data to file with expiration time and encryption."""
        try:
            # Add expiration timestamp
            if 'expires_in' in token_data:
                token_data['expires_at'] = time.time() + token_data['expires_in']

            # Convert to JSON string
            token_json = json.dumps(token_data)

            # Encrypt the data
            encrypted_data = self.encryption_key.encrypt(token_json.encode())

            # Write to file
            with open(self.token_file, 'wb') as f:
                f.write(encrypted_data)

            logger.debug("Token data encrypted and saved to file")
        except Exception as e:
            logger.error(f"Error saving token data: {str(e)}")
            # Fallback to unencrypted storage if encryption fails
            logger.warning("Falling back to unencrypted token storage")
            with open(self.token_file, 'w') as f:
                json.dump(token_data, f)

    def _load_token_data(self):
        """Load and decrypt token data from file."""
        if not os.path.exists(self.token_file):
            return None

        try:
            # Read the encrypted data
            with open(self.token_file, 'rb') as f:
                encrypted_data = f.read()

            # Decrypt the data
            token_json = self.encryption_key.decrypt(encrypted_data).decode()

            # Parse the JSON
            token_data = json.loads(token_json)

            logger.debug("Token data loaded and decrypted from file")
            return token_data
        except Exception as e:
            logger.error(f"Error decrypting token data: {str(e)}")
            # Try to load as unencrypted JSON as fallback
            try:
                logger.warning("Trying to load token as unencrypted JSON")
                with open(self.token_file, 'r') as f:
                    return json.load(f)
            except Exception as e2:
                logger.error(f"Error loading unencrypted token data: {str(e2)}")
                return None

    def get_auth_url(self):
        """Generate the authorization URL for the user to visit."""
        return (f"https://accounts.zoho.com/oauth/v2/auth?"
                f"scope=ZohoBooks.fullaccess.all&"
                f"client_id={self.client_id}&"
                f"response_type=code&"
                f"access_type=offline&"
                f"prompt=consent&"  # Force consent screen to always get refresh token
                f"redirect_uri={self.redirect_uri}")

    def clear_tokens(self):
        """Clear all stored tokens."""
        if os.path.exists(self.token_file):
            os.remove(self.token_file)
            logger.info("Token file removed")
            return True
        return False

# Initialize with current token for backward compatibility
if __name__ == "__main__":
    # Set up logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    token_manager = TokenManager()

    # Check if we have a token file
    if not os.path.exists(TOKEN_FILE):
        # If not, create one with the current access token
        print("No token file found. Please visit the following URL to authorize the application:")
        print(token_manager.get_auth_url())
        auth_code = input("Enter the authorization code from the redirect URL: ")
        token_data = token_manager.save_token_from_auth_code(auth_code)
        print(f"Successfully saved token data. Access token: {token_data['access_token']}")
    else:
        # If we do, try to get a valid access token
        try:
            access_token = token_manager.get_access_token()
            print(f"Current valid access token: {access_token}")
        except Exception as e:
            print(f"Error: {str(e)}")
            print("Please visit the following URL to authorize the application:")
            print(token_manager.get_auth_url())
            auth_code = input("Enter the authorization code from the redirect URL: ")
            token_data = token_manager.save_token_from_auth_code(auth_code)
            print(f"Successfully saved token data. Access token: {token_data['access_token']}")
