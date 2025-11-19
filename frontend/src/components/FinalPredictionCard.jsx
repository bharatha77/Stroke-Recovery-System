import React, { useState } from "react";
import {
  Card,
  Typography,
  Box,
  Button,
  LinearProgress,
  Stack,
  useMediaQuery,
  useTheme,
  Divider,
} from "@mui/material";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import StrokeReportPDF from "./StrokeReportPDF";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";

function ScoreBar({ label, value, color }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography
        variant="subtitle2"
        sx={{ mb: 0.5, fontWeight: 600, color: "#244673" }}
      >
        {label}: {value.toFixed(2)}%
      </Typography>
      <LinearProgress
        variant="determinate"
        value={value}
        sx={{
          height: 10,
          borderRadius: 6,
          backgroundColor: "#e3f2fd",
          "& .MuiLinearProgress-bar": {
            background: color,
            borderRadius: 6,
          },
        }}
      />
    </Box>
  );
}

const buildRadarData = (result) => [
  { subject: "Keystroke", A: result.keystroke_score ?? 0, fullMark: 100 },
  { subject: "Mouse", A: result.mouse_score ?? 0, fullMark: 100 },
  { subject: "Webcam", A: result.webcam_score ?? 0, fullMark: 100 },
];

export default function FinalPredictionCard({ result }) {
  const [viewPdf, setViewPdf] = useState(false);
  const theme = useTheme();
  const isMDUp = useMediaQuery(theme.breakpoints.up("md"));
  const patientName = localStorage.getItem("username") || "N/A";

  const isResultComplete =
    result &&
    result.final_score !== null &&
    result.keystroke_score !== null &&
    result.mouse_score !== null &&
    result.webcam_score !== null;

  if (!result)
    return (
      <Card sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h6">Final Stroke Recovery Rate</Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          Waiting for prediction results...
        </Typography>
      </Card>
    );

  if (!isResultComplete)
    return (
      <Card
        sx={{
          p: 5,
          textAlign: "center",
          borderRadius: 4,
          background: "linear-gradient(145deg,#fce4ec,#f8bbd0)",
          boxShadow: "0 6px 20px rgba(255,0,0,0.15)",
        }}
      >
        <Typography variant="h5" color="error" gutterBottom>
          Incomplete Data
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Please complete all tests before viewing the final analysis.
        </Typography>
      </Card>
    );

  const radarData = buildRadarData(result);

  return (
    <Box
      sx={{
        display: "flex",
        gap: 4,
        flexDirection: isMDUp ? "row" : "column",
        alignItems: "stretch",
        justifyContent: "center",
        mt: 4,
        px: 2,
      }}
    >
      {/* Left panel */}
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ flex: 1 }}
      >
        <Card
          sx={{
            p: 5,
            borderRadius: 4,
            textAlign: "center",
            background:
              "linear-gradient(180deg, #ffffff 0%, #f5faff 100%)",
            boxShadow:
              "0 8px 25px rgba(0, 0, 0, 0.08), inset 0 0 10px rgba(33,150,243,0.05)",
            border: "1px solid #e0eafc",
          }}
        >
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              mb: 1,
              color: "#1e88e5",
              letterSpacing: 0.3,
            }}
          >
            Stroke Recovery Assessment
          </Typography>

          <Typography
            variant="h3"
            sx={{
              fontWeight: "bold",
              color: "#0d47a1",
              mb: 0.5,
            }}
          >
            {result.final_score.toFixed(2)}%
          </Typography>

          <Typography
            variant="subtitle1"
            sx={{
              color: "#244673",
              mb: 3,
              fontWeight: 500,
            }}
          >
            Category: {result.final_category || "N/A"}
          </Typography>

          <Divider sx={{ mb: 3 }} />

          <Box sx={{ maxWidth: 400, mx: "auto", mb: 4 }}>
            <ScoreBar
              label="Keystroke Score"
              value={result.keystroke_score ?? 0}
              color="#42a5f5"
            />
            <ScoreBar
              label="Mouse Score"
              value={result.mouse_score ?? 0}
              color="#66bb6a"
            />
            <ScoreBar
              label="Webcam Score"
              value={result.webcam_score ?? 0}
              color="#ffb74d"
            />
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.2,
              bgcolor: "#f1f8ff",
              p: 2,
              borderRadius: 2,
              border: "1px solid #bbdefb",
              color: "#0d47a1",
              mb: 3,
            }}
          >
            <WarningAmberIcon color="warning" />
            <Typography variant="body2" fontWeight="medium">
              AI-based analysis for reference only. Consult a medical
              professional for diagnosis.
            </Typography>
          </Box>

          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="contained"
              onClick={() => setViewPdf((v) => !v)}
              sx={{
                px: 3,
                py: 1,
                borderRadius: 2,
                textTransform: "none",
                background:
                  "linear-gradient(90deg, #1e88e5, #42a5f5)",
                boxShadow: "0 4px 15px rgba(33,150,243,0.3)",
              }}
            >
              {viewPdf ? "Hide Report" : "View Report"}
            </Button>

            <PDFDownloadLink
              document={
                <StrokeReportPDF result={result} patientName={patientName} />
              }
              fileName={`Stroke_Recovery_Report_${new Date().toISOString()}.pdf`}
              style={{
                textDecoration: "none",
                padding: "10px 22px",
                background:
                  "linear-gradient(90deg,#00acc1,#26c6da)",
                color: "#fff",
                borderRadius: 10,
                fontWeight: 600,
                boxShadow: "0 4px 15px rgba(0,188,212,0.3)",
              }}
            >
              {({ loading }) =>
                loading ? "Preparing..." : "Download PDF"
              }
            </PDFDownloadLink>
          </Stack>

          {viewPdf && (
            <Box
              sx={{
                border: "1px solid #e3f2fd",
                height: 600,
                mt: 3,
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <PDFViewer width="100%" height="100%">
                <StrokeReportPDF result={result} patientName={patientName} />
              </PDFViewer>
            </Box>
          )}
        </Card>
      </motion.div>

      {/* Right panel */}
      {isMDUp && (
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          style={{ flexBasis: 400 }}
        >
          <Card
            sx={{
              p: 4,
              borderRadius: 4,
              background:
                "linear-gradient(180deg, #ffffff 0%, #f3f8fb 100%)",
              boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
              border: "1px solid #e3f2fd",
            }}
          >
            <Typography
              variant="h6"
              textAlign="center"
              sx={{
                mb: 3,
                fontWeight: 700,
                color: "#1565c0",
              }}
            >
              Score Overview (Radar)
            </Typography>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#bbdefb" />
                <PolarAngleAxis
                  dataKey="subject"
                  stroke="#1976d2"
                  tick={{ fill: "#244673", fontSize: 12 }}
                />
                <PolarRadiusAxis domain={[0, 100]} stroke="#90caf9" />
                <Radar
                  name="Score"
                  dataKey="A"
                  stroke="#1565c0"
                  fill="#42a5f5"
                  fillOpacity={0.5}
                />
              </RadarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>
      )}
    </Box>
  );
}
