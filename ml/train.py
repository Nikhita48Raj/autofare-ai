import os
import math
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from xgboost import XGBRegressor
import joblib
from supabase import create_client, Client

# Center of Bengaluru (Majestic KSR Station)
CENTER_LAT = 12.9778722
CENTER_LNG = 77.5705353

def calculate_bearing(lat1, lng1, lat2, lng2):
    """Calculate the bearing (direction) between two points in degrees."""
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    d_lng_rad = math.radians(lng2 - lng1)
    
    y = math.sin(d_lng_rad) * math.cos(lat2_rad)
    x = math.cos(lat1_rad) * math.sin(lat2_rad) - math.sin(lat1_rad) * math.cos(lat2_rad) * math.cos(d_lng_rad)
    
    bearing_rad = math.atan2(y, x)
    bearing_deg = math.degrees(bearing_rad)
    return (bearing_deg + 360) % 360

def haversine_distance(lat1, lng1, lat2, lng2):
    """Calculate the haversine distance between two points in km."""
    R = 6371.0
    lat1_rad = math.radians(lat1)
    lng1_rad = math.radians(lng1)
    lat2_rad = math.radians(lat2)
    lng2_rad = math.radians(lng2)
    
    d_lat = lat2_rad - lat1_rad
    d_lng = lng2_rad - lng1_rad
    
    a = math.sin(d_lat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(d_lng / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def engineer_features(df):
    """Perform spatial and temporal feature engineering."""
    # 1. Calculate bearing of travel
    df["bearing"] = df.apply(
        lambda r: calculate_bearing(r["pickup_lat"], r["pickup_lng"], r["drop_lat"], r["drop_lng"]), 
        axis=1
    )
    
    # 2. Calculate distance of pickup to city center
    df["dist_to_center_km"] = df.apply(
        lambda r: haversine_distance(r["pickup_lat"], r["pickup_lng"], CENTER_LAT, CENTER_LNG), 
        axis=1
    )
    
    return df

def generate_synthetic_data(num_samples=1200):
    """Generate highly realistic synthetic data matching Bengaluru overcharge behaviors."""
    print(f"Generating {num_samples} simulated rides for model training...")
    np.random.seed(42)
    
    # Random pickup locations in Bengaluru bounds
    pickup_lats = np.random.uniform(12.90, 13.05, num_samples)
    pickup_lngs = np.random.uniform(77.50, 77.70, num_samples)
    
    # Generate drops that are 2-22 km away
    distances = np.random.uniform(2, 22, num_samples)
    angles = np.random.uniform(0, 2 * np.pi, num_samples)
    
    # Delta lat/lng approx calculation (1 deg lat ~ 111km, 1 deg lng ~ 108km at Bengaluru lat)
    drop_lats = pickup_lats + (distances * np.sin(angles)) / 111.0
    drop_lngs = pickup_lngs + (distances * np.cos(angles)) / 108.0
    
    hours = np.random.randint(0, 24, num_samples)
    days_of_week = np.random.randint(0, 7, num_samples)
    
    data = []
    for index in range(num_samples):
        p_lat, p_lng = pickup_lats[index], pickup_lngs[index]
        d_lat, d_lng = drop_lats[index], drop_lngs[index]
        dist = distances[index]
        hr = hours[index]
        day = days_of_week[index]
        
        # Calculate government meter fare
        base_fare = 25.0
        dist_fare = 0.0 if dist <= 1.0 else (dist - 1.0) * 16.0
        official = base_fare + dist_fare
        
        # Simulate overcharge
        # 1. Base overcharge fee (standard street bargain markup)
        overcharge = np.random.normal(15, 10)
        
        # 2. Night hour surcharge (refusal or high demands)
        if hr >= 22 or hr <= 5:
            overcharge += np.random.uniform(35, 75)
            
        # 3. Weekend surcharge
        if day >= 5:
            overcharge += np.random.uniform(10, 25)
            
        # 4. Hotspot multiplier (Indiranagar transit center coordinates)
        indiranagar_dist = haversine_distance(p_lat, p_lng, 12.9718, 77.6411)
        majestic_dist = haversine_distance(p_lat, p_lng, CENTER_LAT, CENTER_LNG)
        if indiranagar_dist < 2.5 or majestic_dist < 2.0:
            overcharge += np.random.uniform(40, 85)
            
        # Ensure overcharge is non-negative and add some final noise
        overcharge = max(0.0, overcharge + np.random.normal(0, 8))
        
        data.append({
          "pickup_lat": p_lat,
          "pickup_lng": p_lng,
          "drop_lat": d_lat,
          "drop_lng": d_lng,
          "distance_km": dist,
          "hour": hr,
          "day_of_week": day,
          "official_fare": official,
          "actual_fare": official + overcharge
        })
        
    return pd.DataFrame(data)

def main():
    print("AutoFare ML Model Training Pipeline")
    
    # 1. Load data
    df = None
    
    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    if supabase_url and supabase_key and "your-project" not in supabase_url:
        try:
            print("Connecting to Supabase to fetch live dispute reports...")
            supabase: Client = create_client(supabase_url, supabase_key)
            response = supabase.table("fare_reports").select("*").not_("actual_fare", "is", "null").execute()
            if len(response.data) >= 30:
                print(f"Loaded {len(response.data)} records from database.")
                df = pd.DataFrame(response.data)
                # Keep only necessary fields for training
                df = df[[
                  "pickup_lat", "pickup_lng", "drop_lat", "drop_lng", 
                  "distance_km", "night_surcharge", "official_fare", "actual_fare", "created_at"
                ]]
                # Extract temporal features
                df["created_at"] = pd.to_datetime(df["created_at"])
                df["hour"] = df["created_at"].dt.hour
                df["day_of_week"] = df["created_at"].dt.dayofweek
            else:
                print("Insufficient records in database (minimum 30 required). Falling back to simulated data.")
        except Exception as e:
            print(f"Supabase connection failed: {e}. Falling back to simulated data.")
            
    if df is None:
        df = generate_synthetic_data()

    # 2. Feature Engineering
    print("Engineering spatial features (bearing, proximity to city center)...")
    df = engineer_features(df)
    
    # Target value is the overcharge amount
    df["overcharge_amount"] = df["actual_fare"] - df["official_fare"]
    
    # Define features and label
    feature_cols = [
      "pickup_lat", "pickup_lng", 
      "drop_lat", "drop_lng", 
      "distance_km", 
      "hour", 
      "day_of_week",
      "bearing",
      "dist_to_center_km"
    ]
    
    X = df[feature_cols]
    y = df["overcharge_amount"]
    
    # 3. Train-Test Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # 4. Feature Scaling
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # 5. Train Model
    print("Training XGBoost Regressor model...")
    model = XGBRegressor(
        n_estimators=100,
        learning_rate=0.08,
        max_depth=5,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42
    )
    model.fit(X_train_scaled, y_train)
    
    # Evaluate model
    train_score = model.score(X_train_scaled, y_train)
    test_score = model.score(X_test_scaled, y_test)
    predictions = model.predict(X_test_scaled)
    rmse = np.sqrt(np.mean((predictions - y_test) ** 2))
    
    print(f"Model Training complete.")
    print(f"Train R^2 score: {train_score:.4f}")
    print(f"Test R^2 score: {test_score:.4f}")
    print(f"Model Test RMSE: Rs. {rmse:.2f}")
    
    # 6. Save Pipeline artifacts
    os.makedirs("ml", exist_ok=True)
    joblib.dump(model, "ml/model.joblib")
    joblib.dump(scaler, "ml/scaler.joblib")
    print("Saved pipeline artifacts: ml/model.joblib, ml/scaler.joblib")

if __name__ == "__main__":
    main()
