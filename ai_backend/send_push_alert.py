import os
import requests
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("EXPO_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("EXPO_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Supabase credentials not found in .env file")
    exit(1)

# Initialize Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def send_push_notification(tokens, title, body):
    url = "https://exp.host/--/api/v2/push/send"
    
    messages = []
    for token in tokens:
        messages.append({
            "to": token,
            "sound": "default",
            "title": title,
            "body": body,
            "data": {"someData": "goes here"},
            "badge": 1
        })
        
    headers = {
        "Accept": "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
    }
    
    response = requests.post(url, headers=headers, json=messages)
    print("Expo API Response:", response.status_code, response.json())

def main():
    print("Fetching push tokens from Supabase...")
    # Fetch all tokens
    response = supabase.table("push_tokens").select("token").execute()
    
    tokens = [row["token"] for row in response.data]
    
    if not tokens:
        print("No push tokens found in database. Make sure you open the app on a physical phone first!")
        return
        
    print(f"Found {len(tokens)} tokens. Sending alert...")
    
    title = "🚨 Severe Weather Alert"
    body = "Critical risk detected in Colombo. Heavy rain and localized flooding expected."
    
    send_push_notification(tokens, title, body)
    print("✅ Push notification broadcast sent!")

if __name__ == "__main__":
    main()
