import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import axios from "axios";
import {
  Card,
  Grid,
  Typography,
  TextField,
  Button,
  Snackbar,
  Box,
  CircularProgress,
} from "@mui/material";
import {
  Holistic,
  POSE_CONNECTIONS,
  HAND_CONNECTIONS,
  FACEMESH_TESSELATION,
} from "@mediapipe/holistic";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";

// ✅ Full list of features (must match backend exactly)
const featureKeys = [
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
  'shoulder_speed_std_LR_diff', 'shoulder_speed_std_LR_ratio', 'sparc_smoothness_LR_diff', 'sparc_smoothness_LR_ratio',
  // 👁️ Extra visual motion cues (already computed)
  'L_hand_speed_mean', 'R_hand_speed_mean', 'eye_blink_ratio_mean', 'lip_distance_mean'
];

const calculateAngle = (A, B, C) => {
  const AB = [A.x - B.x, A.y - B.y, A.z - B.z];
  const CB = [C.x - B.x, C.y - B.y, C.z - B.z];
  const dot = AB[0] * CB[0] + AB[1] * CB[1] + AB[2] * CB[2];
  const magAB = Math.sqrt(AB[0] ** 2 + AB[1] ** 2 + AB[2] ** 2);
  const magCB = Math.sqrt(CB[0] ** 2 + CB[1] ** 2 + CB[2] ** 2);
  const cosAngle = dot / (magAB * magCB);
  const angle = Math.acos(Math.min(Math.max(cosAngle, -1), 1));
  return (angle * 180) / Math.PI;
};

const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b) / arr.length : 0);
const std = (arr) =>
  arr.length
    ? Math.sqrt(arr.map((x) => Math.pow(x - mean(arr), 2)).reduce((a, b) => a + b) / arr.length)
    : 0;

