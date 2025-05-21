# === GOOGLE DRIVE CONFIGURATION ===
FOLDER_ID = '1QSBWTovcI5NJz9oHrzf9-nKrqcfSrt1Y'
PROCESSED_FOLDER_ID = '1QSBWTovcI5NJz9oHrzf9-nKrqcfSrt1Y/processed'  # Subfolder for processed files
SERVICE_ACCOUNT_FILE = 'service_account.json'

# === ZOHO CONFIGURATION ===
# Zoho API credentials
CLIENT_ID = '1000.V62XITF7A5T1PPQEADQVTFIIU33CLL'
CLIENT_SECRET = '336885f0b0dd1d9f62e2807d495f0bd42f25d31479'
REDIRECT_URI = 'https://www.zoho.com/books'

# Zoho Books configuration
ORGANIZATION_ID = '862183465'
CUSTOMER_ID = '5547048000000150663'

# Token storage and security
TOKEN_FILE = 'zoho_token.json'
TOKEN_ENCRYPTION_KEY = 'houzz_to_zoho_secret_key'  # Used to encrypt/decrypt the token file

# === LOGGING CONFIGURATION ===
LOG_FILE = 'sync_estimates.log'
LOG_LEVEL = 'INFO'  # Options: DEBUG, INFO, WARNING, ERROR, CRITICAL

# === APPLICATION CONFIGURATION ===
# File types to process
SUPPORTED_EXCEL_MIME_TYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  # .xlsx
    'application/vnd.ms-excel'  # .xls
]
SUPPORTED_PDF_MIME_TYPES = [
    'application/pdf'  # .pdf
]

# Excel parsing configuration
EXCEL_HEADER_ROW = 1  # 0-based index, so this is the second row

# API endpoints
ZOHO_TOKEN_URL = 'https://accounts.zoho.com/oauth/v2/token'
ZOHO_ESTIMATES_URL = 'https://books.zoho.com/api/v3/estimates'
ZOHO_ATTACHMENTS_URL = 'https://books.zoho.com/api/v3/estimates/{estimate_id}/attachment'

# API retry configuration
MAX_RETRIES = 3  # Maximum number of retries for API calls
RETRY_BACKOFF_FACTOR = 0.5  # Backoff factor for retries (0.5 means 0.5, 1, 2 seconds between retries)
RETRY_STATUS_FORCELIST = [429, 500, 502, 503, 504]  # HTTP status codes to retry on

# Email notification configuration
ENABLE_EMAIL_NOTIFICATIONS = False  # Set to True to enable email notifications
SMTP_SERVER = 'smtp.gmail.com'  # SMTP server for sending emails
SMTP_PORT = 465  # SMTP port (465 for SSL, 587 for TLS)
SMTP_USERNAME = 'your-email@gmail.com'  # SMTP username
SMTP_PASSWORD = 'your-app-password'  # SMTP password (use app password for Gmail)
NOTIFICATION_EMAIL_FROM = 'your-email@gmail.com'  # From email address
NOTIFICATION_EMAIL_TO = 'recipient@example.com'  # To email address
