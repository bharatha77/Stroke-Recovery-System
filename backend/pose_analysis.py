# pose_analysis.py
import mediapipe as mp
import numpy as np
import time

class PoseAnalyzer:
    """
    MediaPipe Pose analyzer that computes per-frame biomechanics for both arms from landmark data.
    This version is adapted to process pre-collected landmark data instead of live video frames.
    """

    def __init__(self, ema_alpha=0.35):
        self.mp_pose = mp.solutions.pose

        # EMA smoothing for coordinates
        self.ema_alpha = ema_alpha
        self.ema = {
            "L_sh": None, "L_el": None, "L_wr": None,
            "R_sh": None, "R_el": None, "R_wr": None
        }

        # for velocity and smoothness calculation
        self.prev_time = None
        self.prev_coords = {"L_sh": None, "R_sh": None}
        self.prev_vel = {"L_sh": np.array([0,0]), "R_sh": np.array([0,0])}
        self.prev_acc = {"L_sh": np.array([0,0]), "R_sh": np.array([0,0])}
        self.prev_angles = {"L_elbow": None, "R_elbow": None} # For angular velocity

    def _apply_ema(self, curr, prev):
        if prev is None:
            return np.array(curr, dtype=float)
        return np.array([
            self.ema_alpha * float(curr[0]) + (1 - self.ema_alpha) * float(prev[0]),
            self.ema_alpha * float(curr[1]) + (1 - self.ema_alpha) * float(prev[1])
        ], dtype=float)

    def _angle_deg(self, a, b, c):
        a = np.array(a, dtype=float)
        b = np.array(b, dtype=float)
        c = np.array(c, dtype=float)
        ba = a - b
        bc = c - b
        denom = (np.linalg.norm(ba) * np.linalg.norm(bc)) + 1e-8
        cosang = np.clip(np.dot(ba, bc) / denom, -1.0, 1.0)
        return float(np.degrees(np.arccos(cosang)))

    def process_landmarks(self, landmarks, timestamp):
        """
        Input: A single frame of pose landmarks and a timestamp.
        Output: A dictionary of calculated features for this frame.
        """
        now = timestamp
        
        # Default feature dictionary
        features = {
            "Lelbowangle": 0.0, "Relbowangle": 0.0,
            "Lshoulderangle": 0.0, "Rshoulderangle": 0.0,
            "Lshoulderspeed": 0.0, "Rshoulderspeed": 0.0,
            "Langlevel": 0.0, "Ranglevel": 0.0,
            "Lsmoothness": 0.0, "Rsmoothness": 0.0,
            "Lshoulderspeednorm": 0.0, "Rshoulderspeednorm": 0.0
        }

        if not landmarks:
            return features

        lm = landmarks

        # We only need the x and y for 2D calculations
        L_sh = (lm[11]['x'], lm[11]['y'])
        L_el = (lm[13]['x'], lm[13]['y'])
        L_wr = (lm[15]['x'], lm[15]['y'])

        R_sh = (lm[12]['x'], lm[12]['y'])
        R_el = (lm[14]['x'], lm[14]['y'])
        R_wr = (lm[16]['x'], lm[16]['y'])

        # EMA smoothing
        self.ema["L_sh"] = self._apply_ema(L_sh, self.ema["L_sh"])
        self.ema["L_el"] = self._apply_ema(L_el, self.ema["L_el"])
        self.ema["L_wr"] = self._apply_ema(L_wr, self.ema["L_wr"])
        self.ema["R_sh"] = self._apply_ema(R_sh, self.ema["R_sh"])
        self.ema["R_el"] = self._apply_ema(R_el, self.ema["R_el"])
        self.ema["R_wr"] = self._apply_ema(R_wr, self.ema["R_wr"])

        # Angles
        L_elbow_angle = self._angle_deg(self.ema["L_sh"], self.ema["L_el"], self.ema["L_wr"])
        R_elbow_angle = self._angle_deg(self.ema["R_sh"], self.ema["R_el"], self.ema["R_wr"])
        L_shoulder_angle = self._angle_deg(self.ema["L_el"], self.ema["L_sh"], self.ema["L_wr"])
        R_shoulder_angle = self._angle_deg(self.ema["R_el"], self.ema["R_sh"], self.ema["R_wr"])

        # Speed, Acceleration, and Jerk (Smoothness)
        L_sh_speed, R_sh_speed, L_jerk, R_jerk = 0.0, 0.0, 0.0, 0.0

        if self.prev_time is not None:
            dt = (now - self.prev_time) / 1000.0  # Convert ms to seconds
            if dt > 1e-6:
                # Velocities
                L_sh_vel = (self.ema["L_sh"] - self.prev_coords["L_sh"]) / dt
                R_sh_vel = (self.ema["R_sh"] - self.prev_coords["R_sh"]) / dt
                L_sh_speed = np.linalg.norm(L_sh_vel)
                R_sh_speed = np.linalg.norm(R_sh_vel)
                # Accelerations
                L_sh_acc = (L_sh_vel - self.prev_vel["L_sh"]) / dt
                R_sh_acc = (R_sh_vel - self.prev_vel["R_sh"]) / dt
                # Jerk (magnitude of change in acceleration) - THIS IS OUR NEW SMOOTHNESS
                L_jerk = np.linalg.norm((L_sh_acc - self.prev_acc["L_sh"]) / dt)
                R_jerk = np.linalg.norm((R_sh_acc - self.prev_acc["R_sh"]) / dt)
                # Update previous values
                self.prev_vel = {"L_sh": L_sh_vel, "R_sh": R_sh_vel}
                self.prev_acc = {"L_sh": L_sh_acc, "R_sh": R_sh_acc}

        # Elbow angular velocity (deg/sec)
        L_angle_vel, R_angle_vel = 0.0, 0.0
        if self.prev_time is not None and self.prev_angles["L_elbow"] is not None:
            dt = (now - self.prev_time) / 1000.0 # Convert ms to seconds
            if dt > 1e-6:
                L_angle_vel = abs(L_elbow_angle - self.prev_angles["L_elbow"]) / dt
                R_angle_vel = abs(R_elbow_angle - self.prev_angles["R_elbow"]) / dt

        # Fill features dictionary
        features.update({
            "Lelbowangle": float(L_elbow_angle), "Relbowangle": float(R_elbow_angle),
            "Lshoulderangle": float(L_shoulder_angle), "Rshoulderangle": float(R_shoulder_angle),
            "Lshoulderspeed": float(L_sh_speed), "Rshoulderspeed": float(R_sh_speed),
            "Langlevel": float(L_angle_vel), "Ranglevel": float(R_angle_vel), 
            "Lsmoothness": float(L_jerk), "Rsmoothness": float(R_jerk),
            # Normalized speed (speed relative to a body size proxy)
            "Lshoulderspeednorm": float(L_sh_speed / (np.linalg.norm(self.ema["L_sh"] - self.ema["R_sh"]) + 1e-8)),
            "Rshoulderspeednorm": float(R_sh_speed / (np.linalg.norm(self.ema["L_sh"] - self.ema["R_sh"]) + 1e-8))
        })

        # Store previous states for next frame calculation
        self.prev_coords["L_sh"] = self.ema["L_sh"]
        self.prev_coords["R_sh"] = self.ema["R_sh"]
        self.prev_angles["L_elbow"] = L_elbow_angle
        self.prev_angles["R_elbow"] = R_elbow_angle
        self.prev_time = now

        return features