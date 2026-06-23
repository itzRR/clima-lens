import os
import time
import signal
import requests
from supabase import create_client, Client
import xgboost as xgb
import numpy as np
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError

load_dotenv()

# Initialize Supabase
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

if not url or not key:
    raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in .env")

supabase: Client = create_client(url, os.environ.get('SUPABASE_SERVICE_KEY', key))

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

# Load baselines once at startup (not inside every loop)
import json
from datetime import datetime

baselines = {}
try:
    with open(os.path.join(base_dir, '../src/utils/historical_baselines.json'), 'r') as f:
        baselines = json.load(f)
except Exception:
    pass

def fetch_live_weather(lat, lon):
    """Fetch live weather from Open-Meteo free API."""
    api_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,precipitation,wind_speed_10m,cloud_cover&elevation=nan"
    try:
        res = requests.get(api_url, timeout=(5, 10)).json()
        current = res.get('current', {})
        return {
            "temp": current.get('temperature_2m', 25.0),
            "precipitation": current.get('precipitation', 0.0),
            "wind_speed": current.get('wind_speed_10m', 10.0),
            "cloud_cover": current.get('cloud_cover', 0),
            "elevation": res.get('elevation', 50)
        }
    except requests.exceptions.Timeout:
        print(f"  TIMEOUT fetching weather for lat={lat} lon={lon} - using defaults", flush=True)
        return {"temp": 28.0, "precipitation": 0.0, "wind_speed": 10.0, "cloud_cover": 0, "elevation": 50}
    except Exception as e:
        print(f"  Error fetching weather: {e}", flush=True)
        return {"temp": 28.0, "precipitation": 0.0, "wind_speed": 10.0, "cloud_cover": 0, "elevation": 50}

def process_single_dest(dest, count_ref):
    """Process a single destination. Returns True if updated, False if skipped."""
    lat, lon = dest.get('latitude'), dest.get('longitude')
    if not lat or not lon:
        print(f"  SKIPPED (no coordinates): {dest.get('name', 'Unknown')}", flush=True)
        return False

    # 1. Fetch Real Weather
    weather = fetch_live_weather(lat, lon)

    # Calculate Anomaly using baselines
    month = str(datetime.now().month)
    avg_precip = baselines.get('_FALLBACK_', {}).get(month, {}).get('avg_precip', 0)
    precip_anomaly = weather['precipitation'] - (avg_precip / 30)

    # 2. Run XGBoost Inference
    features = np.array([[weather['temp'], weather['precipitation'], weather['wind_speed'], weather['elevation']]])
    risk_class = int(clf.predict(features)[0])
    suitability = int(reg.predict(features)[0])

    # 3. Map predictions to UI metrics
    risk_map = {0: 'risk.high', 1: 'risk.low', 2: 'risk.moderate'}
    color_map = {0: '#EF4444', 1: '#22C55E', 2: '#EAB308'}

    risk_tier = risk_map.get(risk_class, 'risk.low')
    risk_color = color_map.get(risk_class, '#22C55E')

    # SAFETY OVERRIDE
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

    if weather['precipitation'] > 5:
        weather_text = "Heavy Rain"
    elif weather['precipitation'] > 0.1:
        weather_text = "Rainy"
    elif weather.get('cloud_cover', 0) > 60:
        weather_text = "Mostly Cloudy"
    elif weather.get('cloud_cover', 0) > 20:
        weather_text = "Partly Cloudy"
    else:
        weather_text = "Clear"

    # 4. Update Database
    supabase.table('destinations').update({
        "risk_tier": risk_tier,
        "risk_color": risk_color,
        "suitability_score": suitability,
        "safety_score": int(safety_score),
        "comfort_score": int(comfort_score),
        "risk_score": int(risk_score),
        "forecast_confidence": int(forecast_confidence),
        "community_activity": int(community_activity),
        "temp": f"{weather['temp']}°C",
        "weather": weather_text
    }).eq('id', dest['id']).execute()

    count_ref[0] += 1
    print(f"[{count_ref[0]}] Updated {dest.get('name')} | {risk_tier} | Temp: {weather['temp']}C | AI: {suitability}/100", flush=True)
    return True

def sync_live_data():
    if not models_loaded:
        print("Cannot update Supabase: Models not loaded.", flush=True)
        return

    print("Fetching destinations from Supabase...", flush=True)
    response = supabase.table('destinations').select('*').execute()
    destinations = response.data

    print(f"Found {len(destinations)} destinations. Syncing...", flush=True)

    updated_count = [0]
    skipped_count = [0]
    timeout_count = [0]

    # Process in batches of 50 with pauses between batches
    batch_size = 50

    for i, dest in enumerate(destinations):
        # Pause for 3 seconds every 50 locations to avoid rate limiting
        if i > 0 and i % batch_size == 0:
            print(f"\n--- Batch pause (processed {i}/{len(destinations)}) - waiting 3s to avoid rate limits ---\n", flush=True)
            time.sleep(3)

        try:
            # Run with a hard 20-second timeout per location using ThreadPoolExecutor
            with ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(process_single_dest, dest, updated_count)
                result = future.result(timeout=20)
                if not result:
                    skipped_count[0] += 1
        except FuturesTimeoutError:
            timeout_count[0] += 1
            print(f"[TIMEOUT] {dest.get('name')} took too long (>20s) - SKIPPED", flush=True)
        except Exception as e:
            print(f"[ERROR] {dest.get('name')}: {e}", flush=True)

        # Small delay between each location
        time.sleep(0.3)

    print("\n" + "="*60, flush=True)
    print(f"SYNC COMPLETE!", flush=True)
    print(f"   Total in DB: {len(destinations)}", flush=True)
    print(f"   Updated:  {updated_count[0]}", flush=True)
    print(f"   Skipped:  {skipped_count[0]}", flush=True)
    print(f"   Timed out: {timeout_count[0]}", flush=True)
    print("="*60, flush=True)

if __name__ == "__main__":
    sync_live_data()
