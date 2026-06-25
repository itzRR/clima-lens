import os
import requests
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Support both naming conventions (local .env uses EXPO_PUBLIC_*, GitHub Secrets use plain names)
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("EXPO_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("EXPO_PUBLIC_SUPABASE_ANON_KEY")
TELEGRAM_TOKEN = os.getenv("EXPO_PUBLIC_TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("EXPO_PUBLIC_TELEGRAM_CHAT_ID")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Supabase credentials not found in environment")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def send_telegram_alert(message: str):
    """Send a status alert to the Admin Telegram Bot."""
    if not TELEGRAM_TOKEN or not TELEGRAM_CHAT_ID: return
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
        requests.post(url, json={"chat_id": TELEGRAM_CHAT_ID, "text": message, "parse_mode": "HTML"}, timeout=10)
    except Exception as e:
        print(f"Telegram alert failed: {e}")

# Simple mapping of districts to coordinates
DISTRICT_COORDS = {
    "Colombo": (6.9271, 79.8612),
    "Kandy": (7.2906, 80.6337),
    "Galle": (6.0367, 80.2170),
    "Nuwara Eliya": (6.9497, 80.7829),
    "Jaffna": (9.6615, 80.0255),
    "Trincomalee": (8.5811, 81.2330),
    "Batticaloa": (7.7102, 81.6924),
    "Anuradhapura": (8.3114, 80.4037),
    "Ratnapura": (6.7056, 80.3847),
    "Badulla": (6.9819, 81.0558)
}

def get_weather(lat, lon):
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,precipitation,weather_code"
    try:
        res = requests.get(url, timeout=10).json()
        temp = res.get('current', {}).get('temperature_2m', 28)
        code = res.get('current', {}).get('weather_code', 0)
        
        # Simple weather description mapping (WMO code)
        if code in [0]: desc = "Sunny"
        elif code in [1, 2, 3]: desc = "Cloudy"
        elif code in [45, 48]: desc = "Foggy"
        elif code in [51, 53, 55, 61, 63, 65, 80, 81, 82]: desc = "Rainy"
        elif code in [71, 73, 75, 85, 86]: desc = "Snow"
        elif code in [95, 96, 99]: desc = "Thunderstorm"
        else: desc = "Clear"
        
        return temp, desc
    except Exception as e:
        print(f"Weather API Error: {e}")
        return 28, "Sunny"

def send_push_notification(tokens, title, body):
    if not tokens: return
    url = "https://exp.host/--/api/v2/push/send"
    messages = [{"to": t, "sound": "default", "title": title, "body": body} for t in tokens]
    try:
        requests.post(url, headers={"Content-Type": "application/json"}, json=messages)
    except Exception as e:
        print(f"Push Error: {e}")

def main():
    print("Fetching push tokens...")
    response = supabase.table("push_tokens").select("token, home_district").execute()
    users = response.data
    
    if not users:
        print("No users found with push tokens.")
        send_telegram_alert("📭 <b>Daily Weather:</b> No users with push tokens found. Skipping.")
        return

    # Group tokens by district to minimize API calls
    districts = {}
    for user in users:
        dist = user.get("home_district") or "Colombo"
        if dist not in districts:
            districts[dist] = []
        districts[dist].append(user["token"])
        
    total_sent = 0
    for district, tokens in districts.items():
        coords = DISTRICT_COORDS.get(district, DISTRICT_COORDS["Colombo"])
        temp, desc = get_weather(coords[0], coords[1])
        
        # Emoji logic
        emoji = "☀️"
        if "Rain" in desc: emoji = "🌧️"
        elif "Cloud" in desc: emoji = "☁️"
        elif "Thunder" in desc: emoji = "⛈️"
        
        title = f"{emoji} Good Morning, {district}!"
        body = f"Today's forecast: {desc} with a temperature of {temp}°C."
        
        print(f"Sending to {len(tokens)} users in {district}...")
        send_push_notification(tokens, title, body)
        total_sent += len(tokens)
        
    print(f"✅ Daily weather notifications sent to {total_sent} users!")
    send_telegram_alert(f"☀️ <b>Daily Weather Push Sent!</b>\n\nDelivered morning forecasts to <b>{total_sent}</b> users across <b>{len(districts)}</b> districts.")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"FATAL ERROR: {e}")
        send_telegram_alert(f"⚠️ <b>Daily Weather Push Failed!</b>\n\n<pre>{e}</pre>")
        exit(1)
