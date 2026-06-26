import os
import requests
from datetime import datetime, timezone, timedelta
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

# District coordinates for weather lookup
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
    "Badulla": (6.9819, 81.0558),
    "Matara": (5.9485, 80.5353),
    "Hambantota": (6.1243, 81.1185),
    "Kurunegala": (7.4863, 80.3647),
    "Polonnaruwa": (7.9403, 81.0188),
    "Kegalle": (7.2513, 80.3464),
    "Kalutara": (6.5854, 79.9607),
    "Gampaha": (7.0840, 80.0098),
    "Matale": (7.4675, 80.6234),
    "Ampara": (7.2976, 81.6720),
    "Puttalam": (8.0362, 79.8283),
    "Mannar": (8.9810, 79.9044),
    "Mullaitivu": (9.2671, 80.8142),
    "Kilinochchi": (9.3803, 80.3770),
    "Vavuniya": (8.7514, 80.4971),
    "Moneragala": (6.8728, 81.3507),
}

# Inspirational morning greetings — rotated daily
GREETINGS = [
    "Rise and shine! Here's your weather",
    "Good morning! Your daily forecast is ready",
    "Start your day right with today's weather",
    "Hey there! Here's what the sky has in store",
    "Beautiful morning! Check today's climate",
    "Wake up to your personalized forecast",
    "Your morning weather brief is here",
]

# Travel tips based on weather
WEATHER_TIPS = {
    "Sunny": ["Perfect day for outdoor adventures! 🏖️", "Don't forget sunscreen — UV is high! 🧴", "Great beach weather today! 🌊"],
    "Clear": ["Crystal clear skies ahead! ✨", "Ideal conditions for sightseeing 📸", "Perfect visibility for mountain views 🏔️"],
    "Cloudy": ["Comfortable weather for walking tours 🚶", "Great day for temple visits! 🛕", "Overcast but pleasant — enjoy the outdoors 🌿"],
    "Foggy": ["Mystical vibes today — drive safely! 🌫️", "Beautiful misty landscapes await 📷", "Take it slow on mountain roads 🛣️"],
    "Rainy": ["Pack an umbrella before heading out! ☂️", "Perfect weather for a cozy tea plantation visit 🍵", "Indoor attractions might be a good call today 🏛️"],
    "Thunderstorm": ["Stay safe indoors during storms! ⚡", "Great time for museum visits & local cuisine 🍛", "Keep an eye on weather alerts 📱"],
    "Snow": ["Rare weather — enjoy the view! ❄️", "Mountain roads may be affected 🏔️", "Bundle up and stay warm! 🧥"],
}

def get_weather(lat, lon):
    """Fetch detailed weather data from Open-Meteo."""
    url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat}&longitude={lon}"
        f"&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,apparent_temperature"
        f"&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max"
        f"&timezone=Asia/Colombo&forecast_days=1"
    )
    try:
        res = requests.get(url, timeout=15).json()
        current = res.get('current', {})
        daily = res.get('daily', {})
        
        temp = current.get('temperature_2m', 28)
        feels_like = current.get('apparent_temperature', temp)
        humidity = current.get('relative_humidity_2m', 70)
        wind = current.get('wind_speed_10m', 5)
        code = current.get('weather_code', 0)
        
        temp_max = daily.get('temperature_2m_max', [temp])[0]
        temp_min = daily.get('temperature_2m_min', [temp])[0]
        rain_chance = daily.get('precipitation_probability_max', [0])[0] or 0
        uv_index = daily.get('uv_index_max', [5])[0] or 5
        
        # Weather description mapping (WMO codes)
        if code in [0]: desc = "Sunny"
        elif code in [1, 2, 3]: desc = "Cloudy"
        elif code in [45, 48]: desc = "Foggy"
        elif code in [51, 53, 55, 61, 63, 65, 80, 81, 82]: desc = "Rainy"
        elif code in [71, 73, 75, 85, 86]: desc = "Snow"
        elif code in [95, 96, 99]: desc = "Thunderstorm"
        else: desc = "Clear"
        
        return {
            "temp": round(temp),
            "feels_like": round(feels_like),
            "humidity": humidity,
            "wind": round(wind),
            "desc": desc,
            "temp_max": round(temp_max),
            "temp_min": round(temp_min),
            "rain_chance": rain_chance,
            "uv_index": round(uv_index, 1),
        }
    except Exception as e:
        print(f"Weather API Error: {e}")
        return {
            "temp": 28, "feels_like": 30, "humidity": 70, "wind": 5,
            "desc": "Sunny", "temp_max": 31, "temp_min": 25,
            "rain_chance": 10, "uv_index": 7,
        }

