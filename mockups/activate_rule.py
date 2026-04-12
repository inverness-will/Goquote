import requests

url = "https://ecosystem-1000.us6.alta.avigilon.com/api/v1/public/ruleActivation/c7dd9367-0a59-4765-8cfe-84848fa09c4f"
headers = {
    "Authorization": "Bearer p43zMmPtInV3VC4l9QU1nJa2",
    "Content-Type": "application/json",
}
payload = {"action": "activate"}

resp = requests.post(url, headers=headers, json=payload)
print(f"Status: {resp.status_code}")
print(resp.text)