function WebcamPanel({onDataChange}) {
  const webcamRef = useRef();
  const canvasRef = useRef();
  const holisticRef = useRef();
  const animationFrameRef = useRef();

  const [features, setFeatures] = useState(Object.fromEntries(featureKeys.map((f) => [f, 0])));
  const [recording, setRecording] = useState(false);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const L_elbow_angles = useRef([]);
  const R_elbow_angles = useRef([]);
  const L_shoulder_angles = useRef([]);
  const R_shoulder_angles = useRef([]);
  const L_hand_speeds = useRef([]);
  const R_hand_speeds = useRef([]);
  const eye_ratios = useRef([]);
  const lip_dists = useRef([]);
  const prevPose = useRef(null);
  const prevTime = useRef(null);

  // === Start / Stop Holistic ===
  useEffect(() => {
    if (recording) startHolistic();
    else stopHolistic();
    return () => stopHolistic();
  }, [recording]);

  const startHolistic = () => {
    holisticRef.current = new Holistic({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`,
    });
    holisticRef.current.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });
    holisticRef.current.onResults(onResults);

    const loop = async () => {
      if (webcamRef.current?.video && holisticRef.current) {
        await holisticRef.current.send({ image: webcamRef.current.video });
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    };
    loop();
  };

  const stopHolistic = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (holisticRef.current) holisticRef.current.close();
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  // === Main Mediapipe Results ===
  const onResults = (results) => {
    const video = webcamRef.current.video;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Draw pose, hands, face
    drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: "#00FF00", lineWidth: 2 });
    drawLandmarks(ctx, results.poseLandmarks, { color: "#FF0000", lineWidth: 1 });
    drawConnectors(ctx, results.leftHandLandmarks, HAND_CONNECTIONS, { color: "#00FFFF" });
    drawConnectors(ctx, results.rightHandLandmarks, HAND_CONNECTIONS, { color: "#FF00FF" });
    drawConnectors(ctx, results.faceLandmarks, FACEMESH_TESSELATION, { color: "#AAAAAA", lineWidth: 0.5 });
    ctx.restore();

    const pose = results.poseLandmarks;
    if (!pose) return;

    // === Arm Angles ===
    const L_elbow = calculateAngle(pose[15], pose[13], pose[11]);
    const R_elbow = calculateAngle(pose[16], pose[14], pose[12]);
    const L_shoulder = calculateAngle(pose[13], pose[11], pose[23]);
    const R_shoulder = calculateAngle(pose[14], pose[12], pose[24]);
    L_elbow_angles.current.push(L_elbow);
    R_elbow_angles.current.push(R_elbow);
    L_shoulder_angles.current.push(L_shoulder);
    R_shoulder_angles.current.push(R_shoulder);

    // === Hand Speeds ===
    let L_speed = 0,
      R_speed = 0;
    const now = Date.now();
    if (prevPose.current && prevTime.current) {
      const dt = (now - prevTime.current) / 1000;
      const L_dist = Math.sqrt(
        (pose[15].x - prevPose.current[15].x) ** 2 +
          (pose[15].y - prevPose.current[15].y) ** 2
      );
      const R_dist = Math.sqrt(
        (pose[16].x - prevPose.current[16].x) ** 2 +
          (pose[16].y - prevPose.current[16].y) ** 2
      );
      L_speed = L_dist / dt;
      R_speed = R_dist / dt;
    }
    prevPose.current = pose;
    prevTime.current = now;
    L_hand_speeds.current.push(L_speed);
    R_hand_speeds.current.push(R_speed);

    // === Eyes and Lips ===
    const face = results.faceLandmarks;
    if (face) {
      const leftEyeTop = face[159];
      const leftEyeBottom = face[145];
      const leftEyeLeft = face[33];
      const leftEyeRight = face[133];
      const eye_vert = Math.sqrt(
        (leftEyeTop.x - leftEyeBottom.x) ** 2 + (leftEyeTop.y - leftEyeBottom.y) ** 2
      );
      const eye_horz = Math.sqrt(
        (leftEyeLeft.x - leftEyeRight.x) ** 2 + (leftEyeLeft.y - leftEyeRight.y) ** 2
      );
      const eye_ratio = eye_vert / eye_horz;
      eye_ratios.current.push(eye_ratio);

      const upperLip = face[13];
      const lowerLip = face[14];
      const lip_dist = Math.sqrt(
        (upperLip.x - lowerLip.x) ** 2 + (upperLip.y - lowerLip.y) ** 2
      );
      lip_dists.current.push(lip_dist);
    }

    // === Update subset of features (others remain 0) ===
    setFeatures((f) => ({
      ...f,
      L_elbow_angle_mean: mean(L_elbow_angles.current).toFixed(3),
      L_elbow_angle_std: std(L_elbow_angles.current).toFixed(3),
      L_shoulder_angle_mean: mean(L_shoulder_angles.current).toFixed(3),
      L_shoulder_angle_std: std(L_shoulder_angles.current).toFixed(3),
      R_elbow_angle_mean: mean(R_elbow_angles.current).toFixed(3),
      R_elbow_angle_std: std(R_elbow_angles.current).toFixed(3),
      R_shoulder_angle_mean: mean(R_shoulder_angles.current).toFixed(3),
      R_shoulder_angle_std: std(R_shoulder_angles.current).toFixed(3),
      L_hand_speed_mean: mean(L_hand_speeds.current).toFixed(3),
      R_hand_speed_mean: mean(R_hand_speeds.current).toFixed(3),
      eye_blink_ratio_mean: mean(eye_ratios.current).toFixed(3),
      lip_distance_mean: mean(lip_dists.current).toFixed(3),
    }));
  };

  const handleSubmit = async () => {
  setLoading(true);
  try {
    // --- Compute extended features ---
    const L_elbow_vals = L_elbow_angles.current;
    const R_elbow_vals = R_elbow_angles.current;
    const L_shoulder_vals = L_shoulder_angles.current;
    const R_shoulder_vals = R_shoulder_angles.current;
    const L_speed_vals = L_hand_speeds.current;
    const R_speed_vals = R_hand_speeds.current;

    const safeStats = (arr) => {
      if (!arr.length) return { mean: 0, std: 0, max: 0, min: 0, range: 0 };
      const m = mean(arr);
      const s = std(arr);
      const mx = Math.max(...arr);
      const mn = Math.min(...arr);
      return { mean: m, std: s, max: mx, min: mn, range: mx - mn };
    };

    const L_elbow = safeStats(L_elbow_vals);
    const R_elbow = safeStats(R_elbow_vals);
    const L_shoulder = safeStats(L_shoulder_vals);
    const R_shoulder = safeStats(R_shoulder_vals);
    const L_shoulder_speed = safeStats(L_speed_vals);
    const R_shoulder_speed = safeStats(R_speed_vals);

    // Smoothness & velocity placeholders (need raw angle deltas)
    const L_angle_vel = safeStats([]);
    const R_angle_vel = safeStats([]);
    const L_smoothness = safeStats([]);
    const R_smoothness = safeStats([]);
    const L_shoulder_speed_norm = safeStats([]);
    const R_shoulder_speed_norm = safeStats([]);

    // Derived metrics (ROM, diff/ratio)
    const L_elbow_rom = L_elbow.range;
    const R_elbow_rom = R_elbow.range;
    const L_sparc_smoothness = 0;
    const R_sparc_smoothness = 0;

    const diff = (a, b) => a - b;
    const ratio = (a, b) => (b === 0 ? 0 : a / b);

    // --- Construct all expected features ---
    const allFeatures = {
      // Left arm
      L_elbow_angle_mean: L_elbow.mean,
      L_elbow_angle_std: L_elbow.std,
      L_elbow_angle_max: L_elbow.max,
      L_elbow_angle_min: L_elbow.min,
      L_elbow_angle_range: L_elbow.range,
      L_shoulder_angle_mean: L_shoulder.mean,
      L_shoulder_angle_std: L_shoulder.std,
      L_shoulder_angle_max: L_shoulder.max,
      L_shoulder_angle_min: L_shoulder.min,
      L_shoulder_angle_range: L_shoulder.range,
      L_shoulder_speed_mean: L_shoulder_speed.mean,
      L_shoulder_speed_std: L_shoulder_speed.std,
      L_shoulder_speed_max: L_shoulder_speed.max,
      L_shoulder_speed_min: L_shoulder_speed.min,
      L_shoulder_speed_range: L_shoulder_speed.range,
      L_angle_vel_mean: L_angle_vel.mean,
      L_angle_vel_std: L_angle_vel.std,
      L_angle_vel_max: L_angle_vel.max,
      L_angle_vel_min: L_angle_vel.min,
      L_angle_vel_range: L_angle_vel.range,
      L_smoothness_mean: L_smoothness.mean,
      L_smoothness_std: L_smoothness.std,
      L_smoothness_max: L_smoothness.max,
      L_smoothness_min: L_smoothness.min,
      L_smoothness_range: L_smoothness.range,
      L_shoulder_speed_norm_mean: L_shoulder_speed_norm.mean,
      L_shoulder_speed_norm_std: L_shoulder_speed_norm.std,

      // Right arm
      R_elbow_angle_mean: R_elbow.mean,
      R_elbow_angle_std: R_elbow.std,
      R_elbow_angle_max: R_elbow.max,
      R_elbow_angle_min: R_elbow.min,
      R_elbow_angle_range: R_elbow.range,
      R_shoulder_angle_mean: R_shoulder.mean,
      R_shoulder_angle_std: R_shoulder.std,
      R_shoulder_angle_max: R_shoulder.max,
      R_shoulder_angle_min: R_shoulder.min,
      R_shoulder_angle_range: R_shoulder.range,
      R_shoulder_speed_mean: R_shoulder_speed.mean,
      R_shoulder_speed_std: R_shoulder_speed.std,
      R_shoulder_speed_max: R_shoulder_speed.max,
      R_shoulder_speed_min: R_shoulder_speed.min,
      R_shoulder_speed_range: R_shoulder_speed.range,
      R_angle_vel_mean: R_angle_vel.mean,
      R_angle_vel_std: R_angle_vel.std,
      R_angle_vel_max: R_angle_vel.max,
      R_angle_vel_min: R_angle_vel.min,
      R_angle_vel_range: R_angle_vel.range,
      R_smoothness_mean: R_smoothness.mean,
      R_smoothness_std: R_smoothness.std,
      R_smoothness_max: R_smoothness.max,
      R_smoothness_min: R_smoothness.min,
      R_smoothness_range: R_smoothness.range,
      R_shoulder_speed_norm_mean: R_shoulder_speed_norm.mean,
      R_shoulder_speed_norm_std: R_shoulder_speed_norm.std,

      // Extra metrics
      L_sparc_smoothness,
      R_sparc_smoothness,
      L_elbow_rom,
      R_elbow_rom,

      elbow_angle_mean_LR_diff: diff(L_elbow.mean, R_elbow.mean),
      elbow_angle_mean_LR_ratio: ratio(L_elbow.mean, R_elbow.mean),
      shoulder_angle_mean_LR_diff: diff(L_shoulder.mean, R_shoulder.mean),
      shoulder_angle_mean_LR_ratio: ratio(L_shoulder.mean, R_shoulder.mean),
      shoulder_speed_mean_LR_diff: diff(L_shoulder_speed.mean, R_shoulder_speed.mean),
      shoulder_speed_mean_LR_ratio: ratio(L_shoulder_speed.mean, R_shoulder_speed.mean),
      smoothness_mean_LR_diff: diff(L_smoothness.mean, R_smoothness.mean),
      smoothness_mean_LR_ratio: ratio(L_smoothness.mean, R_smoothness.mean),
      angle_vel_mean_LR_diff: diff(L_angle_vel.mean, R_angle_vel.mean),
      angle_vel_mean_LR_ratio: ratio(L_angle_vel.mean, R_angle_vel.mean),
      shoulder_speed_norm_mean_LR_diff: diff(L_shoulder_speed_norm.mean, R_shoulder_speed_norm.mean),
      shoulder_speed_norm_mean_LR_ratio: ratio(L_shoulder_speed_norm.mean, R_shoulder_speed_norm.mean),
      elbow_angle_std_LR_diff: diff(L_elbow.std, R_elbow.std),
      elbow_angle_std_LR_ratio: ratio(L_elbow.std, R_elbow.std),
      shoulder_angle_std_LR_diff: diff(L_shoulder.std, R_shoulder.std),
      shoulder_angle_std_LR_ratio: ratio(L_shoulder.std, R_shoulder.std),
      shoulder_speed_std_LR_diff: diff(L_shoulder_speed.std, R_shoulder_speed.std),
      shoulder_speed_std_LR_ratio: ratio(L_shoulder_speed.std, R_shoulder_speed.std),
      sparc_smoothness_LR_diff: diff(L_sparc_smoothness, R_sparc_smoothness),
      sparc_smoothness_LR_ratio: ratio(L_sparc_smoothness, R_sparc_smoothness),

      // Existing ones
      L_hand_speed_mean: L_shoulder_speed.mean,
      R_hand_speed_mean: R_shoulder_speed.mean,
      eye_blink_ratio_mean: mean(eye_ratios.current),
      lip_distance_mean: mean(lip_dists.current),
    };

    // --- Send cleaned features ---
    const clean = Object.fromEntries(
      Object.entries(allFeatures).map(([k, v]) => [k, parseFloat(v) || 0])
    );

    const res = await axios.post("http://127.0.0.1:8000/predict/webcam", clean);
    setOutput(JSON.stringify(res.data, null, 2));
    // <p>{JSON.stringify(res.data, null, 2)}</p>
    const score = res.data.webcam_score;
    const web_class = res.data.webcam_class;  // Extract the class property specifically

    localStorage.setItem("Webcam_score", JSON.stringify(score));

// Convert the webcam_class object to JSON string before storing
    localStorage.setItem("Webcam_class", JSON.stringify(web_class));


    setOpen(true);
    if (onDataChange) {
  onDataChange({
    predictedScore: score,
    webcam_class: web_class,
    // Optionally send all extracted features if needed:
  });
}
  } catch (err) {
    console.error(err);
    setOutput("Error: " + err.message);
    setOpen(true);
  } finally {
    setLoading(false);
  }
};


  return (
    <Box sx={{ maxWidth: 700, m: "auto", p: 2 }}>
      <Card sx={{ p: 3 }}>
        <Typography variant="h5">🧠 Stroke Recovery Tracker (Upper-body)</Typography>

        <Box sx={{ position: "relative", width: "100%", height: 480, my: 2 }}>
          <Webcam
            ref={webcamRef}
            style={{
              width: "100%",
              height: 480,
              borderRadius: 10,
              visibility: "hidden",
              position: "absolute",
            }}
            videoConstraints={{ width: 640, height: 480, facingMode: "user" }}
          />
          <canvas
            ref={canvasRef}
            style={{
              width: "100%",
              height: 480,
              position: "absolute",
              top: 0,
              left: 0,
            }}
          />
        </Box>

        {!recording ? (
          <Button fullWidth variant="contained" onClick={() => setRecording(true)} sx={{ my: 2 }}>
            Start Tracking
          </Button>
        ) : (
          <Button fullWidth variant="contained" color="error" onClick={() => setRecording(false)} sx={{ my: 2 }}>
            Stop Tracking
          </Button>
        )}

        <Grid container spacing={2}>
          {featureKeys.map((key) => (
            <Grid item xs={6} key={key}>
              <TextField label={key} value={features[key]} InputProps={{ readOnly: true }} fullWidth size="small" />
            </Grid>
          ))}
        </Grid>

        <Button
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : "Send to Model"}
        </Button>

        <Snackbar
          open={open}
          autoHideDuration={6000}
          onClose={() => setOpen(false)}
          message={output || ""}
        />
      </Card>
    </Box>
  );
}

export default WebcamPanel;
