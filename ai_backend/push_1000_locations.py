import os
import json
from supabase import create_client
from dotenv import load_dotenv
import uuid

load_dotenv('ai_backend/.env')
supabase = create_client(os.environ['SUPABASE_URL'], os.environ.get('SUPABASE_SERVICE_KEY', os.environ['SUPABASE_KEY']))

# 1. Extract the 1000+ locations from the Notebook
notebook_path = 'ai_backend/ClimaLens_Training_Pipeline.ipynb'
with open(notebook_path, 'r', encoding='utf-8') as f:
    nb = json.load(f)

locations_code = ""
for cell in nb['cells']:
    if cell['cell_type'] == 'code':
        source = "".join(cell['source'])
        if "locations = [" in source:
            locations_code = source
            break

if not locations_code:
    print("Could not find locations list in notebook.")
    exit(1)

# Execute the extracted code to load the `locations` list into memory
local_vars = {}
exec(locations_code, {}, local_vars)
locations = local_vars.get('locations', [])

print(f"Extracted {len(locations)} locations from notebook.")

# 2. Fetch existing locations to avoid duplicates
res = supabase.table('destinations').select('name').execute()
existing_names = {d['name'] for d in res.data}

# 3. Prepare new records
new_records = []
for loc in locations:
    name = loc['name']
    if name not in existing_names:
        new_records.append({
            "id": str(uuid.uuid4()),
            "name": name,
            "district": "Sri Lanka", # We don't have explicit district mapped in the raw data
            "latitude": loc['lat'],
            "longitude": loc['lon'],
            "risk_tier": "risk.low",
            "risk_color": "#22C55E",
            "suitability_score": 50,
            "weather": "Unknown",
            "temp": "0°C",
            "safety_score": 50,
            "comfort_score": 50,
            "risk_score": 0,
            "tags": []
        })
        existing_names.add(name) # Prevent duplicates if notebook has duplicates

print(f"Found {len(new_records)} new locations to add.")

# 4. Batch Insert into Supabase
batch_size = 100
for i in range(0, len(new_records), batch_size):
    batch = new_records[i:i+batch_size]
    try:
        supabase.table('destinations').insert(batch).execute()
        print(f"Inserted batch {i//batch_size + 1}")
    except Exception as e:
        print(f"Error inserting batch: {e}")

print("Upload complete!")
