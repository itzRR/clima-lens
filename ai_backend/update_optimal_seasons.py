import os
import random
import pandas as pd
import numpy as np
import xgboost as xgb
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

def create_seasonality_dataset():
    """Generates synthetic historical tourism data based on Sri Lanka's actual monsoons"""
    print("Generating Historical Tourism Seasonality Data...")
    
    rows = []
    for _ in range(20000):
        month = random.randint(1, 12)
        is_coastal = random.choice([0, 1])
        is_hill = 1 if not is_coastal and random.random() > 0.5 else 0
        
        # Determine region
        is_south_west = 1 if is_coastal and random.random() > 0.4 else 0
        is_east = 1 if is_coastal and not is_south_west else 0
        
        # Tourism Volume Score (Ground Truth based on real Sri Lanka seasonality)
        score = 50 # Baseline
        
        if is_south_west:
            if month in [12, 1, 2, 3, 4]: score += 40
            elif month in [5, 6, 10]: score -= 30 # Peak monsoon
        elif is_east:
            if month in [5, 6, 7, 8, 9]: score += 40
            elif month in [11, 12, 1]: score -= 30
        elif is_hill:
            if month in [1, 2, 3, 7, 8]: score += 30
            elif month in [10, 11]: score -= 20
        else: # Cultural triangle / inland
            if month in [1, 2, 3, 7, 8]: score += 20
            
        # Add random noise
        score += random.uniform(-10, 10)
        score = max(0, min(100, score))
        
        rows.append({
            'month': month,
            'is_coastal': is_coastal,
            'is_hill': is_hill,
            'is_south_west': is_south_west,
            'is_east': is_east,
            'tourist_volume': round(score, 1)
        })
        
    return pd.DataFrame(rows)

def train_and_get_model(df):
    print("Training XGBoost Seasonality Model...")
    X = df.drop('tourist_volume', axis=1)
    y = df['tourist_volume']
    
    model = xgb.XGBRegressor(objective='reg:squarederror', n_estimators=100, max_depth=5)
    model.fit(X, y)
    
    os.makedirs('models', exist_ok=True)
    model.save_model('models/seasonality_model.json')
    print("Model trained and saved!")
    return model

def update_supabase_seasons(model):
    print("Connecting to Supabase...")
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: Missing Supabase credentials in .env file.")
        return
        
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("Fetching destinations...")
    response = supabase.table('destinations').select('*').limit(1000).execute()
    destinations = response.data
    
    print(f"Scoring {len(destinations)} destinations for all 12 months...")
    
    updates_count = 0
    for dest in destinations:
        name_lower = dest.get('name', '').lower()
        district = dest.get('district', '').lower()
        
        # Derive features based on location names/districts
        is_coastal = 1 if 'beach' in name_lower or 'bay' in name_lower or 'galle' in district or 'matara' in district or 'hambantota' in district or 'trincomalee' in district or 'ampara' in district else 0
        is_hill = 1 if 'nuwara' in district or 'badulla' in district or 'ella' in name_lower or 'kandy' in district else 0
        
        is_south_west = 1 if is_coastal and ('galle' in district or 'matara' in district or 'hambantota' in district or 'colombo' in district or 'kalutara' in district) else 0
        is_east = 1 if is_coastal and not is_south_west else 0
        
        month_scores = []
        for month in range(1, 13):
            features = np.array([[month, is_coastal, is_hill, is_south_west, is_east]])
            score = float(model.predict(features)[0])
            month_scores.append((month, score))
            
        # Find months with score > 70
        best_months = [m[0] for m in month_scores if m[1] > 70]
        
        # If model is too strict, just take the top 4
        if len(best_months) == 0:
            month_scores.sort(key=lambda x: x[1], reverse=True)
            best_months = [m[0] for m in month_scores[:4]]
            
        # Update Supabase
        try:
            supabase.table('destinations').update({
                "optimal_months": best_months
            }).eq('id', dest['id']).execute()
            updates_count += 1
        except Exception as e:
            print(f"Error updating {dest['name']}: {e}")
            
    print(f"✅ Successfully updated optimal_months for {updates_count} destinations in Supabase!")

def main():
    df = create_seasonality_dataset()
    model = train_and_get_model(df)
    update_supabase_seasons(model)

if __name__ == '__main__':
    main()
