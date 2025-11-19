import numpy as np
import joblib
import pandas as pd
from pathlib import Path

try:
    from .pose_analysis import PoseAnalyzer
except ImportError:
    from pose_analysis import PoseAnalyzer


class WebcamModel:
    FEATURE_NAMES = [
        'L_elbow_angle_mean', 'L_elbow_angle_std', 'L_elbow_angle_max', 'L_elbow_angle_min', 'L_elbow_angle_range',
        'L_shoulder_angle_mean', 'L_shoulder_angle_std', 'L_shoulder_angle_max', 'L_shoulder_angle_min', 'L_shoulder_angle_range',
        'L_shoulder_speed_mean', 'L_shoulder_speed_std', 'L_shoulder_speed_max', 'L_shoulder_speed_min', 'L_shoulder_speed_range',
        'L_angle_vel_mean', 'L_angle_vel_std', 'L_angle_vel_max', 'L_angle_vel_min', 'L_angle_vel_range',
        'L_smoothness_mean', 'L_smoothness_std', 'L_smoothness_max', 'L_smoothness_min', 'L_smoothness_range',
        'L_shoulder_speed_norm_mean', 'L_shoulder_speed_norm_std',
        'R_elbow_angle_mean', 'R_elbow_angle_std', 'R_elbow_angle_max', 'R_elbow_angle_min', 'R_elbow_angle_range',
        'R_shoulder_angle_mean', 'R_shoulder_angle_std', 'R_shoulder_angle_max', 'R_shoulder_angle_min', 'R_shoulder_angle_range',
        'R_shoulder_speed_mean', 'R_shoulder_speed_std', 'R_shoulder_speed_max', 'R_shoulder_speed_min', 'R_shoulder_speed_range',
        'R_angle_vel_mean', 'R_angle_vel_std', 'R_angle_vel_max', 'R_angle_vel_min', 'R_angle_vel_range',
        'R_smoothness_mean', 'R_smoothness_std', 'R_smoothness_max', 'R_smoothness_min', 'R_smoothness_range',
        'R_shoulder_speed_norm_mean', 'R_shoulder_speed_norm_std',
        'L_sparc_smoothness', 'R_sparc_smoothness', 'L_elbow_rom', 'R_elbow_rom',
        'elbow_angle_mean_LR_diff', 'elbow_angle_mean_LR_ratio', 'shoulder_angle_mean_LR_diff', 'shoulder_angle_mean_LR_ratio',
        'shoulder_speed_mean_LR_diff', 'shoulder_speed_mean_LR_ratio', 'smoothness_mean_LR_diff', 'smoothness_mean_LR_ratio',
        'angle_vel_mean_LR_diff', 'angle_vel_mean_LR_ratio', 'shoulder_speed_norm_mean_LR_diff', 'shoulder_speed_norm_mean_LR_ratio',
        'elbow_angle_std_LR_diff', 'elbow_angle_std_LR_ratio', 'shoulder_angle_std_LR_diff', 'shoulder_angle_std_LR_ratio',
        'shoulder_speed_std_LR_diff', 'shoulder_speed_std_LR_ratio', 'sparc_smoothness_LR_diff', 'sparc_smoothness_LR_ratio'
    ]

    def __init__(self):
        BASE_DIR = Path(__file__).resolve().parent
        self.pose_analyzer = PoseAnalyzer()
        self.encoder = joblib.load(BASE_DIR / "models" / "label_encoder_both.pkl")
        self.model_class = joblib.load(BASE_DIR / "models" / "recovery_model_xgb_both.pkl")
        self.model_reg = joblib.load(BASE_DIR / "models" / "recovery_regressor_both.pkl")

        # Access raw models if pipelines are loaded
        self.reg_model = self.model_reg.steps[-1][1] if hasattr(self.model_reg, 'steps') else self.model_reg
        self.class_model = self.model_class.steps[-1][1] if hasattr(self.model_class, 'steps') else self.model_class

        try:
            print("--- Regressor Model ---")
            print("Features expected:", self.FEATURE_NAMES)
            print("Booster attributes:", self.reg_model.get_booster().attributes())
            print("--- Classifier Model ---")
            print("Features expected:", self.FEATURE_NAMES)
            print("Booster attributes:", self.class_model.get_booster().attributes())
            print("--------------------")
        except Exception as e:
            print(f"Could not inspect model attributes: {e}")

    def _create_features_from_landmarks(self, landmark_data: list) -> dict:
        try:
            if not landmark_data or len(landmark_data) < 5:
                print("❌ Not enough landmark data to process.")
                return None

            per_frame_features = []
            for frame_data in landmark_data:
                landmarks = frame_data.get("landmarks")
                timestamp = frame_data.get("timestamp")
                if landmarks and timestamp:
                    frame_features = self.pose_analyzer.process_landmarks(landmarks, timestamp)
                    per_frame_features.append(frame_features)

            if not per_frame_features:
                print("⚠️ Feature extraction from landmarks failed.")
                return None

            df = pd.DataFrame(per_frame_features)
            aggregated_features = {}

            col_map = {
                "Lelbowangle": "L_elbow_angle",
                "Relbowangle": "R_elbow_angle",
                "Lshoulderangle": "L_shoulder_angle",
                "Rshoulderangle": "R_shoulder_angle",
                "Lshoulderspeed": "L_shoulder_speed",
                "Rshoulderspeed": "R_shoulder_speed",
                "Lsmoothness": "L_smoothness",
                "Rsmoothness": "R_smoothness",
                "Lshoulderspeednorm": "L_shoulder_speed_norm",
                "Rshoulderspeednorm": "R_shoulder_speed_norm"
            }

            for src_col, model_col_prefix in col_map.items():
                aggregated_features[f"{model_col_prefix}_mean"] = df[src_col].mean()
                aggregated_features[f"{model_col_prefix}_std"] = df[src_col].std()
                aggregated_features[f"{model_col_prefix}_max"] = df[src_col].max()
                aggregated_features[f"{model_col_prefix}_min"] = df[src_col].min()

            aggregated_features["L_elbow_angle_range"] = aggregated_features["L_elbow_angle_max"] - aggregated_features["L_elbow_angle_min"]
            aggregated_features["R_elbow_angle_range"] = aggregated_features["R_elbow_angle_max"] - aggregated_features["R_elbow_angle_min"]

            aggregated_features["L_smoothness_sparc"] = -np.log(np.mean(df["Lsmoothness"]) + 1e-8)
            aggregated_features["R_smoothness_sparc"] = -np.log(np.mean(df["Rsmoothness"]) + 1e-8)

            aggregated_features["L_elbow_rom"] = aggregated_features["L_elbow_angle_range"]
            aggregated_features["R_elbow_rom"] = aggregated_features["R_elbow_angle_range"]

            aggregated_features["elbow_angle_mean_LR_diff"] = aggregated_features["L_elbow_angle_mean"] - aggregated_features["R_elbow_angle_mean"]
            aggregated_features["elbow_angle_mean_LR_ratio"] = aggregated_features["L_elbow_angle_mean"] / (aggregated_features["R_elbow_angle_mean"] + 1e-8)

            aggregated_features["shoulder_angle_mean_LR_diff"] = aggregated_features["L_shoulder_angle_mean"] - aggregated_features["R_shoulder_angle_mean"]
            aggregated_features["shoulder_angle_mean_LR_ratio"] = aggregated_features["L_shoulder_angle_mean"] / (aggregated_features["R_shoulder_angle_mean"] + 1e-8)

            aggregated_features["shoulder_speed_mean_LR_diff"] = aggregated_features["L_shoulder_speed_mean"] - aggregated_features["R_shoulder_speed_mean"]
            aggregated_features["shoulder_speed_mean_LR_ratio"] = aggregated_features["L_shoulder_speed_mean"] / (aggregated_features["R_shoulder_speed_mean"] + 1e-8)

            aggregated_features["smoothness_mean_LR_diff"] = aggregated_features["L_smoothness_sparc"] - aggregated_features["R_smoothness_sparc"]
            aggregated_features["smoothness_mean_LR_ratio"] = aggregated_features["L_smoothness_sparc"] / (aggregated_features["R_smoothness_sparc"] + 1e-8)

            # Add additional features expected by the model here if needed

            return aggregated_features

        except Exception as e:
            print(f"⚠️ Error during feature creation from landmarks: {e}")
            return None

    def predict(self, features: dict):
        try:
            if "landmark_data" in features:
                aggregated_features = self._create_features_from_landmarks(features["landmark_data"])
                if not aggregated_features:
                    return None
            else:
                aggregated_features = features

            # Debug outputs to verify correct feature matching
            print("Expected features:", self.FEATURE_NAMES)
            print("Input features keys:", list(aggregated_features.keys()))
            print("Input feature values:", [aggregated_features.get(f, None) for f in self.FEATURE_NAMES])

            feature_vector = [aggregated_features.get(f, 0) for f in self.FEATURE_NAMES]
            X = np.array([feature_vector], dtype=float)

            y_class = self.class_model.predict(X)[0]
            y_score = self.reg_model.predict(X)[0]

            class_label = self.encoder.inverse_transform([int(y_class)])[0]

            print(f"📈 Predicted Score: {y_score:.3f}, Class: {class_label}")

            return {
                "recovery_score": float(y_score),
                "class_prediction": str(class_label)
            }

        except Exception as e:
            print(f"⚠️ Webcam prediction error: {e}")
            return None


# Instantiate once to reuse across API calls
_webcam_model_instance = WebcamModel()


def predict_webcam(features: dict):
    """Function to be called by your API endpoint."""
    return _webcam_model_instance.predict(features)
