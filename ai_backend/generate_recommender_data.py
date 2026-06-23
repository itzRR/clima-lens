import pandas as pd
import numpy as np
import random
import multiprocessing
from tqdm import tqdm
import os

# Define the knowledge base of rules to generate ground truth
DESTINATION_KNOWLEDGE = {
    # South/West Beaches
    "Mirissa": {'interests': ['surfing', 'beaches', 'food'], 'best_months': [12, 1, 2, 3, 4], 'is_coastal': 1, 'is_hill': 0},
    "Weligama": {'interests': ['surfing', 'beaches'], 'best_months': [12, 1, 2, 3, 4], 'is_coastal': 1, 'is_hill': 0},
    "Unawatuna": {'interests': ['beaches', 'food'], 'best_months': [12, 1, 2, 3, 4], 'is_coastal': 1, 'is_hill': 0},
    "Galle Fort": {'interests': ['culture', 'food'], 'best_months': [12, 1, 2, 3, 4], 'is_coastal': 1, 'is_hill': 0},
    
    # East Coast
    "Arugam Bay": {'interests': ['surfing', 'beaches'], 'best_months': [5, 6, 7, 8, 9], 'is_coastal': 1, 'is_hill': 0},
    "Trincomalee": {'interests': ['beaches', 'culture', 'wildlife'], 'best_months': [5, 6, 7, 8, 9], 'is_coastal': 1, 'is_hill': 0},
    
    # Wildlife Parks
    "Yala": {'interests': ['wildlife'], 'best_months': [2, 3, 4, 5, 6, 7], 'is_coastal': 0, 'is_hill': 0},
    "Udawalawe": {'interests': ['wildlife'], 'best_months': list(range(1, 13)), 'is_coastal': 0, 'is_hill': 0},
    
    # Hill Country
    "Ella": {'interests': ['hiking', 'food'], 'best_months': [1, 2, 3, 7, 8], 'is_coastal': 0, 'is_hill': 1},
    "Nuwara Eliya": {'interests': ['culture', 'hiking'], 'best_months': [2, 3, 4], 'is_coastal': 0, 'is_hill': 1},
    
    # Cultural Triangle
    "Sigiriya": {'interests': ['culture', 'hiking'], 'best_months': [1, 2, 3, 7, 8], 'is_coastal': 0, 'is_hill': 0},
    "Kandy": {'interests': ['culture', 'food'], 'best_months': [12, 1, 2, 3, 7, 8], 'is_coastal': 0, 'is_hill': 1},
}

ALL_INTERESTS = ['surfing', 'wildlife', 'hiking', 'culture', 'beaches', 'food']

def generate_batch(batch_size):
    """Worker function to generate a batch of synthetic user trip searches."""
    rows = []
    dest_names = list(DESTINATION_KNOWLEDGE.keys())
    
    for _ in range(batch_size):
        # 1. Random User Profile
        month = random.randint(1, 12)
        # User picks 1 to 3 interests
        num_interests = random.randint(1, 3)
        user_interests = random.sample(ALL_INTERESTS, num_interests)
        
        user_features = {
            'user_month': month,
            'want_surfing': 1 if 'surfing' in user_interests else 0,
            'want_wildlife': 1 if 'wildlife' in user_interests else 0,
            'want_hiking': 1 if 'hiking' in user_interests else 0,
            'want_culture': 1 if 'culture' in user_interests else 0,
            'want_beaches': 1 if 'beaches' in user_interests else 0,
            'want_food': 1 if 'food' in user_interests else 0,
        }
        
        # 2. Pick a random destination to evaluate
        dest_name = random.choice(dest_names)
        dest_kb = DESTINATION_KNOWLEDGE[dest_name]
        
        dest_features = {
            'dest_is_coastal': dest_kb['is_coastal'],
            'dest_is_hill': dest_kb['is_hill'],
            'dest_has_surfing': 1 if 'surfing' in dest_kb['interests'] else 0,
            'dest_has_wildlife': 1 if 'wildlife' in dest_kb['interests'] else 0,
            'dest_has_hiking': 1 if 'hiking' in dest_kb['interests'] else 0,
            'dest_has_culture': 1 if 'culture' in dest_kb['interests'] else 0,
            'dest_has_beaches': 1 if 'beaches' in dest_kb['interests'] else 0,
            'dest_has_food': 1 if 'food' in dest_kb['interests'] else 0,
            'dest_is_best_month': 1 if month in dest_kb['best_months'] else 0
        }
        
        # 3. Calculate True Match Score (The "Ground Truth")
        score = 0
        for i in user_interests:
            if i in dest_kb['interests']:
                score += 35
                
        if month in dest_kb['best_months']:
            score += 25
        else:
            score -= 10
            
        # Add a bit of random noise (human unpredictability)
        score += random.uniform(-5, 5)
        score = max(0, min(100, score)) # clamp 0-100
        
        row = {**user_features, **dest_features, 'target_score': round(score, 2)}
        rows.append(row)
        
    return rows

def main():
    TOTAL_SAMPLES = 50000
    WORKERS = multiprocessing.cpu_count()
    BATCH_SIZE = 5000
    
    num_batches = TOTAL_SAMPLES // BATCH_SIZE
    
    print(f"Starting Data Generation with {WORKERS} workers...")
    
    all_data = []
    
    with multiprocessing.Pool(WORKERS) as pool:
        # Use tqdm to show progress bar
        for result in tqdm(pool.imap_unordered(generate_batch, [BATCH_SIZE] * num_batches), total=num_batches, desc="Generating Trips"):
            all_data.extend(result)
            
    df = pd.DataFrame(all_data)
    
    os.makedirs('sample data', exist_ok=True)
    out_path = 'sample data/synthetic_recommendations.csv'
    df.to_csv(out_path, index=False)
    print(f"\nSuccessfully generated {len(df)} samples! Saved to {out_path}")

if __name__ == '__main__':
    main()
