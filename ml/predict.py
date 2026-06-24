import sys
import os
import json
import math
import joblib
import numpy as np

CENTER_LAT = 12.9778722
CENTER_LNG = 77.5705353

def calculate_bearing(lat1, lng1, lat2, lng2):
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    d_lng_rad = math.radians(lng2 - lng1)
    y = math.sin(d_lng_rad) * math.cos(lat2_rad)
    x = math.cos(lat1_rad) * math.sin(lat2_rad) - math.sin(lat1_rad) * math.cos(lat2_rad) * math.cos(d_lng_rad)
    return (math.degrees(math.atan2(y, x)) + 360) % 360

def haversine_distance(lat1, lng1, lat2, lng2):
    R = 6371.0
    lat1_rad = math.radians(lat1)
    lng1_rad = math.radians(lng1)
    lat2_rad = math.radians(lat2)
    lng2_rad = math.radians(lng2)
    d_lat = lat2_rad - lat1_rad
    d_lng = lng2_rad - lng1_rad
    a = math.sin(d_lat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(d_lng / 2)**2
    return R * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))

def heuristic_fallback(pickup_lat, pickup_lng, distance_km, hour, day_of_week):
    """Deterministic fallback estimation in case serialized model files are missing."""
    # Base estimated overcharge
    overcharge = 15.0

    # Night hours markup
    if hour >= 22 or hour <= 5:
        overcharge += 50.0
    elif hour >= 17 and hour <= 20:  # Peak evening
        overcharge += 25.0

    # Weekends markup
    if day_of_week >= 5:
        overcharge += 15.0

    # High-dispute hubs markup
    indiranagar_dist = haversine_distance(pickup_lat, pickup_lng, 12.9718, 77.6411)
    majestic_dist = haversine_distance(pickup_lat, pickup_lng, CENTER_LAT, CENTER_LNG)
    if indiranagar_dist < 2.5 or majestic_dist < 2.0:
        overcharge += 45.0

    # Scaling markup based on total distance
    overcharge += min(distance_km * 2.0, 30.0)

    return overcharge

def main():
    if len(sys.argv) < 8:
        print(json.dumps({
            "error": "Insufficient arguments. Expected: pickup_lat pickup_lng drop_lat drop_lng distance_km hour day_of_week",
            "predicted_overcharge": 0.0
        }))
        sys.exit(1)

    # BUG-01 FIX: was `try {` (JavaScript syntax) — Python requires `try:`
    try:
        pickup_lat = float(sys.argv[1])
        pickup_lng = float(sys.argv[2])
        drop_lat = float(sys.argv[3])
        drop_lng = float(sys.argv[4])
        distance_km = float(sys.argv[5])
        hour = int(sys.argv[6])
        day_of_week = int(sys.argv[7])
    except ValueError:
        print(json.dumps({
            "error": "Invalid argument formats. Coordinates and distance must be floats, hour and day must be integers.",
            "predicted_overcharge": 0.0
        }))
        sys.exit(1)

    model_path = os.path.join("ml", "model.joblib")
    scaler_path = os.path.join("ml", "scaler.joblib")

    # If model hasn't been compiled yet, use heuristic math fallback
    if not os.path.exists(model_path) or not os.path.exists(scaler_path):
        fallback = heuristic_fallback(pickup_lat, pickup_lng, distance_km, hour, day_of_week)
        print(json.dumps({
            "predicted_overcharge": round(fallback, 2),
            "source": "heuristic_fallback"
        }))
        sys.exit(0)

    try:
        model = joblib.load(model_path)
        scaler = joblib.load(scaler_path)

        # Calculate engineered features
        bearing = calculate_bearing(pickup_lat, pickup_lng, drop_lat, drop_lng)
        dist_to_center = haversine_distance(pickup_lat, pickup_lng, CENTER_LAT, CENTER_LNG)

        # Formulate feature vector
        features = np.array([[
            pickup_lat, pickup_lng,
            drop_lat, drop_lng,
            distance_km,
            hour,
            day_of_week,
            bearing,
            dist_to_center
        ]])

        features_scaled = scaler.transform(features)
        prediction = model.predict(features_scaled)[0]

        # Overcharge cannot be negative
        predicted_overcharge = max(0.0, float(prediction))

        print(json.dumps({
            "predicted_overcharge": round(predicted_overcharge, 2),
            "source": "xgboost_model"
        }))
    except Exception as e:
        # Final safety net
        fallback = heuristic_fallback(pickup_lat, pickup_lng, distance_km, hour, day_of_week)
        print(json.dumps({
            "predicted_overcharge": round(fallback, 2),
            "source": "heuristic_fallback_error",
            "details": str(e)
        }))

if __name__ == "__main__":
    main()
