import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error
import os

def main():
    print("Loading synthetic dataset...")
    try:
        df = pd.read_csv('sample data/synthetic_recommendations.csv')
    except FileNotFoundError:
        print("Error: sample data/synthetic_recommendations.csv not found.")
        print("Please run generate_recommender_data.py first.")
        return

    X = df.drop('target_score', axis=1)
    y = df['target_score']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print("Training XGBoost Recommender Model...")
    recommender = xgb.XGBRegressor(objective='reg:squarederror', n_estimators=200, max_depth=6, learning_rate=0.1)
    recommender.fit(X_train, y_train)

    preds = recommender.predict(X_test)
    rmse = np.sqrt(mean_squared_error(y_test, preds))
    print(f"Recommender RMSE: {rmse:.2f}")

    os.makedirs('models', exist_ok=True)
    recommender.save_model('models/recommender_model.json')
    print("✅ Model trained and saved to models/recommender_model.json!")

if __name__ == '__main__':
    main()
