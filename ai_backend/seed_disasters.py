import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

# Authentic Historical Disaster Database for Sri Lanka (Data sourced from DMC and DesInventar reports)
REAL_DISASTERS = [
    {
        "year": 2004,
        "type": "tsunami",
        "severity": "critical",
        "description": "The catastrophic 2004 Indian Ocean Tsunami devastated this coastal district, causing massive loss of life and infrastructure.",
        "affected_districts": ['galle', 'matara', 'hambantota', 'ampara', 'batticaloa', 'trincomalee', 'mullaitivu', 'puttalam', 'colombo', 'kalutara']
    },
    {
        "year": 2025,
        "type": "cyclone",
        "severity": "critical",
        "description": "Cyclone Ditwah caused severe nationwide impacts. This district suffered from extreme flooding and wind damage.",
        "affected_districts": ['gampaha', 'colombo', 'puttalam', 'mannar', 'trincomalee', 'batticaloa']
    },
    {
        "year": 2025,
        "type": "landslide",
        "severity": "critical",
        "description": "Cyclone Ditwah triggered deadly landslides and earth slips across the mountainous terrain.",
        "affected_districts": ['kandy', 'badulla', 'matale', 'kegalle', 'nuwara eliya']
    },
    {
        "year": 2017,
        "type": "flood",
        "severity": "high",
        "description": "Extreme South-West monsoonal rains triggered massive mudflows and catastrophic flooding.",
        "affected_districts": ['kalutara', 'matara', 'ratnapura', 'galle']
    },
    {
        "year": 2016,
        "type": "flood",
        "severity": "high",
        "description": "Tropical Storm Roanu caused devastating urban flooding as the Kelani river overflowed.",
        "affected_districts": ['colombo', 'gampaha']
    },
    {
        "year": 2016,
        "type": "landslide",
        "severity": "critical",
        "description": "Tropical Storm Roanu triggered the catastrophic Aranayake landslide, burying entire villages.",
        "affected_districts": ['kegalle']
    },
    {
        "year": 2014,
        "type": "drought",
        "severity": "high",
        "description": "A severe, prolonged drought devastated agricultural yields and dried up major reservoirs.",
        "affected_districts": ['kurunegala', 'hambantota', 'moneragala', 'puttalam', 'anuradhapura', 'polonnaruwa']
    }
]

def get_disasters_for_location(name, district):
    """Matches real Sri Lankan historical disasters to specific locations based on their district."""
    disasters = []
    district_lower = district.lower()
    
    for event in REAL_DISASTERS:
        if any(d in district_lower for d in event['affected_districts']):
            # Create a copy so we can attach it to the specific destination
            record = {
                "year": event["year"],
                "type": event["type"],
                "severity": event["severity"],
                "description": event["description"]
            }
            disasters.append(record)
            
    return disasters

def main():
    print("Connecting to Supabase...")
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: Missing Supabase credentials in .env file.")
        return
        
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("Fetching all destinations...")
    response = supabase.table('destinations').select('id, name, district').limit(1000).execute()
    destinations = response.data
    
    print(f"Generating historical disasters for {len(destinations)} destinations...")
    
    all_disasters_to_insert = []
    
    for dest in destinations:
        dest_disasters = get_disasters_for_location(dest['name'], dest['district'])
        for d in dest_disasters:
            # Add destination foreign key
            d['destination_id'] = dest['id']
            all_disasters_to_insert.append(d)
            
    print(f"Ready to insert {len(all_disasters_to_insert)} disaster records...")
    
    # In Supabase, we can do bulk inserts. Let's chunk them just in case.
    chunk_size = 100
    for i in range(0, len(all_disasters_to_insert), chunk_size):
        chunk = all_disasters_to_insert[i:i + chunk_size]
        try:
            supabase.table('historical_disasters').insert(chunk).execute()
            print(f"Inserted records {i} to {i + len(chunk)}...")
        except Exception as e:
            print(f"Error inserting chunk: {e}")
            
    print("✅ Successfully populated the historical_disasters table!")

if __name__ == '__main__':
    main()
