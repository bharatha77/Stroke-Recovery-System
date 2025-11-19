import React, { useState, useRef } from "react";
import axios from "axios";
import {
  Card,
  Grid,
  Typography,
  TextField,
  Button,
  Snackbar,
  Box,
  Divider,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const testSentence = "The quick brown fox jumps over the lazy dog.";

function KeystrokeForm({ onDataChange }) {
  const [input, setInput] = useState("");
  const [lastKeyTime, setLastKeyTime] = useState(null);
  const [dwellTimes, setDwellTimes] = useState([]);
  const [flightTimes, setFlightTimes] = useState([]);
  const [keystrokeEvents, setKeystrokeEvents] = useState([]); // <-- Added state for raw keystroke events
  const [errors, setErrors] = useState(0);
  const [corrections, setCorrections] = useState(0);
  const [done, setDone] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef();

  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);

  const dwellMap = useRef({});

  const handleFocus = () => {
    if (!startTime) setStartTime(Date.now());
  };

  const handleKeyDown = (e) => {
    if (!startTime) setStartTime(Date.now());
    dwellMap.current[e.code] = Date.now();

    // Save event to keystrokeEvents
    setKeystrokeEvents((prev) => [
      ...prev,
      { key: e.key, event_type: "down", timestamp_ms: Date.now() },
    ]);

    if (e.key === "Backspace") {
      setCorrections((c) => c + 1);
      if (input.length > 0 && input[input.length - 1] !== testSentence[input.length - 1]) {
        setErrors((c) => c + 1);
      }
    }
  };

  const handleKeyUp = (e) => {
    if (dwellMap.current[e.code]) {
      setDwellTimes((dt) => [...dt, Date.now() - dwellMap.current[e.code]]);
      delete dwellMap.current[e.code];
    }
    if (lastKeyTime !== null) {
      setFlightTimes((ft) => [...ft, Date.now() - lastKeyTime]);
    }
    setLastKeyTime(Date.now());

    // Save event to keystrokeEvents
    setKeystrokeEvents((prev) => [
      ...prev,
      { key: e.key, event_type: "up", timestamp_ms: Date.now() },
    ]);

    setKeystrokeTimes((k) => [...k, Date.now()]);
  };

  const handleChange = (e) => {
    const val = e.target.value;
    if (val.length <= testSentence.length) setInput(val);
    if (val.length === testSentence.length && val === testSentence && !done) {
      setEndTime(Date.now());
      setDone(true);
    }
  };

  const computeFeatures = () => {
    const elapsed = (endTime - startTime) / 1000;
    const words = testSentence.trim().split(/\s+/).length;
    const wpm = (words / (elapsed / 60)).toFixed(2);
    const cpm = ((testSentence.length) / (elapsed / 60)).toFixed(2);

    const avgDwell = (dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length || 0).toFixed(2);
    const avgFlight = (flightTimes.reduce((a, b) => a + b, 0) / flightTimes.length || 0).toFixed(2);
    let totalDiff = 0;
    for (let i = 1; i < flightTimes.length; i++) {
      totalDiff += Math.abs(flightTimes[i] - flightTimes[i - 1]);
    }
    const consistent = flightTimes.length > 1 ? (100 - (totalDiff / (flightTimes.length - 1))).toFixed(2) : 100;
    const accScore = (10 * ((testSentence.length - errors) / testSentence.length)).toFixed(2);

    return {
      Errors: errors,
      CorrectionBehavior: corrections,
      TypingSpeed_WPM: Number(wpm),
      TypingSpeed_CPM: Number(cpm),
      AverageDwellTime: Number(avgDwell),
      AverageFlightTime: Number(avgFlight),
      Consistency: Number(consistent),
      AccuracyScore: Number(accScore),
    };
  };

  const classifyPrediction = (score) => {
    if (score >= 75)
      return {
        category: "High",
        description: "This typing pattern is consistent with a high rate of recovery.",
      };
    else if (score >= 40)
      return {
        category: "Average",
        description: "This typing pattern is consistent with an average rate of recovery.",
      };
    else
      return {
        category: "Low",
        description:
          "This typing pattern suggests a lower rate of recovery, showing some inconsistencies.",
      };
  };

  const handleSubmit = async () => {
    const featureSet = computeFeatures();
    setLoading(true);
    try {
      const response = await axios.post("http://127.0.0.1:8000/predict/keystroke", featureSet);
      const score = response.data.keystroke_score;
      localStorage.setItem("keystroke_score", JSON.stringify(score));
      setPrediction(score);
      setOpen(true);

      if (onDataChange) {
        onDataChange({ predictedScore: score, ...featureSet });
      }
    } catch (error) {
      console.error("Keystroke prediction API error:", error);
    } finally {
      setLoading(false);
    }
  };

  const featureSet = computeFeatures();
  const classification = prediction ? classifyPrediction(prediction) : null;

  return (
    <Box sx={{ maxWidth: 650, m: "auto", p: 2 }}>
      <Card sx={{ p: 4, boxShadow: 4, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          ⌨️ Keystroke Analysis Test
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Type this sentence exactly as shown below to analyze your typing pattern:
        </Typography>
        <Typography
          sx={{ mb: 3, p: 2, bgcolor: "#f3f4f6", borderRadius: 2, fontWeight: "medium" }}
        >
          {testSentence}
        </Typography>

        <TextField
          inputRef={inputRef}
          value={input}
          onChange={handleChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          disabled={done}
          fullWidth
          multiline
          rows={3}
          placeholder="Start typing here..."
          sx={{ mb: 2 }}
        />
        <Typography variant="caption" color="textSecondary" sx={{ display: "block", mb: 2 }}>
          Characters typed: {input.length}/{testSentence.length}
        </Typography>

        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={6}>
            <Typography>Errors: {errors}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography>Corrections: {corrections}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography>
              Avg Dwell:{" "}
              {dwellTimes.length > 0
                ? (dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length).toFixed(2) + " ms"
                : "-"}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography>
              Avg Flight:{" "}
              {flightTimes.length > 0
                ? (flightTimes.reduce((a, b) => a + b, 0) / flightTimes.length).toFixed(2) + " ms"
                : "-"}
            </Typography>
          </Grid>
        </Grid>

        <Button
          variant="contained"
          fullWidth
          disabled={!done || loading}
          onClick={handleSubmit}
          sx={{ mt: 3, py: 1.2, fontWeight: "bold" }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : "Predict Recovery Rate"}
        </Button>

        {prediction && (
          <>
            <Divider sx={{ my: 3 }} />
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Analysis Results
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={3}>
                <Typography variant="subtitle1">Predicted Recovery Score</Typography>
                <Typography variant="h4" color="success.main">
                  {Number(prediction).toFixed(1)}%
                </Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="subtitle1">Classification</Typography>
                <Typography variant="h5">{classification.category}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body1" sx={{ mt: 2 }}>
                  {classification.description}
                </Typography>
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom>
              Detailed Typing Metrics
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={3}>
                <Typography>Typing Speed (WPM): {featureSet.TypingSpeed_WPM}</Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography>
                  Errors & Corrections: {featureSet.Errors + featureSet.CorrectionBehavior}
                </Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography>Avg. Key Press (ms): {featureSet.AverageDwellTime}</Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography>Typing Rhythm (Std Dev): {featureSet.Consistency}</Typography>
              </Grid>
            </Grid>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Show Raw Data</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="subtitle2">Extracted Features:</Typography>
                <pre>{JSON.stringify(featureSet, null, 2)}</pre>
                <Typography variant="subtitle2" sx={{ mt: 2 }}>
                  Captured Keystroke Events (Raw Data):
                </Typography>
                <pre style={{ maxHeight: 300, overflow: "auto" }}>
                  {JSON.stringify(keystrokeEvents, null, 2)}
                </pre>
              </AccordionDetails>
            </Accordion>
          </>
        )}

        <Snackbar
          open={open}
          autoHideDuration={4000}
          onClose={() => setOpen(false)}
          message={prediction ? `Prediction received successfully!` : ""}
        />
      </Card>
    </Box>
  );
}

export default KeystrokeForm;
