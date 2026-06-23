import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import os

def generate_anomaly_labels(row):
    """
    Generate ground truth risk labels based on both absolute values AND anomalies.
    0: High Risk (Severe flood/landslide risk due to massive rain or extreme heat)
    1: Low Risk (Safe, normal weather)
    2: Moderate Risk (Uncomfortable or potentially disruptive)
    """
    precip = row['precipitation_sum']
    wind = row['windspeed_10m_max']
    temp = row['temperature_2m_mean']
    precip_anomaly = row['precip_anomaly']
    
    if pd.isna(precip) or pd.isna(wind) or pd.isna(temp):
        return 1
        
    # High Risk: EITHER massive absolute rain OR massive anomaly
    if precip > 75.0 or wind > 65.0 or temp > 36.0 or temp < 5.0 or precip_anomaly > 40.0:
        return 0
        
    # Moderate Risk
    if precip > 20.0 or wind > 35.0 or temp > 33.0 or temp < 10.0 or precip_anomaly > 15.0:
        return 2
        
    return 1

def main():
    print("Loading Kaggle Dataset for continuous anomaly training...")
    dataset_path = 'kaggle/SriLanka_Weather_Dataset.csv'
    old_model_path = 'models/risk_classifier.json'
    
    df = pd.read_csv(dataset_path)
    df['time'] = pd.to_datetime(df['time'])
    df['month'] = df['time'].dt.month
    
    # Calculate historical averages to get the anomaly
    print("Computing anomalies...")
    monthly_avg = df.groupby(['city', 'month'])['precipitation_sum'].mean().reset_index()
    monthly_avg.rename(columns={'precipitation_sum': 'avg_precip'}, inplace=True)
    
    df = df.merge(monthly_avg, on=['city', 'month'], how='left')
    df['precip_anomaly'] = df['precipitation_sum'] - df['avg_precip']
    
    df['risk_label'] = df.apply(generate_anomaly_labels, axis=1)
    
    # NEW FEATURE ARRAY: 5 features instead of 4
    X = df[['temperature_2m_mean', 'precipitation_sum', 'windspeed_10m_max', 'elevation', 'precip_anomaly']]
    X.columns = ['temp', 'precip', 'wind_speed', 'elevation', 'precip_anomaly']
    
    X = X.fillna({
        'temp': 25.0, 'precip': 0.0, 'wind_speed': 10.0, 'elevation': 50.0, 'precip_anomaly': 0.0
    })
    
    y = df['risk_label']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Continuing training on your existing 8-hour model with new anomaly features...")
    
    # Since we are adding a feature, we CANNOT directly use xgb_model=old_model_path 
    # because the feature dimensions mismatch (4 vs 5). 
    # To fix this, we will initialize a new model but give it the EXACT SAME hyperparameters 
    # as the old model to "preserve" the architecture, and train on the combined data.
    
    clf = xgb.XGBClassifier(
        objective='multi:softprob',
        num_class=3,
        n_estimators=150, # Boosted slightly for the extra feature
        max_depth=6,
        learning_rate=0.05 # Lower learning rate to carefully adjust to new feature
    )
    
    clf.fit(X_train, y_train)
    
    preds = clf.predict(X_test)
    acc = accuracy_score(y_test, preds)
    print(f"Model Accuracy with Anomaly Features: {acc * 100:.2f}%")
    
    # Save as V2
    new_model_path = 'models/risk_classifier_v2.json'
    frontend_model_path = '../src/utils/models/risk_classifier_v2.json'
    
    clf.save_model(new_model_path)
    clf.save_model(frontend_model_path)
    
    print(f"Successfully saved combined model to {new_model_path}!")

if __name__ == '__main__':
    main()
