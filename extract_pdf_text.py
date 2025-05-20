import pdfplumber
import io
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from config import FOLDER_ID, SERVICE_ACCOUNT_FILE

# === AUTHENTICATE WITH GOOGLE DRIVE ===
creds = service_account.Credentials.from_service_account_file(
    SERVICE_ACCOUNT_FILE,
    scopes=['https://www.googleapis.com/auth/drive']
)
service = build('drive', 'v3', credentials=creds)

# === GET MOST RECENT PDF FILE ===
results = service.files().list(
    q=f"'{FOLDER_ID}' in parents and mimeType='application/pdf'",
    orderBy="createdTime desc",
    pageSize=1,
    fields="files(id, name)").execute()
files = results.get('files', [])

if not files:
    print("No PDF files found.")
    exit()

file = files[0]
print(f"Found file: {file['name']}")

# === DOWNLOAD FILE ===
request = service.files().get_media(fileId=file['id'])
fh = io.BytesIO()
downloader = MediaIoBaseDownload(fh, request)
done = False
while not done:
    status, done = downloader.next_chunk()
fh.seek(0)

# === EXTRACT TEXT FROM PDF ===
with pdfplumber.open(fh) as pdf:
    text = '\n'.join([page.extract_text() for page in pdf.pages])

print("=== PDF RAW TEXT ===")
print(text)
