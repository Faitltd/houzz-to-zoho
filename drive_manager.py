import io
import pandas as pd
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from config import (
    FOLDER_ID, SERVICE_ACCOUNT_FILE,
    SUPPORTED_EXCEL_MIME_TYPES, SUPPORTED_PDF_MIME_TYPES,
    EXCEL_HEADER_ROW, PROCESSED_FOLDER_ID
)
from logger import logger

class DriveManager:
    """Manages interactions with Google Drive."""

    def __init__(self):
        self.folder_id = FOLDER_ID
        self.service_account_file = SERVICE_ACCOUNT_FILE
        self.service = self._authenticate()

    def _authenticate(self):
        """Authenticate with Google Drive API."""
        try:
            creds = service_account.Credentials.from_service_account_file(
                self.service_account_file,
                scopes=['https://www.googleapis.com/auth/drive']
            )
            service = build('drive', 'v3', credentials=creds)
            logger.info("Successfully authenticated with Google Drive")
            return service
        except Exception as e:
            logger.error(f"Failed to authenticate with Google Drive: {str(e)}")
            raise

    def list_files(self, mime_types=None, order_by="createdTime desc", page_size=10):
        """List files in the configured folder, optionally filtered by MIME type."""
        try:
            # Build the query
            query = f"'{self.folder_id}' in parents"
            if mime_types:
                mime_type_conditions = " or ".join([f"mimeType='{mime_type}'" for mime_type in mime_types])
                query += f" and ({mime_type_conditions})"

            # Execute the query
            results = self.service.files().list(
                q=query,
                orderBy=order_by,
                pageSize=page_size,
                fields="files(id, name, mimeType, createdTime)"
            ).execute()

            files = results.get('files', [])
            logger.info(f"Found {len(files)} files in folder {self.folder_id}")
            return files
        except Exception as e:
            logger.error(f"Failed to list files: {str(e)}")
            raise

    def get_latest_excel_file(self):
        """Get the most recent Excel file from the folder."""
        files = self.list_files(mime_types=SUPPORTED_EXCEL_MIME_TYPES, page_size=1)
        if not files:
            logger.warning("No Excel files found in the folder")
            return None

        latest_file = files[0]
        logger.info(f"Found latest Excel file: {latest_file['name']}")
        return latest_file

    def get_latest_pdf_file(self):
        """Get the most recent PDF file from the folder."""
        files = self.list_files(mime_types=SUPPORTED_PDF_MIME_TYPES, page_size=1)
        if not files:
            logger.warning("No PDF files found in the folder")
            return None

        latest_file = files[0]
        logger.info(f"Found latest PDF file: {latest_file['name']}")
        return latest_file

    def download_file(self, file_id):
        """Download a file from Google Drive by its ID."""
        try:
            request = self.service.files().get_media(fileId=file_id)
            file_content = io.BytesIO()
            downloader = MediaIoBaseDownload(file_content, request)

            done = False
            while not done:
                status, done = downloader.next_chunk()
                logger.debug(f"Download progress: {int(status.progress() * 100)}%")

            file_content.seek(0)
            logger.info(f"Successfully downloaded file with ID {file_id}")
            return file_content
        except Exception as e:
            logger.error(f"Failed to download file {file_id}: {str(e)}")
            raise

    def read_excel_to_dataframe(self, file_id):
        """Download an Excel file and read it into a pandas DataFrame."""
        try:
            file_content = self.download_file(file_id)
            df = pd.read_excel(file_content, engine='openpyxl', header=EXCEL_HEADER_ROW)
            logger.info(f"Successfully read Excel file {file_id} into DataFrame")
            return df
        except Exception as e:
            logger.error(f"Failed to read Excel file {file_id} into DataFrame: {str(e)}")
            raise

    def create_processed_folder_if_not_exists(self):
        """Create a 'Processed' folder if it doesn't exist."""
        try:
            # Check if the processed folder already exists
            query = f"name='processed' and '{self.folder_id}' in parents and mimeType='application/vnd.google-apps.folder'"
            results = self.service.files().list(q=query, fields="files(id, name)").execute()
            folders = results.get('files', [])

            if folders:
                # Folder already exists
                processed_folder_id = folders[0]['id']
                logger.info(f"Found existing 'processed' folder with ID {processed_folder_id}")
                return processed_folder_id
            else:
                # Create the folder
                folder_metadata = {
                    'name': 'processed',
                    'mimeType': 'application/vnd.google-apps.folder',
                    'parents': [self.folder_id]
                }
                folder = self.service.files().create(body=folder_metadata, fields='id').execute()
                processed_folder_id = folder.get('id')
                logger.info(f"Created new 'processed' folder with ID {processed_folder_id}")
                return processed_folder_id
        except Exception as e:
            logger.error(f"Failed to create 'processed' folder: {str(e)}")
            raise

    def move_file_to_processed(self, file_id, file_name):
        """Move a file to the 'Processed' folder."""
        try:
            # Get or create the processed folder
            processed_folder_id = self.create_processed_folder_if_not_exists()

            # Move the file to the processed folder
            file = self.service.files().get(fileId=file_id, fields='parents').execute()
            previous_parents = ",".join(file.get('parents'))

            # Move the file to the new folder
            file = self.service.files().update(
                fileId=file_id,
                addParents=processed_folder_id,
                removeParents=previous_parents,
                fields='id, parents'
            ).execute()

            logger.info(f"Moved file '{file_name}' to 'processed' folder")
            return True
        except Exception as e:
            logger.error(f"Failed to move file '{file_name}' to 'processed' folder: {str(e)}")
            return False
