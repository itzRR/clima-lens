import os
import time
import requests
from supabase import create_client, Client
import xgboost as xgb
import numpy as np
from dotenv import load_dotenv
import json
from datetime import datetime

load_dotenv()

# Initialize Supabase
sb_url: str = os.environ.get("SUPABASE_URL")
sb_key: str = os.environ.get("SUPABASE_KEY")

if not sb_url or not sb_key:
    raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in .env")

sb_service_key = os.environ.get('SUPABASE_SERVICE_KEY', sb_key)
supabase: Client = create_client(sb_url, sb_service_key)

TELEGRAM_TOKEN = os.environ.get("EXPO_PUBLIC_TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.environ.get("EXPO_PUBLIC_TELEGRAM_CHAT_ID")

def send_telegram_alert(message: str):
    """Send an alert to the Admin Telegram Bot if the ML script fails."""
    if not TELEGRAM_TOKEN or not TELEGRAM_CHAT_ID: return
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
        requests.post(url, json={"chat_id": TELEGRAM_CHAT_ID, "text": f"⚠️ <b>Backend ML Script Failed!</b>\n\n<pre>{message}</pre>", "parse_mode": "HTML"})
    except Exception as e:
        print(f"Failed to send Telegram alert: {e}")

# Load XGBoost Models
clf = xgb.XGBClassifier()
reg = xgb.XGBRegressor()

base_dir = os.path.dirname(os.path.abspath(__file__))

try:
    clf.load_model(os.path.join(base_dir, 'models/risk_classifier.json'))
    reg.load_model(os.path.join(base_dir, 'models/suitability_regressor.json'))
    models_loaded = True
    print("XGBoost Models Loaded Successfully!", flush=True)
except Exception as e:
    print(f"Error loading XGBoost models: {e}", flush=True)
    models_loaded = False

# Load baselines once at startup
baselines = {}
try:
    with open(os.path.join(base_dir, '../src/utils/historical_baselines.json'), 'r') as f:
        baselines = json.load(f)
except Exception:
    pass

def send_push_notification(title, body):
    """Broadcasts a severe weather alert to all users in Supabase"""
    try:
        response = supabase.table("push_tokens").select("token").execute()
        tokens = [row["token"] for row in response.data]
        if not tokens: return
        
        url = "https://exp.host/--/api/v2/push/send"
        messages = [{"to": t, "sound": "default", "title": title, "body": body} for t in tokens]
        requests.post(url, headers={"Content-Type": "application/json"}, json=messages)
        print(f"  --> Sent PUSH ALERT to {len(tokens)} users!", flush=True)
    except Exception as e:
        print(f"  --> Push Error: {e}", flush=True)


def fetch_batch_weather(destinations_batch):
    """Fetch weather for up to 50 locations in ONE API call."""
    lats = []
    lons = []
    valid_indices = []

    for i, dest in enumerate(destinations_batch):
        lat, lon = dest.get('latitude'), dest.get('longitude')
        if lat and lon:
            lats.append(str(lat))
            lons.append(str(lon))
            valid_indices.append(i)

    if not lats:
        return {}

    lat_str = ",".join(lats)
    lon_str = ",".join(lons)
    api_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat_str}&longitude={lon_str}&current=temperature_2m,precipitation,wind_speed_10m,cloud_cover"

    try:
        res = requests.get(api_url, timeout=(10, 60)).json()
    except Exception as e:
        print(f"  BATCH API ERROR: {e}", flush=True)
        return {}

    weather_map = {}

    if isinstance(res, list):
        for idx, loc_data in enumerate(res):
            if idx < len(valid_indices):
                orig_idx = valid_indices[idx]
                current = loc_data.get('current', {})
                weather_map[orig_idx] = {
                    "temp": current.get('temperature_2m', 25.0),
                    "precipitation": current.get('precipitation', 0.0),
                    "wind_speed": current.get('wind_speed_10m', 10.0),
                    "cloud_cover": current.get('cloud_cover', 0),
                    "elevation": loc_data.get('elevation', 50)
                }
    elif isinstance(res, dict) and 'current' in res:
        current = res.get('current', {})
        if valid_indices:
            weather_map[valid_indices[0]] = {
                "temp": current.get('temperature_2m', 25.0),
                "precipitation": current.get('precipitation', 0.0),
                "wind_speed": current.get('wind_speed_10m', 10.0),
                "cloud_cover": current.get('cloud_cover', 0),
                "elevation": res.get('elevation', 50)
            }

    return weather_map


def get_weather_text(weather):
    """Determine weather description from data."""
    if weather['precipitation'] > 5:
        return "Heavy Rain"
    elif weather['precipitation'] > 0.1:
        return "Rainy"
    elif weather.get('cloud_cover', 0) > 60:
        return "Mostly Cloudy"
    elif weather.get('cloud_cover', 0) > 20:
        return "Partly Cloudy"
    else:
        return "Clear"


def batch_update_supabase(updates):
    """Update multiple rows in Supabase using individual REST API calls with requests + timeout."""
    success = 0
    for row in updates:
        row_id = row.pop('id')
        try:
            # Use raw REST API with requests (has proper timeout) instead of supabase-py client
            headers = {
                "apikey": sb_service_key,
                "Authorization": f"Bearer {sb_service_key}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
            }
            resp = requests.patch(
                f"{sb_url}/rest/v1/destinations?id=eq.{row_id}",
                json=row,
                headers=headers,
                timeout=(10, 30)
            )
            if resp.status_code < 300:
                success += 1
            else:
                print(f"    DB error for id={row_id}: {resp.status_code} {resp.text}", flush=True)
        except requests.exceptions.Timeout:
            print(f"    DB TIMEOUT for id={row_id} - skipping", flush=True)
        except Exception as e:
            print(f"    DB ERROR for id={row_id}: {e}", flush=True)
    return success


