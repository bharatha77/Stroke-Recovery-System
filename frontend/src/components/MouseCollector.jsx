// MouseTracker.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { FiCircle, FiChevronLeft, FiChevronRight, FiRefreshCw } from "react-icons/fi";

const MouseTracker = ({onDataChange}) => {
  const canvasRef = useRef(null);
  const [path, setPath] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [score, setScore] = useState(null);
  const [finalResult, setFinalResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [task, setTask] = useState("straight");
  const [progress, setProgress] = useState(0);

  const tasks = {
    straight: "Draw a straight line from the green circle to the red circle.",
    circle: "Trace a smooth circle shape starting and ending near the center.",
    zigzag: "Draw a zig-zag line from left to right.",
  };

  const WIDTH = 600,
    HEIGHT = 250;
  const START = { x: 60, y: HEIGHT / 2 };
  const END = { x: WIDTH - 60, y: HEIGHT / 2 };
  const RADIUS = 20;

  // 🖼️ Draw reference shapes and user path
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "#f9fafb";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    if (task === "straight") {
      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.arc(START.x, START.y, RADIUS, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(END.x, END.y, RADIUS, 0, 2 * Math.PI);
      ctx.fill();

      ctx.strokeStyle = "#d1d5db";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(START.x, START.y);
      ctx.lineTo(END.x, END.y);
      ctx.stroke();
    } else if (task === "circle") {
      ctx.strokeStyle = "#d1d5db";
      ctx.beginPath();
      ctx.arc(WIDTH / 2, HEIGHT / 2, 80, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (task === "zigzag") {
      ctx.strokeStyle = "#d1d5db";
      ctx.beginPath();
      for (let x = 60; x <= WIDTH - 60; x += 60) {
        const y = (x / 60) % 2 === 0 ? 80 : 220;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    if (path.length > 1) {
      ctx.strokeStyle = "#374151";
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      path.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    }
  }, [path, task]);

  useEffect(() => {
    draw();
  }, [draw]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, t: performance.now() };
  };

  const handleMouseDown = (e) => {
    setIsDrawing(true);
    setPath([getPos(e)]);
    setStartTime(performance.now());
    setScore(null);
    setFinalResult(null);
    setProgress(0);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    setPath((prev) => [...prev, getPos(e)]);
  };

  const handleMouseUp = () => setIsDrawing(false);

  const resetTask = () => {
    setPath([]);
    setScore(null);
    setFinalResult(null);
    setStartTime(null);
    setProgress(0);
  };

  const switchTask = (selectedTask) => {
    setTask(selectedTask);
    resetTask();
  };

  // ✳️ Handle analyze + send to backend
  const handleAnalyze = async () => {
    if (path.length < 3 || !startTime) {
      alert("Please complete the drawing first!");
      return;
    }

    setAnalyzing(true);
    setProgress(0);

    // Simulate analysis progress
    let prog = 0;
    const interval = setInterval(() => {
      prog += 10;
      setProgress(prog);
      if (prog >= 100) clearInterval(interval);
    }, 80);

    // 🧮 Calculate mouse score locally (replace with your actual logic)
    const distance = Math.sqrt(
      Math.pow(path[path.length - 1].x - path[0].x, 2) +
      Math.pow(path[path.length - 1].y - path[0].y, 2)
    );
    const duration = (path[path.length - 1].t - path[0].t) / 1000; // in seconds
    const smoothness = Math.min(100, (distance / duration).toFixed(2));
    const predictedMouseScore = Math.min(100, Math.max(0, smoothness)); // scaled 0–100

    const localResult = {
      predictedScore: predictedMouseScore.toFixed(2),
      category:
        predictedMouseScore > 80
          ? "🟢 Normal Coordination"
          : predictedMouseScore > 50
          ? "🟡 Mild Control Issues"
          : "🔴 Stroke-like Control Deficit",
    };

    setScore(localResult);
localStorage.setItem("mouse_score", localResult.predictedScore);

// Notify parent Dashboard about prediction
if (onDataChange) {
  onDataChange({
    predictedScore: parseFloat(localResult.predictedScore),
    category: localResult.category,
    // You can add other computed features here if you want
  });
}


    // 📨 Send to backend /predict/all for final combined score
    try {
      const response = await fetch("http://localhost:8000/predict/all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keystroke_score: parseFloat(localStorage.getItem("keystroke_score")) || 0,
          mouse_score: parseFloat(localResult.predictedScore),
          webcam_score: parseFloat(localStorage.getItem("webcam_score")) || 0,
          webcam_class: localStorage.getItem("webcam_class") || "unknown",
        }),
      });

      const backendResult = await response.json();
      console.log("Backend final result:", backendResult);
      setFinalResult(backendResult);
    } catch (err) {
      console.error("Error sending to backend:", err);
      alert("Error connecting to backend.");
    }

    setAnalyzing(false);
    setProgress(100);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto bg-white rounded-3xl shadow-2xl p-8 mt-6 border border-gray-300"
    >
      <h2 className="text-3xl font-extrabold mb-4 text-center text-gray-900 flex items-center justify-center gap-3">
        <FiMouse /> Mouse Interaction Test
      </h2>

      <p className="text-gray-600 text-center max-w-md mx-auto mb-8">{tasks[task]}</p>

      <div className="flex justify-center gap-4 mb-6">
        {Object.keys(tasks).map((t) => (
          <button
            key={t}
            onClick={() => switchTask(t)}
            className={`px-5 py-2 rounded-full font-semibold transition transform hover:scale-105 focus:outline-none ${
              t === task
                ? "bg-indigo-600 text-white shadow-lg"
                : "bg-gray-200 text-gray-700"
            }`}
            aria-pressed={t === task}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="rounded-xl border-4 border-indigo-300 cursor-crosshair shadow-lg"
        />
      </div>

      <div className="mt-8 flex items-center gap-4 justify-center">
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-semibold shadow-lg transition"
        >
          {analyzing ? "Analyzing..." : "Analyze"}
        </button>
        <button
          onClick={resetTask}
          disabled={analyzing}
          className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-lg font-semibold shadow-lg transition"
        >
          <FiRefreshCw className="inline mr-2" /> Reset
        </button>
      </div>

      {analyzing && (
        <div className="mt-6 w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}

      {score && !analyzing && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-50 rounded-2xl p-6 mt-6 border text-center"
        >
          <h3 className="text-xl font-bold text-gray-900">
            Mouse Score: <span className="text-indigo-700">{score.predictedScore}</span>
          </h3>
          <p className="mt-1 text-gray-700">{score.category}</p>
        </motion.div>
      )}

      {finalResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-300 rounded-2xl p-6 mt-6 text-center"
        >
          <h3 className="text-2xl font-bold text-green-700">Final Recovery Result</h3>
          <p className="text-gray-800 mt-2">
            Final Score:{" "}
            <span className="font-semibold text-indigo-800">
              {finalResult.final_score.toFixed(2)}
            </span>
          </p>
          <p className="text-lg text-gray-700 mt-1">
            Category: <strong>{finalResult.final_category}</strong>
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

// Simple Icon
function FiMouse() {
  return (
    <svg
      aria-hidden="true"
      className="w-7 h-7 text-indigo-600"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 12v3m0-3a4 4 0 100-8 4 4 0 000 8zM6.667 17H17a2 2 0 002-2V7m-12 10v-3.333M10 16l-.333 3h4.666L14 16"
      ></path>
    </svg>
  );
}

export default MouseTracker;
