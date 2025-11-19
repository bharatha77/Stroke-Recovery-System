import joblib
import numpy as np
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# Paths
MODEL_PATH = BASE_DIR / "models" / "keystroke.joblib"
model = joblib.load(MODEL_PATH)
print(getattr(model, 'feature_names_in_', 'No feature names stored'))

keystroke_model = joblib.load(MODEL_PATH)

# Define the exact feature order the model was trained on.
EXPECTED_FEATURES = [
    'Errors', 
    'CorrectionBehavior', 
    'TypingSpeed_WPM', 
    'TypingSpeed_CPM', 
    'AverageDwellTime', 
    'AverageFlightTime', 
    'Consistency',
    'AccuracyScore'
]

def predict_keystroke(features: dict):
    try:
        if not features:
            print("❌ No keystroke features received.")
            return None

        print("➡️ Keystroke features received:", features)

        # Create the feature vector in the correct order.
        # Use features.get(f, 0) to provide a default value if a feature is missing.
        feature_vector = [features.get(f, 0) for f in EXPECTED_FEATURES]
        X = np.array([feature_vector], dtype=float)
        print("✅ Keystroke input shape:", X.shape)

        y_pred = keystroke_model.predict(X)

        print("✅ Keystroke prediction:", y_pred)
        return float(y_pred[0])

    except Exception as e:
        print("⚠️ Keystroke prediction error:", e)
        return None
