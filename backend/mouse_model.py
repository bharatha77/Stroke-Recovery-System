import joblib
import numpy as np
import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent

# Paths
MODEL_PATH = BASE_DIR / "models" / "dragdrop_model.joblib"
mouse_model = joblib.load(MODEL_PATH)

# Define the exact feature order the model was trained on.
EXPECTED_FEATURES = [
    # Keystroke Features (8)
    'Errors',
    'CorrectionBehavior',
    'TypingSpeed_WPM',
    'TypingSpeed_CPM',
    'AverageDwellTime',
    'AverageFlightTime',
    'Consistency',
    'AccuracyScore',
    # Mouse Features (8)
    'distance_error',
    'time_taken_ms',
    'path_length_px',
    'path_efficiency',
    'movement_jerk',
    'log_movement_jerk',
    'aiming_error',
    'task_type',
    # Add the 17th feature based on common ML practices, often a ratio or interaction
    'IdleTime_Ratio' # This is a likely candidate from your features.txt
]

def predict_mouse(features: dict):
    try:
        if not features:
            print("❌ No mouse features received.")
            return None

        print("➡️ Mouse features received:", features)
        # Create the feature vector in the correct order.
        feature_vector = [features.get(f, 0) for f in EXPECTED_FEATURES]
        X = np.array([feature_vector], dtype=float)
        print("✅ Mouse input shape:", X.shape)

        y_pred = mouse_model.predict(X)
        print("✅ Mouse prediction:", y_pred)

        return float(y_pred[0])

    except Exception as e:
        print("⚠️ Mouse prediction error:", e)
        return None
