import os
import json
import time
import requests
import concurrent.futures
from tqdm import tqdm
from supabase import create_client
from dotenv import load_dotenv

# Load Environment Variables
load_dotenv('ai_backend/.env')
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', os.environ.get('SUPABASE_KEY'))

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Supabase credentials not found in ai_backend/.env")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Disaster keywords to search for
KEYWORDS = ["tsunami", "flood", "landslide", "cyclone", "disaster", "earthquake"]

def fetch_locations():
    """Fetch all unique locations from Supabase"""
    print("Fetching locations from Supabase...")
    response = supabase.table('destinations').select('id, name').execute()
    return response.data

def search_wikipedia_for_disaster(location):
    """Worker function to search Wikipedia for a specific location"""
    loc_name = location['name']
    
    import urllib.parse
    # We construct a highly targeted search query without strict quotes
    query = f'{loc_name} Sri Lanka tsunami OR flood OR landslide OR cyclone OR disaster'
    url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(query)}&utf8=&format=json"
    
    try:
        headers = {'User-Agent': 'ClimaLensApp/1.0 (rehan@example.com)'}
        res = requests.get(url, headers=headers, timeout=10).json()
        search_results = res.get('query', {}).get('search', [])
        
        disasters_found = []
        
        # If Wikipedia found matching articles
        if search_results:
            # Look at the top result
            result = search_results[0]
            snippet = result['snippet'].lower()
            
            import html
            # Clean up HTML tags and unescape entities from Wikipedia snippet
            clean_text = html.unescape(result['snippet'].replace('<span class="searchmatch">', '').replace('</span>', ''))
            
            # Extract the first matching keyword for categorization
            found_keyword = "disaster"
            for k in KEYWORDS:
                if k in snippet or k in result['title'].lower():
                    found_keyword = k
                    break
                    
            disasters_found.append({
                "year": extract_year(clean_text) or "Historical",
                "type": found_keyword,
                "severity": "high",
                "description": clean_text
            })
                        
        return {"id": location['id'], "name": loc_name, "disasters": disasters_found}
        
    except Exception as e:
        return {"id": location['id'], "name": loc_name, "disasters": [], "error": str(e)}

def extract_year(text):
    """Simple helper to find a 4-digit year like 2004 in the text"""
    import re
    match = re.search(r'\b(19|20)\d{2}\b', text)
    return int(match.group(0)) if match else None

def main():
    print("Starting High-Speed Historical Disaster Miner...")
    
    locations = fetch_locations()
    if not locations:
        print("Error: No locations found in database!")
        return
        
    print(f"Found {len(locations)} locations to process.")
    
    results = []
    
    # ⚡ Use ThreadPoolExecutor for massive speed! 30 workers = 30 concurrent API calls
    # This will finish 1000 locations in just a few seconds instead of hours.
    start_time = time.time()
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=30) as executor:
        # TQDM creates a beautiful, fast loading bar
        futures = {executor.submit(search_wikipedia_for_disaster, loc): loc for loc in locations}
        
        for future in tqdm(concurrent.futures.as_completed(futures), total=len(locations), desc="Mining Data", unit="loc"):
            data = future.result()
            if data['disasters']:
                results.append(data)

    end_time = time.time()
    
    # Save the mined data to a local JSON file so you can review it before pushing to Supabase
    output_file = "mined_historical_disasters.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2)
        
    print(f"\nFinished successfully in {round(end_time - start_time, 2)} seconds!")
    print(f"Found disaster history for {len(results)} locations.")
    print(f"Results saved to {output_file}. You can review this file before we upload it to Supabase!")

if __name__ == "__main__":
    main()
