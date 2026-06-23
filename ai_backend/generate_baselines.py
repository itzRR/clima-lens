import pandas as pd
import json
import os
from collections import defaultdict

def main():
    print("Generating Historical Baselines from Kaggle Dataset...")
    dataset_path = 'kaggle/SriLanka_Weather_Dataset.csv'
    
    if not os.path.exists(dataset_path):
        print(f"Error: {dataset_path} not found.")
        return
        
    df = pd.read_csv(dataset_path)
    
    # Ensure date is parsed
    df['time'] = pd.to_datetime(df['time'])
    df['month'] = df['time'].dt.month
    
    # Group by city and month to find historical averages
    print("Calculating monthly averages per city...")
    grouped = df.groupby(['city', 'month'])[['precipitation_sum', 'temperature_2m_mean']].mean().reset_index()
    
    baselines = {}
    for _, row in grouped.iterrows():
        city = row['city']
        month = int(row['month'])
        if city not in baselines:
            baselines[city] = {}
            
        baselines[city][str(month)] = {
            "avg_precip": round(row['precipitation_sum'], 2),
            "avg_temp": round(row['temperature_2m_mean'], 2)
        }
        
    # Calculate a global fallback average across all of Sri Lanka
    print("Calculating national fallbacks...")
    national_grouped = df.groupby(['month'])[['precipitation_sum', 'temperature_2m_mean']].mean().reset_index()
    fallback = {}
    for _, row in national_grouped.iterrows():
        month = int(row['month'])
        fallback[str(month)] = {
            "avg_precip": round(row['precipitation_sum'], 2),
            "avg_temp": round(row['temperature_2m_mean'], 2)
        }
    
    baselines["_FALLBACK_"] = fallback
    
    # Save for the frontend
    output_path = '../src/utils/historical_baselines.json'
    with open(output_path, 'w') as f:
        json.dump(baselines, f, indent=2)
        
    print(f"✅ Successfully generated historical baselines and saved to {output_path}")

if __name__ == "__main__":
    main()