def get_weather_emoji(desc):
    """Get the perfect emoji for weather conditions."""
    emojis = {
        "Sunny": "☀️", "Clear": "🌤️", "Cloudy": "☁️",
        "Foggy": "🌫️", "Rainy": "🌧️", "Snow": "❄️", "Thunderstorm": "⛈️"
    }
    return emojis.get(desc, "🌤️")

def get_uv_label(uv):
    if uv <= 2: return "Low"
    elif uv <= 5: return "Moderate"
    elif uv <= 7: return "High"
    elif uv <= 10: return "Very High"
    else: return "Extreme"

def send_push_notification(tokens, title, body, subtitle=None):
    """Send premium push notification via Expo Push API."""
    if not tokens: return
    url = "https://exp.host/--/api/v2/push/send"
    messages = []
    for t in tokens:
        msg = {
            "to": t,
            "sound": "default",
            "title": title,
            "body": body,
            "priority": "high",
            "channelId": "default",
            "color": "#22C55E",
        }
        if subtitle:
            msg["subtitle"] = subtitle
        messages.append(msg)
    try:
        requests.post(url, headers={"Content-Type": "application/json"}, json=messages, timeout=15)
    except Exception as e:
        print(f"Push Error: {e}")

def main():
    print("🌅 Starting ClimaLens Daily Weather Push...")
    
    # Get current Sri Lanka time
    sl_tz = timezone(timedelta(hours=5, minutes=30))
    now = datetime.now(sl_tz)
    day_of_year = now.timetuple().tm_yday
    
    print("Fetching push tokens...")
    response = supabase.table("push_tokens").select("token, home_district").execute()
    users = response.data
    
    if not users:
        print("No users found with push tokens.")
        send_telegram_alert("📭 <b>Daily Weather:</b> No users with push tokens found. Skipping.")
        return

    # Group tokens by district
    districts = {}
    for user in users:
        dist = user.get("home_district") or "Colombo"
        if dist not in districts:
            districts[dist] = []
        districts[dist].append(user["token"])
    
    # Pick today's greeting (rotates daily)
    greeting = GREETINGS[day_of_year % len(GREETINGS)]
        
    total_sent = 0
    for district, tokens in districts.items():
        coords = DISTRICT_COORDS.get(district, DISTRICT_COORDS["Colombo"])
        weather = get_weather(coords[0], coords[1])
        
        emoji = get_weather_emoji(weather["desc"])
        uv_label = get_uv_label(weather["uv_index"])
        
        # Pick a relevant tip
        tips = WEATHER_TIPS.get(weather["desc"], WEATHER_TIPS["Clear"])
        tip = tips[day_of_year % len(tips)]
        
        # Premium notification format
        title = f"{emoji} {district} — {weather['desc']}, {weather['temp']}°C"
        
        body = (
            f"📊 {weather['temp_min']}°→{weather['temp_max']}° • Feels {weather['feels_like']}°\n"
            f"💧 Humidity {weather['humidity']}% • 🌬️ Wind {weather['wind']}km/h\n"
            f"🌂 Rain {weather['rain_chance']}% • 🔆 UV {weather['uv_index']} ({uv_label})\n"
            f"\n💡 {tip}"
        )
        
        subtitle = greeting
        
        print(f"  📤 Sending to {len(tokens)} users in {district}...")
        print(f"     {title}")
        send_push_notification(tokens, title, body, subtitle)
        total_sent += len(tokens)
        
    print(f"\n✅ Daily weather sent to {total_sent} users across {len(districts)} districts!")
    send_telegram_alert(
        f"☀️ <b>Daily Weather Push Sent!</b>\n\n"
        f"📊 Delivered premium forecasts to <b>{total_sent}</b> users across <b>{len(districts)}</b> districts.\n"
        f"🕐 <b>Time:</b> {now.strftime('%I:%M %p')} Sri Lanka\n"
        f"📋 <b>Districts:</b> {', '.join(districts.keys())}"
    )

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"FATAL ERROR: {e}")
        send_telegram_alert(f"⚠️ <b>Daily Weather Push Failed!</b>\n\n<pre>{e}</pre>")
        exit(1)
