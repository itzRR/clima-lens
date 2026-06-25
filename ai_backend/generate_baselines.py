"""
Generate historical climate baselines for ALL destinations in Supabase.
Uses the Open-Meteo Historical Weather API to fetch real monthly averages
for every single destination based on its actual GPS coordinates.
"""
import os
import json
import time
import requests
from supabase import create_client
from dotenv import load_dotenv
from collections import defaultdict

load_dotenv()

sb_url = os.environ.get("SUPABASE_URL") or os.environ.get("EXPO_PUBLIC_SUPABASE_URL")
sb_key = os.environ.get("SUPABASE_KEY") or os.environ.get("EXPO_PUBLIC_SUPABASE_ANON_KEY")

if not sb_url or not sb_key:
    raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set")

supabase = create_client(sb_url, sb_key)


def fetch_historical_monthly(lat: float, lon: float) -> dict:
    """
    Fetch monthly average temperature and precipitation for a location
    using Open-Meteo Historical API (last 3 years of data).
    Returns: { "1": {"avg_precip": X, "avg_temp": Y}, "2": {...}, ... "12": {...} }
    """
    url = (
        f"https://archive-api.open-meteo.com/v1/archive"
        f"?latitude={lat}&longitude={lon}"
        f"&start_date=2022-01-01&end_date=2024-12-31"
        f"&daily=temperature_2m_mean,precipitation_sum"
        f"&timezone=Asia/Colombo"
    )
    
    try:
        res = requests.get(url, timeout=30).json()
        daily = res.get("daily", {})
        dates = daily.get("time", [])
        temps = daily.get("temperature_2m_mean", [])
        precips = daily.get("precipitation_sum", [])
        
        if not dates:
            return {}
        
        # Group by month
        monthly_temps = defaultdict(list)
        monthly_precips = defaultdict(list)
        
        for i, date_str in enumerate(dates):
            month = date_str.split("-")[1].lstrip("0")  # "01" -> "1"
            if i < len(temps) and temps[i] is not None:
                monthly_temps[month].append(temps[i])
            if i < len(precips) and precips[i] is not None:
                monthly_precips[month].append(precips[i])
        
        result = {}
        for m in range(1, 13):
            ms = str(m)
            t_list = monthly_temps.get(ms, [])
            p_list = monthly_precips.get(ms, [])
            result[ms] = {
                "avg_precip": round(sum(p_list) / len(p_list), 2) if p_list else 0,
                "avg_temp": round(sum(t_list) / len(t_list), 2) if t_list else 27.0
            }
        
        return result
        
    except Exception as e:
        print(f"    API Error: {e}")
        return {}


def main():
    print("=" * 60)
    print("GENERATING HISTORICAL BASELINES FOR ALL DESTINATIONS")
    print("=" * 60)
    
    # 1. Fetch all destinations from Supabase
    print("\nFetching all destinations from Supabase...")
    response = supabase.table("destinations").select("name, district, latitude, longitude").execute()
    destinations = response.data
    print(f"Found {len(destinations)} destinations.\n")
    
    baselines = {}
    processed = 0
    skipped = 0
    
    # 2. Process in batches to avoid rate limits
    for dest in destinations:
        name = dest.get("name", "Unknown")
        district = dest.get("district", "")
        lat = dest.get("latitude")
        lon = dest.get("longitude")
        
        if not lat or not lon:
            print(f"  [SKIP] {name} - no coordinates")
            skipped += 1
            continue
        
        # Skip if we already have this location
        if name in baselines:
            continue
            
        print(f"  [{processed + 1}] Fetching climate data for {name} ({district})...")
        monthly = fetch_historical_monthly(lat, lon)
        
        if monthly:
            baselines[name] = monthly
            processed += 1
        else:
            print(f"    [WARN] No data for {name}")
            skipped += 1
        
        # Also store by district if not already present
        if district and district not in baselines and monthly:
            baselines[district] = monthly
        
        # Rate limit: Open-Meteo allows ~600 requests/min for free
        time.sleep(0.15)
    
    # 3. Calculate national fallback average
    print("\nCalculating national fallback average...")
    national = defaultdict(lambda: {"temps": [], "precips": []})
    for loc_name, months in baselines.items():
        if loc_name == "_FALLBACK_":
            continue
        for m, data in months.items():
            national[m]["temps"].append(data["avg_temp"])
            national[m]["precips"].append(data["avg_precip"])
    
    fallback = {}
    for m in range(1, 13):
        ms = str(m)
        t_list = national.get(ms, {}).get("temps", [27.0])
        p_list = national.get(ms, {}).get("precips", [0])
        fallback[ms] = {
            "avg_precip": round(sum(p_list) / max(len(p_list), 1), 2),
            "avg_temp": round(sum(t_list) / max(len(t_list), 1), 2)
        }
    baselines["_FALLBACK_"] = fallback
    
    # 4. Save
    output_path = "../src/utils/historical_baselines.json"
    with open(output_path, "w") as f:
        json.dump(baselines, f, indent=2)
    
    print(f"\n{'=' * 60}")
    print(f"DONE! Generated baselines for {processed} destinations.")
    print(f"Skipped: {skipped}")
    print(f"Saved to: {output_path}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
