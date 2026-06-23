import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

def get_activities_for_location(name, district):
    """Geographic rule engine to determine top real activities based on location features."""
    activities = []
    name_lower = name.lower()
    district_lower = district.lower()
    
    # 1. Surfing & Beaches
    is_beach = any(x in name_lower for x in ['beach', 'bay', 'coast', 'sea']) or 'galle' in district_lower or 'matara' in district_lower or 'hambantota' in district_lower
    if is_beach:
        activities.append("Surfing & Beaches")
        
        if 'trincomalee' in district_lower or 'galle' in district_lower:
            activities.append("Scuba Diving")
            
        if 'mirissa' in name_lower or 'trincomalee' in district_lower:
            activities.append("Whale Watching")
            
    # 2. Wildlife & Safaris
    if any(x in name_lower for x in ['national park', 'safari', 'yala', 'udawalawe', 'minneriya', 'wilpattu', 'sinharaja']):
        activities.append("Wildlife Safari")
        
    if 'elephant' in name_lower or 'pinnawala' in name_lower:
        activities.append("Elephant Encounters")

    # 3. Hiking & Mountains
    is_hill = any(x in name_lower for x in ['hill', 'peak', 'mountain', 'ella', 'plains', 'gap', 'rock']) or 'nuwara eliya' in district_lower or 'badulla' in district_lower
    if is_hill:
        activities.append("Hiking & Trekking")
        activities.append("Scenic Train Rides")
        activities.append("Tea Plantation Tours")

    # 4. Cultural Heritage & Temples
    if any(x in district_lower for x in ['anuradhapura', 'polonnaruwa', 'kandy', 'matale', 'colombo']) or 'temple' in name_lower or 'fort' in name_lower or 'sigiriya' in name_lower:
        activities.append("Cultural Heritage")
        activities.append("Historical Architecture")

    # 5. Food & City Life
    if 'colombo' in district_lower or 'galle fort' in name_lower or 'kandy' in district_lower:
        activities.append("Local Cuisine")
        activities.append("City Exploration")

    # Fallback if empty
    if not activities:
        activities = ["Sightseeing", "Local Cuisine", "Photography"]
        
    # Ensure unique and limit to top 4
    unique_activities = list(dict.fromkeys(activities))
    return unique_activities[:4]

def main():
    print("Connecting to Supabase...")
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: Missing Supabase credentials in .env file.")
        return
        
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("Fetching all destinations...")
    response = supabase.table('destinations').select('id, name, district').limit(1000).execute()
    destinations = response.data
    
    print(f"Assigning real activities for {len(destinations)} destinations...")
    
    success_count = 0
    for dest in destinations:
        real_activities = get_activities_for_location(dest['name'], dest['district'])
        
        try:
            supabase.table('destinations').update({"activities": real_activities}).eq("id", dest['id']).execute()
            success_count += 1
        except Exception as e:
            print(f"Error updating {dest['name']}: {e}")
            
    print(f"✅ Successfully updated activities for {success_count} destinations!")

if __name__ == '__main__':
    main()
