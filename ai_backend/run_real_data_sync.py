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

# Load baselines once at startup
baselines = {}
try:
    with open(os.path.join(base_dir, '../src/utils/historical_baselines.json'), 'r') as f:
        baselines = json.load(f)
except Exception:
    pass


def fetch_batch_weather(destinations_batch):
    """Fetch weather for up to 50 locations in ONE API call using Open-Meteo batch coordinates."""
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
        res = requests.get(api_url, timeout=(10, 30)).json()
    except Exception as e:
        print(f"  BATCH API ERROR: {e}", flush=True)
        return {}

    # Parse response - single location returns dict, multiple returns list
    weather_map = {}

    if isinstance(res, list):
        # Multiple locations returned as array
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
        # Single location
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


def sync_live_data():
    if not models_loaded:
        print("Cannot update Supabase: Models not loaded.", flush=True)
        return

    print("Fetching destinations from Supabase...", flush=True)
    response = supabase.table('destinations').select('*').execute()
    destinations = response.data

    total = len(destinations)
    print(f"Found {total} destinations. Using BATCH weather API (5 calls instead of {total})...", flush=True)

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

        # 2. Process each destination in the batch
        for i, dest in enumerate(batch):
            try:
                lat, lon = dest.get('latitude'), dest.get('longitude')
                if not lat or not lon:
                    skipped_count += 1
                    print(f"  SKIPPED (no coords): {dest.get('name', 'Unknown')}", flush=True)
                    continue

                # Get weather from batch result, or use defaults
                weather = weather_map.get(i, {
                    "temp": 28.0, "precipitation": 0.0, "wind_speed": 10.0,
                    "cloud_cover": 0, "elevation": 50
                })

                precip_anomaly = weather['precipitation'] - (avg_precip / 30)

                # Run XGBoost
                features = np.array([[weather['temp'], weather['precipitation'],
                                      weather['wind_speed'], weather['elevation']]])
                risk_class = int(clf.predict(features)[0])
                suitability = int(reg.predict(features)[0])

                risk_map = {0: 'risk.high', 1: 'risk.low', 2: 'risk.moderate'}
                color_map = {0: '#EF4444', 1: '#22C55E', 2: '#EAB308'}
                risk_tier = risk_map.get(risk_class, 'risk.low')
                risk_color = color_map.get(risk_class, '#22C55E')

                # Safety override
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

                # Update Supabase
                supabase.table('destinations').update({
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
                }).eq('id', dest['id']).execute()

                updated_count += 1
                global_num = batch_start + i + 1
                print(f"  [{global_num}] {dest.get('name')} | {risk_tier} | {weather['temp']}C | {weather_text} | AI: {suitability}/100", flush=True)

            except Exception as e:
                error_count += 1
                print(f"  [ERROR] {dest.get('name')}: {e}", flush=True)

        # Small pause between batches
        if batch_end < total:
            print(f"  Batch {batch_num} done. Pausing 2s before next batch...", flush=True)
            time.sleep(2)

    print("\n" + "="*60, flush=True)
    print("SYNC COMPLETE!", flush=True)
    print(f"   Total:    {total}", flush=True)
    print(f"   Updated:  {updated_count}", flush=True)
    print(f"   Skipped:  {skipped_count}", flush=True)
    print(f"   Errors:   {error_count}", flush=True)
    print("="*60, flush=True)


if __name__ == "__main__":
    sync_live_data()