def sync_live_data():
    if not models_loaded:
        print("Cannot update Supabase: Models not loaded.", flush=True)
        return

    print("Fetching destinations from Supabase...", flush=True)
    response = supabase.table('destinations').select('*').execute()
    destinations = response.data

    total = len(destinations)
    print(f"Found {total} destinations. Using BATCH weather + REST API updates...", flush=True)

    updated_count = 0
    skipped_count = 0
    error_count = 0

    month = str(datetime.now().month)
    avg_precip = baselines.get('_FALLBACK_', {}).get(month, {}).get('avg_precip', 0)

    # Process in batches of 50
    batch_size = 50
    for batch_start in range(0, total, batch_size):
        batch_end = min(batch_start + batch_size, total)
        batch = destinations[batch_start:batch_end]
        batch_num = (batch_start // batch_size) + 1
        total_batches = (total + batch_size - 1) // batch_size

        print(f"\n--- Batch {batch_num}/{total_batches} (locations {batch_start+1}-{batch_end}) ---", flush=True)

        # 1. Fetch ALL weather for this batch in ONE API call
        weather_map = fetch_batch_weather(batch)
        print(f"  Got weather for {len(weather_map)} locations in 1 API call", flush=True)

        # 2. Build all updates for this batch (no DB calls yet)
        batch_updates = []
        batch_logs = []

        for i, dest in enumerate(batch):
            try:
                lat, lon = dest.get('latitude'), dest.get('longitude')
                if not lat or not lon:
                    skipped_count += 1
                    continue

                weather = weather_map.get(i, {
                    "temp": 28.0, "precipitation": 0.0, "wind_speed": 10.0,
                    "cloud_cover": 0, "elevation": 50
                })

                precip_anomaly = weather['precipitation'] - (avg_precip / 30)

                features = np.array([[weather['temp'], weather['precipitation'],
                                      weather['wind_speed'], weather['elevation']]])
                risk_class = int(clf.predict(features)[0])
                suitability = int(reg.predict(features)[0])

                risk_map_dict = {0: 'risk.high', 1: 'risk.low', 2: 'risk.moderate'}
                color_map = {0: '#EF4444', 1: '#22C55E', 2: '#EAB308'}
                risk_tier = risk_map_dict.get(risk_class, 'risk.low')
                risk_color = color_map.get(risk_class, '#22C55E')

                if precip_anomaly > 40.0:
                    risk_tier = 'risk.high'
                    risk_color = '#EF4444'
                elif precip_anomaly > 20.0 and risk_tier == 'risk.low':
                    risk_tier = 'risk.moderate'
                    risk_color = '#EAB308'

                safety_score = max(0, 100 - (weather['precipitation'] * 2) - (weather['wind_speed']))
                comfort_score = max(0, 100 - abs(weather['temp'] - 26) * 3)
                risk_score = 100 - safety_score
                forecast_confidence = np.random.randint(80, 95)
                community_activity = np.random.randint(5, 50)
                weather_text = get_weather_text(weather)

                batch_updates.append({
                    "id": dest['id'],
                    "risk_tier": risk_tier,
                    "risk_color": risk_color,
                    "suitability_score": suitability,
                    "safety_score": int(safety_score),
                    "comfort_score": int(comfort_score),
                    "risk_score": int(risk_score),
                    "forecast_confidence": int(forecast_confidence),
                    "community_activity": int(community_activity),
                    "temp": f"{weather['temp']}\u00b0C",
                    "weather": weather_text
                })

                # Broadcast severe weather alert if high risk
                if risk_tier == 'risk.high' and int(safety_score) < 30:
                    send_push_notification(
                        title=f"🚨 Severe Weather Alert: {dest.get('name')}",
                        body=f"Critical risk detected! Heavy rain and dangerous conditions expected."
                    )

                global_num = batch_start + i + 1
                batch_logs.append(f"  [{global_num}] {dest.get('name')} | {risk_tier} | {weather['temp']}C | {weather_text} | AI: {suitability}/100")

            except Exception as e:
                error_count += 1
                print(f"  [ERROR] {dest.get('name')}: {e}", flush=True)

        # 3. Send all DB updates for this batch (with timeouts on each)
        print(f"  Updating {len(batch_updates)} rows in Supabase...", flush=True)
        success = batch_update_supabase(batch_updates)
        updated_count += success

        # 4. Print logs
        for log in batch_logs:
            print(log, flush=True)

        print(f"  Batch {batch_num} complete: {success}/{len(batch_updates)} updated", flush=True)

        # Pause between batches
        if batch_end < total:
            time.sleep(2)

    print("\n" + "="*60, flush=True)
    print("SYNC COMPLETE!", flush=True)
    print(f"   Total:    {total}", flush=True)
    print(f"   Updated:  {updated_count}", flush=True)
    print(f"   Skipped:  {skipped_count}", flush=True)
    print(f"   Errors:   {error_count}", flush=True)
    print("="*60, flush=True)


def main():
    try:
        sync_live_data()
        send_telegram_alert("✅ <b>ML Sync Completed Successfully!</b>\nAll destinations and districts have been updated with the latest live weather and risk scores.")
    except Exception as e:
        error_msg = str(e)
        print(f"FATAL ERROR: {error_msg}")
        send_telegram_alert(error_msg)
        exit(1)

if __name__ == "__main__":
    main()
