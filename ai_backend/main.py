from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import numpy as np
import xgboost as xgb
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="ClimaLens Real AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

if not url or not key:
    raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in .env")

supabase: Client = create_client(url, key)

# Load XGBoost Models
clf = xgb.XGBClassifier()
reg = xgb.XGBRegressor()
recommender = xgb.XGBRegressor()

try:
    clf.load_model('models/risk_classifier.json')
    reg.load_model('models/suitability_regressor.json')
    try:
        recommender.load_model('models/recommender_model.json')
    except:
        print("Recommender model not found. Needs to be trained.")
    models_loaded = True
except Exception as e:
    print(f"Warning: Base XGBoost models not loaded. Have you run the Colab Notebook? Error: {e}")
    models_loaded = False

@app.get("/")
def read_root():
    return {"status": "running", "models_loaded": models_loaded}

def fetch_live_weather(lat, lon):
    """Fetch live weather from Open-Meteo free API."""
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,precipitation,wind_speed_10m&elevation=nan"
    try:
        res = requests.get(url).json()
        current = res.get('current', {})
        return {
            "temp": current.get('temperature_2m', 25.0),
            "precipitation": current.get('precipitation', 0.0),
            "wind_speed": current.get('wind_speed_10m', 10.0),
            "elevation": res.get('elevation', 50)
        }
    except Exception as e:
        print(f"Error fetching weather: {e}")
        # Default fallback
        return {"temp": 28.0, "precipitation": 0.0, "wind_speed": 10.0, "elevation": 50}

def update_supabase_task():
    """Background task to fetch live weather and push AI predictions to Supabase."""
    if not models_loaded:
        print("Cannot update Supabase: Models not loaded.")
        return

    try:
        # Fetch destinations
        response = supabase.table('destinations').select('*').execute()
        destinations = response.data
        
        for dest in destinations:
            lat, lon = dest.get('latitude'), dest.get('longitude')
            if not lat or not lon:
                continue
                
            # 1. Fetch Real Weather
            weather = fetch_live_weather(lat, lon)
            
            # 2. Run XGBoost Inference
            # Features order: elevation, temp, precipitation, wind_speed
            features = np.array([[weather['elevation'], weather['temp'], weather['precipitation'], weather['wind_speed']]])
            
            risk_class = int(clf.predict(features)[0]) # 0=Low, 1=Mod, 2=High
            suitability = int(reg.predict(features)[0])
            
            # 3. Map predictions to UI metrics
            risk_map = {0: 'risk.low', 1: 'risk.moderate', 2: 'risk.high'}
            color_map = {0: '#22C55E', 1: '#EAB308', 2: '#EF4444'}
            
            risk_tier = risk_map.get(risk_class, 'risk.low')
            risk_color = color_map.get(risk_class, '#22C55E')
            
            # Synthesize secondary scores dynamically from real weather
            safety_score = max(0, 100 - (weather['precipitation'] * 2) - (weather['wind_speed']))
            comfort_score = max(0, 100 - abs(weather['temp'] - 26) * 3)
            risk_score = 100 - safety_score
            forecast_confidence = np.random.randint(80, 95) # In real life, use API confidence
            community_activity = np.random.randint(5, 50)   # Fake for now
            
            weather_text = "Rain" if weather['precipitation'] > 2 else "Clear" if weather['precipitation'] == 0 else "Cloudy"
            
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
            
            print(f"Updated {dest['name']} using real weather.")
            
    except Exception as e:
        print(f"Error updating Supabase: {e}")

@app.get("/trigger-update")
def trigger_update(background_tasks: BackgroundTasks):
    background_tasks.add_task(update_supabase_task)
    return {"message": "Real Data AI Pipeline triggered."}

class PredictRequest(BaseModel):
    lat: float
    lon: float

@app.post("/predict-location")
def predict_location(req: PredictRequest):
    if not models_loaded:
        return {"error": "Models not loaded"}
    
    weather = fetch_live_weather(req.lat, req.lon)
    features = np.array([[weather['elevation'], weather['temp'], weather['precipitation'], weather['wind_speed']]])
    
    risk_class = int(clf.predict(features)[0])
    suitability = int(reg.predict(features)[0])
    
    risk_map = {0: 'risk.low', 1: 'risk.moderate', 2: 'risk.high'}
    color_map = {0: '#22C55E', 1: '#EAB308', 2: '#EF4444'}
    
    return {
        "temp": weather['temp'],
        "weather": "Rain" if weather['precipitation'] > 2 else "Clear" if weather['precipitation'] == 0 else "Cloudy",
        "risk_tier": risk_map.get(risk_class, 'risk.low'),
        "risk_color": color_map.get(risk_class, '#22C55E'),
        "suitability_score": suitability,
    }

class RecommendRequest(BaseModel):
    month: int
    interests: list[str]

@app.post("/recommend-destinations")
def recommend_destinations(req: RecommendRequest):
    try:
        # Fetch ALL destinations from Supabase (up to 1000)
        response = supabase.table('destinations').select('*').limit(1000).execute()
        destinations = response.data
        
        # User features
        user_month = req.month
        want_surfing = 1 if 'surfing' in req.interests else 0
        want_wildlife = 1 if 'wildlife' in req.interests else 0
        want_hiking = 1 if 'hiking' in req.interests else 0
        want_culture = 1 if 'culture' in req.interests else 0
        want_beaches = 1 if 'beaches' in req.interests else 0
        want_food = 1 if 'food' in req.interests else 0
        
        results = []
        for d in destinations:
            # We derive features from DB tags for ML inference
            tags = d.get('tags', []) or []
            dest_has_surfing = 1 if 'interests.surfing' in tags else 0
            dest_has_wildlife = 1 if 'interests.wildlife' in tags else 0
            dest_has_hiking = 1 if 'interests.hiking' in tags else 0
            dest_has_culture = 1 if 'interests.culture' in tags else 0
            dest_has_beaches = 1 if 'interests.beaches' in tags else 0
            dest_has_food = 1 if 'interests.food' in tags else 0
            
            name_lower = d.get('name', '').lower()
            dest_is_coastal = 1 if ('beach' in name_lower or 'bay' in name_lower or dest_has_surfing) else 0
            dest_is_hill = 1 if ('ella' in name_lower or 'kandy' in name_lower or 'mountain' in name_lower) else 0
            
            # Simple approximation for ML feature
            dest_is_best_month = 1 if dest_is_coastal and user_month in [1, 2, 3, 12] else 0
            
            # Create feature array exactly matching training data format
            features = np.array([[
                user_month, want_surfing, want_wildlife, want_hiking, want_culture, want_beaches, want_food,
                dest_is_coastal, dest_is_hill, dest_has_surfing, dest_has_wildlife, dest_has_hiking,
                dest_has_culture, dest_has_beaches, dest_has_food, dest_is_best_month
            ]])
            
            try:
                # Ask XGBoost to predict the match score (0-100)
                match_score = float(recommender.predict(features)[0])
                
                # Risk Penalties (Safety override)
                if d.get('risk_tier') == 'risk.high': match_score -= 40
                elif d.get('risk_tier') == 'risk.moderate': match_score -= 15
                
                if match_score > 10 or len(req.interests) == 0:
                    d['matchScore'] = match_score
                    d['matchReasons'] = ["AI Matched"]
                    results.append(d)
            except:
                # Fallback if model isn't trained yet
                results.append(d)
                
        # Sort top results
        results.sort(key=lambda x: x.get('matchScore', 0), reverse=True)
        return {"recommendations": results[:30]}
        
    except Exception as e:
        print(f"Error in recommend_destinations: {e}")
        return {"error": str(e)}
