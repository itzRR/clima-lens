import os
import json
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
supabase = create_client(os.environ['SUPABASE_URL'], os.environ.get('SUPABASE_SERVICE_KEY', os.environ['SUPABASE_KEY']))

print("Fetching destinations with missing coordinates...")
res = supabase.table('destinations').select('id, name, latitude, longitude').execute()
destinations = res.data
missing = [d for d in destinations if not d.get('latitude') or not d.get('longitude')]
print(f"Found {len(missing)} destinations missing coordinates.")

if not missing:
    print("All destinations have coordinates! Exiting.")
    exit(0)

# Load locations from notebook
notebook_path = 'ClimaLens_Training_Pipeline.ipynb'
with open(notebook_path, 'r', encoding='utf-8') as f:
    nb = json.load(f)

locations_code = ""
for cell in nb['cells']:
    if cell['cell_type'] == 'code':
        source = "".join(cell['source'])
        if "locations = [" in source:
            locations_code = source
            break

local_vars = {}
exec(locations_code, {}, local_vars)
nb_locations = local_vars.get('locations', [])

print(f"Loaded {len(nb_locations)} locations from notebook.")

# Create lookup map
# Also make it case-insensitive and handle slight whitespace differences
loc_map = {loc['name'].strip().lower(): loc for loc in nb_locations}

updated = 0
for d in missing:
    db_name = d['name'].strip().lower()
    
    # Try exact match first
    match = loc_map.get(db_name)
    
    # If no exact match, try partial match
    if not match:
        for nb_name, loc in loc_map.items():
            if db_name in nb_name or nb_name in db_name:
                match = loc
                break
                
    if match:
        lat = match['lat']
        lon = match['lon']
        print(f"Fixing '{d['name']}' -> lat: {lat}, lon: {lon}")
        supabase.table('destinations').update({
            'latitude': lat,
            'longitude': lon
        }).eq('id', d['id']).execute()
        updated += 1
    else:
        print(f"❌ Could not find coordinates for: {d['name']}")

print(f"Finished! Fixed coordinates for {updated} destinations.")
