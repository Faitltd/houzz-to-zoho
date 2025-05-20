import requests

# === ZOHO CONFIG ===
access_token = '336885f0b0dd1d9f62e2807d495f0bd42f25d31479'
org_id = '846437691'

# === TEST API ACCESS ===
url = "https://books.zoho.com/api/v3/organizations"
headers = {
    "Authorization": f"Zoho-oauthtoken {access_token}"
}
params = {
    "organization_id": org_id
}

response = requests.get(url, headers=headers, params=params)

print("=== Zoho Response ===")
print(f"Status Code: {response.status_code}")
print(response.text)
