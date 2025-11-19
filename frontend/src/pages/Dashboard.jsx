import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Typography,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Paper,
} from "@mui/material";
import { motion } from "framer-motion";
import { pdf } from "@react-pdf/renderer";

import Sidebar from "../components/Sidebar";
import KeystrokeCollector from "../components/KeystrokeForm";
import MouseTracker from "../components/MouseCollector";
import WebcamPanel from "../components/WebcamPanel";
import FinalPredictionCard from "../components/FinalPredictionCard";
import SessionHistory from "../components/SessionHistory";
import StrokeReportPDF from "../components/StrokeReportPDF";

import { predictRecovery, uploadPdfFile, saveSession } from "../api/api";

const steps = ["Keystroke", "Mouse", "Webcam", "Final Analysis"];

function Dashboard() {
  const [activeView, setActiveView] = useState("Session History");
  const [keystrokeFeatures, setKeystrokeFeatures] = useState(null);
  const [mouseFeatures, setMouseFeatures] = useState(null);
  const [webcamFeatures, setWebcamFeatures] = useState(null);
  const [finalResult, setFinalResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const username = localStorage.getItem("username");

  useEffect(() => {
    if (!localStorage.getItem("token")) navigate("/login");
  }, [navigate]);

  const activeStep = steps.indexOf(activeView);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    navigate("/login");
  };

  // PDF generation helper - generates PDF blob with proper styling from your React PDF component
  const generatePdfFile = async (pdfData) => {
    const doc = <StrokeReportPDF result={pdfData} patientName={username || "N/A"} />;
    const blob = await pdf(doc).toBlob();
    return new File([blob], `StrokeReport_${username}.pdf`, { type: "application/pdf" });
  };

  const handleNext = async () => {
    if (activeView === "Webcam") {
      setLoading(true);
      try {
        const payload = {
          keystroke_score: keystrokeFeatures?.predictedScore ?? 0,
          mouse_score: mouseFeatures?.predictedScore ?? 0,
          webcam_score: webcamFeatures?.predictedScore ?? 0,
        };

        const result = await predictRecovery(payload);

        if (result) {
          setFinalResult(result);
          setActiveView("Final Analysis");

          // Generate PDF file blob with all styles intact
          const pdfFile = await generatePdfFile(result);

          // Upload PDF blob to backend
          const pdfFilename = await uploadPdfFile(username, pdfFile);

          // Save session metadata with uploaded PDF filename
          const session = {
            username,
            final_score: result.final_score,
            final_category: result.final_category,
            keystroke_score: result.keystroke_score,
            mouse_score: result.mouse_score,
            webcam_score: result.webcam_score,
            pdf_filename: pdfFilename,
            timestamp: new Date().toISOString(),
          };
          await saveSession(session);
        } else {
          alert("Prediction API returned empty response");
        }
      } catch (error) {
        console.error(error);
        alert("Prediction or PDF upload failed. See console.");
      } finally {
        setLoading(false);
      }
    } else {
      setActiveView(steps[activeStep + 1]);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) setActiveView(steps[activeStep - 1]);
  };

  const canGoNext = () => {
    if (activeView === "Keystroke") return keystrokeFeatures !== null;
    if (activeView === "Mouse") return mouseFeatures !== null;
    if (activeView === "Webcam") return webcamFeatures !== null;
    return false;
  };

  const renderContent = () => {
    switch (activeView) {
      case "Session History":
        return <SessionHistory username={username} />;
      case "Keystroke":
        return <KeystrokeCollector onDataChange={setKeystrokeFeatures} />;
      case "Mouse":
        return <MouseTracker onDataChange={setMouseFeatures} />;
      case "Webcam":
        return <WebcamPanel onDataChange={setWebcamFeatures} />;
      case "Final Analysis":
        return <FinalPredictionCard result={finalResult} />;
      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 30%, #312e81 80%)",
      }}
    >
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <Box sx={{ flexGrow: 1, p: 4 }}>
        <Paper
          elevation={5}
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 4,
            p: 3,
            borderRadius: 3,
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(10px)",
            color: "white",
          }}
        >
          <Typography variant="subtitle1">
            Logged in as:{" "}
            <strong style={{ color: "#93c5fd" }}>{username || "Unknown"}</strong>
          </Typography>
          <Button
            variant="contained"
            onClick={handleLogout}
            sx={{
              background: "linear-gradient(90deg, #f43f5e, #e11d48)",
              color: "#fff",
              fontWeight: 600,
              "&:hover": {
                background: "linear-gradient(90deg, #e11d48, #be123c)",
              },
            }}
          >
            Logout
          </Button>
        </Paper>

        {activeView !== "Session History" && activeView !== "Final Analysis" && (
          <>
            <Stepper
              activeStep={activeStep}
              alternativeLabel
              sx={{
                mb: 5,
                "& .MuiStepLabel-label": { color: "#e0e7ff" },
                "& .MuiStepIcon-root.Mui-active": { color: "#60a5fa" },
                "& .MuiStepIcon-root.Mui-completed": { color: "#34d399" },
              }}
            >
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            <Box
              sx={{
                mt: 5,
                display: "flex",
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Button
                variant="outlined"
                disabled={activeStep === 0 || loading}
                onClick={handleBack}
                sx={{
                  borderColor: "#60a5fa",
                  color: "#60a5fa",
                  "&:hover": {
                    borderColor: "#93c5fd",
                    background: "rgba(59,130,246,0.2)",
                  },
                }}
              >
                Back
              </Button>
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!canGoNext() || loading}
                sx={{
                  background: "linear-gradient(90deg, #2563eb, #4f46e5)",
                  color: "#fff",
                  fontWeight: 600,
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  "&:hover": {
                    background: "linear-gradient(90deg, #1d4ed8, #4338ca)",
                  },
                }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : activeView === "Webcam" ? (
                  "Predict"
                ) : (
                  "Next"
                )}
              </Button>
            </Box>
          </>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Paper
            elevation={8}
            sx={{
              p: 4,
              minHeight: 420,
              borderRadius: 4,
              background: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(20px)",
              color: "white",
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
              mt: 3,
            }}
          >
            {renderContent()}
          </Paper>
        </motion.div>
      </Box>
    </Box>
  );
}

export default Dashboard;
