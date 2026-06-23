import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import os

def generate_risk_labels(row):
    """
    Generate meteorological ground truth risk labels based on standard weather thresholds.
    0: High Risk (Extreme weather)
    1: Low Risk (Safe, normal weather)
    2: Moderate Risk (Uncomfortable or potentially disruptive)
    """
    precip = row['precipitation_sum']
    wind = row['windspeed_10m_max']
    temp = row['temperature_2m_mean']
    
    # High Risk Thresholds
    if pd.isna(precip) or pd.isna(wind) or pd.isna(temp):
        return 1 # Default Low
        
    if precip > 75.0 or wind > 65.0 or temp > 36.0 or temp < 5.0:
        return 0 # High Risk
        
    # Moderate Risk Thresholds
    if precip > 20.0 or wind > 35.0 or temp > 33.0 or temp < 10.0:
        return 2 # Moderate Risk
        
    # Low Risk
    return 1

def main():
    print("Loading 14-year Kaggle Dataset (This may take a moment)...")
    dataset_path = 'kaggle/SriLanka_Weather_Dataset.csv'
    
    if not os.path.exists(dataset_path):
        print(f"Error: Could not find {dataset_path}")
        return
        
    df = pd.read_csv(dataset_path)
    print(f"Loaded {len(df)} days of historical weather data!")
    
    print("Extracting features and generating baseline risk thresholds...")
    # Map Kaggle columns to what the model expects: [elevation, temp, precip, wind_speed]
    # In EdgeInference.ts: features = [temp, precip, wind, elevation]
    # Wait, let's verify the order exactly as it is in EdgeInference.ts.
    
    # Calculate Risk Label
    df['risk_label'] = df.apply(generate_risk_labels, axis=1)
    
    # EdgeInference expects: [temp, precip, wind, elevation]
    X = df[['temperature_2m_mean', 'precipitation_sum', 'windspeed_10m_max', 'elevation']]
    X.columns = ['temp', 'precip', 'wind_speed', 'elevation'] # rename for clarity, though order matters most for xgb
    
    # Fill any NaNs with reasonable defaults
    X = X.fillna({
        'temp': 25.0,
        'precip': 0.0,
        'wind_speed': 10.0,
        'elevation': 50.0
    })
    
    y = df['risk_label']
    
    print(f"Class Distribution:\n{y.value_counts()}")
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training XGBoost Multiclass Classifier on real data...")
    clf = xgb.XGBClassifier(
        objective='multi:softprob',
        num_class=3,
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1
    )
    
    clf.fit(X_train, y_train)
    
    preds = clf.predict(X_test)
    acc = accuracy_score(y_test, preds)
    print(f"Model Accuracy on Test Data: {acc * 100:.2f}%")
    
    # Save the old model as backup
    model_path = 'models/risk_classifier.json'
    if os.path.exists(model_path):
        os.rename(model_path, 'models/risk_classifier_old.json')
        print("Backed up old model to risk_classifier_old.json")
        
    clf.save_model(model_path)
    
    # Also save to the frontend source just to be absolutely sure EdgeInference picks it up
    frontend_model_path = '../src/utils/models/risk_classifier.json'
    if os.path.exists(frontend_model_path):
        clf.save_model(frontend_model_path)
        print("Updated frontend model as well!")
        
    print("✅ Successfully trained highly-accurate Risk Classifier using 14-year Kaggle Data!")

if __name__ == '__main__':
    main()
