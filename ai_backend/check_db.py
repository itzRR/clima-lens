import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('ai_backend/.env')
s = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_KEY'])
r = s.table('destinations').select('name,temp,weather,suitability_score,risk_tier').limit(8).execute()
for d in r.data:
    print(f"{d['name']:30s} | {str(d['temp']):8s} | {str(d['weather']):6s} | Score: {d['suitability_score']} | {d['risk_tier']}")
