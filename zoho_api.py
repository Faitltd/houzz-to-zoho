import requests
import datetime
import time
import pandas as pd
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from config import (
    ORGANIZATION_ID, CUSTOMER_ID,
    ZOHO_ESTIMATES_URL, ZOHO_ATTACHMENTS_URL,
    MAX_RETRIES, RETRY_BACKOFF_FACTOR, RETRY_STATUS_FORCELIST
)
from token_manager import TokenManager
from logger import logger

class ZohoAPI:
    """Handles interactions with the Zoho Books API."""

    def __init__(self):
        self.organization_id = ORGANIZATION_ID
        self.customer_id = CUSTOMER_ID
        self.token_manager = TokenManager()
        self.estimates_url = ZOHO_ESTIMATES_URL
        self.attachments_url = ZOHO_ATTACHMENTS_URL
        self.session = self._create_session()

    def _create_session(self):
        """Create a requests session with retry logic."""
        session = requests.Session()

        # Configure retry strategy
        retry_strategy = Retry(
            total=MAX_RETRIES,
            backoff_factor=RETRY_BACKOFF_FACTOR,
            status_forcelist=RETRY_STATUS_FORCELIST,
            allowed_methods=["GET", "POST", "PUT", "DELETE", "PATCH"]
        )

        # Mount the adapter to the session
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("https://", adapter)
        session.mount("http://", adapter)

        return session

    def _get_headers(self):
        """Get the headers for API requests, including a valid access token."""
        access_token = self.token_manager.get_access_token()
        return {
            "Authorization": f"Zoho-oauthtoken {access_token}",
            "Content-Type": "application/json"
        }

    def _get_params(self):
        """Get the common query parameters for API requests."""
        return {
            "organization_id": self.organization_id
        }

    def _handle_response(self, response, operation):
        """Handle API response and check for errors."""
        try:
            if 200 <= response.status_code < 300:
                return response.json()
            else:
                error_message = f"API error during {operation}: {response.status_code} - {response.text}"
                logger.error(error_message)

                # Check for specific error types
                if response.status_code == 401:
                    # Token might be invalid, try to refresh it
                    logger.warning("Authentication error. Clearing token cache and retrying...")
                    self.token_manager.clear_tokens()
                    raise Exception(f"Authentication error: {response.text}. Please re-authenticate.")
                elif response.status_code == 429:
                    # Rate limit exceeded
                    logger.warning("Rate limit exceeded. Waiting before retry...")
                    retry_after = int(response.headers.get('Retry-After', '60'))
                    time.sleep(retry_after)
                    raise Exception(f"Rate limit exceeded. Retry after {retry_after} seconds.")

                raise Exception(error_message)
        except ValueError:
            # Response is not JSON
            error_message = f"Invalid JSON response during {operation}: {response.text}"
            logger.error(error_message)
            raise Exception(error_message)

    def create_estimate(self, df, customer_info=None):
        """
        Create an estimate in Zoho Books from a DataFrame.

        Args:
            df: DataFrame with line items
            customer_info: Optional dictionary with customer information

        Returns:
            Tuple of (estimate_id, estimate_number)
        """
        try:
            # Transform DataFrame to Zoho estimate format
            line_items = []
            for _, row in df.iterrows():
                item = {
                    "name": str(row['item']),
                    "description": str(row['description']),
                    "rate": float(row['Unit Price']),
                    "quantity": int(row['Quantity'])
                }
                line_items.append(item)

            # Build the payload
            payload = {
                "customer_id": self.customer_id,
                "date": datetime.date.today().isoformat(),
                "line_items": line_items,
                "notes": "Automatically created from Google Drive estimate"
            }

            # Add customer info if provided
            if customer_info:
                # Use the date from customer_info if available
                if 'date' in customer_info:
                    try:
                        # Try to parse the date
                        date_obj = datetime.datetime.strptime(customer_info['date'], "%B %d, %Y").date()
                        payload["date"] = date_obj.isoformat()
                    except ValueError:
                        # If parsing fails, keep the default date
                        logger.warning(f"Could not parse date: {customer_info['date']}. Using today's date.")

                # Add reference number (estimate number from PDF)
                if 'estimate_number' in customer_info:
                    payload["reference_number"] = customer_info['estimate_number']

                # Add notes with customer name
                if 'customer_name' in customer_info:
                    payload["notes"] = f"Estimate for {customer_info['customer_name']}. Automatically created from PDF."

                # Add additional customer info if available
                if 'email' in customer_info:
                    payload["email"] = customer_info['email']

                if 'phone' in customer_info:
                    payload["phone"] = customer_info['phone']

            # Make the API request with retry logic
            max_attempts = 3
            for attempt in range(1, max_attempts + 1):
                try:
                    logger.debug(f"Creating estimate (attempt {attempt}/{max_attempts})...")
                    response = self.session.post(
                        self.estimates_url,
                        json=payload,
                        headers=self._get_headers(),
                        params=self._get_params()
                    )

                    # Process the response
                    if response.status_code == 201:
                        estimate_data = response.json()
                        estimate_id = estimate_data.get('estimate', {}).get('estimate_id')
                        estimate_number = estimate_data.get('estimate', {}).get('estimate_number')
                        logger.info(f"Successfully created estimate {estimate_number} with ID {estimate_id}")
                        return estimate_id, estimate_number
                    else:
                        # Handle specific error cases
                        if response.status_code == 401 and attempt < max_attempts:
                            # Token might be invalid, try to refresh it
                            logger.warning("Authentication error. Refreshing token and retrying...")
                            self.token_manager.clear_tokens()
                            continue
                        elif response.status_code == 429 and attempt < max_attempts:
                            # Rate limit exceeded
                            retry_after = int(response.headers.get('Retry-After', '60'))
                            logger.warning(f"Rate limit exceeded. Waiting {retry_after} seconds before retry...")
                            time.sleep(retry_after)
                            continue

                        # Other error, raise exception
                        logger.error(f"Failed to create estimate: {response.status_code} - {response.text}")
                        raise Exception(f"Failed to create estimate: {response.status_code} - {response.text}")
                except requests.RequestException as e:
                    if attempt < max_attempts:
                        logger.warning(f"Network error: {str(e)}. Retrying in 5 seconds...")
                        time.sleep(5)
                        continue
                    else:
                        logger.error(f"Network error after {max_attempts} attempts: {str(e)}")
                        raise

            # If we get here, all attempts failed
            raise Exception(f"Failed to create estimate after {max_attempts} attempts")
        except Exception as e:
            logger.error(f"Error creating estimate: {str(e)}")
            raise

    def attach_pdf_to_estimate(self, estimate_id, pdf_content, file_name):
        """Attach a PDF file to an existing estimate."""
        try:
            # Prepare the URL
            url = self.attachments_url.format(estimate_id=estimate_id)

            # Prepare the files for upload
            files = {
                'attachment': (file_name, pdf_content, 'application/pdf')
            }

            # Make the API request with retry logic
            max_attempts = 3
            for attempt in range(1, max_attempts + 1):
                try:
                    logger.debug(f"Attaching PDF to estimate {estimate_id} (attempt {attempt}/{max_attempts})...")

                    # For file uploads, we need to use a regular request (not session)
                    # because the retry mechanism doesn't work well with file uploads
                    response = requests.post(
                        url,
                        files=files,
                        headers={"Authorization": self._get_headers()["Authorization"]},
                        params=self._get_params()
                    )

                    # Process the response
                    if response.status_code == 201 or response.status_code == 200:
                        logger.info(f"Successfully attached PDF to estimate {estimate_id}")
                        return True
                    else:
                        # Handle specific error cases
                        if response.status_code == 401 and attempt < max_attempts:
                            # Token might be invalid, try to refresh it
                            logger.warning("Authentication error. Refreshing token and retrying...")
                            self.token_manager.clear_tokens()
                            # Reset the file pointer
                            pdf_content.seek(0)
                            continue
                        elif response.status_code == 429 and attempt < max_attempts:
                            # Rate limit exceeded
                            retry_after = int(response.headers.get('Retry-After', '60'))
                            logger.warning(f"Rate limit exceeded. Waiting {retry_after} seconds before retry...")
                            time.sleep(retry_after)
                            # Reset the file pointer
                            pdf_content.seek(0)
                            continue

                        # Other error, raise exception
                        logger.error(f"Failed to attach PDF: {response.status_code} - {response.text}")
                        raise Exception(f"Failed to attach PDF: {response.status_code} - {response.text}")
                except requests.RequestException as e:
                    if attempt < max_attempts:
                        logger.warning(f"Network error: {str(e)}. Retrying in 5 seconds...")
                        time.sleep(5)
                        # Reset the file pointer
                        pdf_content.seek(0)
                        continue
                    else:
                        logger.error(f"Network error after {max_attempts} attempts: {str(e)}")
                        raise

            # If we get here, all attempts failed
            raise Exception(f"Failed to attach PDF after {max_attempts} attempts")
        except Exception as e:
            logger.error(f"Error attaching PDF to estimate: {str(e)}")
            raise

    def get_estimate(self, estimate_id):
        """Get an estimate by ID."""
        try:
            url = f"{self.estimates_url}/{estimate_id}"

            # Make the API request with retry logic
            max_attempts = 3
            for attempt in range(1, max_attempts + 1):
                try:
                    logger.debug(f"Getting estimate {estimate_id} (attempt {attempt}/{max_attempts})...")
                    response = self.session.get(
                        url,
                        headers=self._get_headers(),
                        params=self._get_params()
                    )

                    # Process the response
                    if response.status_code == 200:
                        logger.info(f"Successfully retrieved estimate {estimate_id}")
                        return response.json()
                    else:
                        # Handle specific error cases
                        if response.status_code == 401 and attempt < max_attempts:
                            # Token might be invalid, try to refresh it
                            logger.warning("Authentication error. Refreshing token and retrying...")
                            self.token_manager.clear_tokens()
                            continue
                        elif response.status_code == 429 and attempt < max_attempts:
                            # Rate limit exceeded
                            retry_after = int(response.headers.get('Retry-After', '60'))
                            logger.warning(f"Rate limit exceeded. Waiting {retry_after} seconds before retry...")
                            time.sleep(retry_after)
                            continue
                        elif response.status_code == 404:
                            # Estimate not found
                            logger.error(f"Estimate {estimate_id} not found")
                            return None

                        # Other error, raise exception
                        logger.error(f"Failed to get estimate: {response.status_code} - {response.text}")
                        raise Exception(f"Failed to get estimate: {response.status_code} - {response.text}")
                except requests.RequestException as e:
                    if attempt < max_attempts:
                        logger.warning(f"Network error: {str(e)}. Retrying in 5 seconds...")
                        time.sleep(5)
                        continue
                    else:
                        logger.error(f"Network error after {max_attempts} attempts: {str(e)}")
                        raise

            # If we get here, all attempts failed
            raise Exception(f"Failed to get estimate after {max_attempts} attempts")
        except Exception as e:
            logger.error(f"Error getting estimate: {str(e)}")
            raise
