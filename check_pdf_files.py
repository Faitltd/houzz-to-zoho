import os
from google.oauth2 import service_account
from googleapiclient.discovery import build

# === CONFIGURATION ===
FOLDER_ID = '1QSBWTovcI5NJz9oHrzf9-nKrqcfSrt1Y'
SERVICE_ACCOUNT_FILE = 'service_account.json'

# === AUTHENTICATE WITH GOOGLE DRIVE ===
creds = service_account.Credentials.from_service_account_file(
    SERVICE_ACCOUNT_FILE,
    scopes=['https://www.googleapis.com/auth/drive']
)
service = build('drive', 'v3', credentials=creds)

# === GET ALL FILES IN THE FOLDER ===
results = service.files().list(
    q=f"'{FOLDER_ID}' in parents",
    orderBy="createdTime desc",
    pageSize=10,
    fields="files(id, name, mimeType, createdTime)"
).execute()

files = results.get('files', [])

if not files:
    print("No files found in the folder.")
    exit()

print(f"Found {len(files)} files in the folder:")
for file in files:
    print(f"Name: {file['name']}, Type: {file['mimeType']}, Created: {file['createdTime']}")

# === CHECK FOR PDF FILES ===
pdf_files = [file for file in files if file['mimeType'] == 'application/pdf']
if pdf_files:
    print(f"\nFound {len(pdf_files)} PDF files:")
    for pdf in pdf_files:
        print(f"Name: {pdf['name']}, ID: {pdf['id']}, Created: {pdf['createdTime']}")
else:
    print("\nNo PDF files found in the folder.")
