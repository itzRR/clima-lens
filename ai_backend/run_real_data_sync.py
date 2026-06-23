import os
import requests
from supabase import create_client, Client
import xgboost as xgb
import numpy as np
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor

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
    print("XGBoost Models Loaded Successfully!")
except Exception as e:
    print(f"Error loading XGBoost models: {e}")
    models_loaded = False

def fetch_live_weather(lat, lon):
    """Fetch live weather from Open-Meteo free API."""
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,precipitation,wind_speed_10m&elevation=nan"
    try:
        res = requests.get(url, timeout=10).json()
        current = res.get('current', {})
        return {
            "temp": current.get('temperature_2m', 25.0),
            "precipitation": current.get('precipitation', 0.0),
            "wind_speed": current.get('wind_speed_10m', 10.0),
            "elevation": res.get('elevation', 50)
        }
    except Exception as e:
        print(f"Error fetching weather: {e}")
        return {"temp": 28.0, "precipitation": 0.0, "wind_speed": 10.0, "elevation": 50}

def sync_live_data():
    if not models_loaded:
        print("Cannot update Supabase: Models not loaded.")
        return

    print("Fetching destinations from Supabase...")
    response = supabase.table('destinations').select('*').execute()
    destinations = response.data
    
    print(f"Found {len(destinations)} destinations. Syncing Live Open-Meteo Data & Running AI...")
    
    updated_count = [0]
    skipped_count = [0]
    skipped_names = []
    
    def process_dest(dest):
        try:
            lat, lon = dest.get('latitude'), dest.get('longitude')
            if not lat or not lon:
                skipped_count[0] += 1
                skipped_names.append(dest.get('name', 'Unknown'))
                print(f"SKIPPED (no coordinates): {dest.get('name', 'Unknown')}")
                return
                
            # 1. Fetch Real Weather
            weather = fetch_live_weather(lat, lon)
            
            # Calculate Anomaly using baselines
            import json
            from datetime import datetime
            try:
                with open(os.path.join(base_dir, '../src/utils/historical_baselines.json'), 'r') as f:
                    baselines = json.load(f)
                month = str(datetime.now().month)
                avg_precip = baselines.get('_FALLBACK_', {}).get(month, {}).get('avg_precip', 0)
                precip_anomaly = weather['precipitation'] - (avg_precip / 30)
            except Exception as e:
                precip_anomaly = 0
                
            # 2. Run XGBoost Inference (8-Hour Model)
            features = np.array([[weather['temp'], weather['precipitation'], weather['wind_speed'], weather['elevation']]])
            
            risk_class = int(clf.predict(features)[0]) # 0=High, 1=Low, 2=Moderate
            suitability = int(reg.predict(features)[0])
            
            # 3. Map predictions to UI metrics
            risk_map = {0: 'risk.high', 1: 'risk.low', 2: 'risk.moderate'}
            color_map = {0: '#EF4444', 1: '#22C55E', 2: '#EAB308'}
            
            risk_tier = risk_map.get(risk_class, 'risk.low')
            risk_color = color_map.get(risk_class, '#22C55E')
            
            # SAFETY OVERRIDE: Same logic as frontend
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
            
            weather_text = "Heavy Rain" if weather['precipitation'] > 5 else "Rainy" if weather['precipitation'] > 0.1 else "Cloudy" if weather['precipitation'] > 0 else "Clear"
            
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
            
            updated_count[0] += 1
            print(f"[{updated_count[0]}] Updated {dest['name']} | {risk_tier} | Temp: {weather['temp']}C | AI Suitability: {suitability}/100")
        except Exception as e:
            print(f"ERROR processing {dest.get('name')}: {e}")

    with ThreadPoolExecutor(max_workers=20) as executor:
        list(executor.map(process_dest, destinations))

    print("\n" + "="*60)
    print(f"SYNC COMPLETE!")
    print(f"   Total in DB: {len(destinations)}")
    print(f"   Updated:  {updated_count[0]}")
    print(f"   Skipped:  {skipped_count[0]}")
    if skipped_names:
        print(f"   Skipped locations: {', '.join(skipped_names)}")
    print("="*60)

if __name__ == "__main__":
    sync_live_data()

