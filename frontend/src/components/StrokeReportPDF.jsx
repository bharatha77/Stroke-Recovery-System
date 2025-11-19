import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    backgroundColor: "#f9fafb",
    color: "#222",
  },
  logo: {
    width: 120,
    height: 50,
    marginBottom: 15,
    alignSelf: "center",
  },
  headerBar: {
    backgroundColor: "linear-gradient(90deg, #1e3a8a, #3b82f6)",
    paddingVertical: 18,
    borderRadius: 8,
    marginBottom: 25,
    textAlign: "center",
  },
  header: {
    fontSize: 24,
    textAlign: "center",
    fontWeight: "bold",
    color: "#ffffff",
    letterSpacing: 1.3,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 18,
    marginBottom: 20,
    boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
    border: "1px solid #e5e7eb",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e3a8a",
    marginBottom: 12,
    textDecoration: "underline",
  },
  labelValueRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  label: {
    width: 140,
    fontWeight: "bold",
    color: "#374151",
  },
  value: {
    flex: 1,
    color: "#111827",
  },
  barContainer: {
    marginBottom: 14,
  },
  barLabel: {
    fontSize: 12,
    marginBottom: 6,
    color: "#374151",
    fontWeight: "600",
  },
  barOuter: {
    height: 12,
    width: "100%",
    backgroundColor: "#e5e7eb",
    borderRadius: 6,
    overflow: "hidden",
    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.15)",
  },
  barInner: {
    height: 12,
    borderRadius: 6,
    backgroundColor: "linear-gradient(90deg, #3b82f6, #60a5fa)",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 10,
    textAlign: "center",
    color: "#6b7280",
  },
});

const Bar = ({ label, value = 0, max = 100 }) => {
  const barWidth = `${Math.min((value / max) * 100, 100)}%`;
  return (
    <View style={styles.barContainer}>
      <Text style={styles.barLabel}>
        {label}: {value.toFixed(2)}%
      </Text>
      <View style={styles.barOuter}>
        <View style={[styles.barInner, { width: barWidth }]} />
      </View>
    </View>
  );
};

const StrokeReportPDF = ({ result, patientName = "N/A" }) => {
  const date = new Date().toLocaleString();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBar}>
          <Text style={styles.header}>🧠 Stroke Recovery Medical Report</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Patient Information</Text>
          <View style={styles.labelValueRow}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{patientName}</Text>
          </View>
          <View style={styles.labelValueRow}>
            <Text style={styles.label}>Report Generated:</Text>
            <Text style={styles.value}>{date}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Final Recovery Assessment</Text>
          <View style={styles.labelValueRow}>
            <Text style={styles.label}>Recovery Rate:</Text>
            <Text style={styles.value}>
              {result?.final_score
                ? `${result.final_score.toFixed(2)} %`
                : "N/A"}
            </Text>
          </View>
          <View style={styles.labelValueRow}>
            <Text style={styles.label}>Category:</Text>
            <Text style={styles.value}>{result?.final_category ?? "N/A"}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Detailed Scores</Text>
          <Bar label="Keystroke Score" value={result?.keystroke_score ?? 0} />
          <Bar label="Mouse Score" value={result?.mouse_score ?? 0} />
          <Bar label="Webcam Score" value={result?.webcam_score ?? 0} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Interpretation & Recommendations</Text>
          <Text>
            Based on the above metrics, the patient exhibits{" "}
            <Text style={{ fontWeight: "bold" }}>
              {result?.final_category ?? "an unknown"}
            </Text>{" "}
            level of motor recovery. It is recommended to continue consistent
            physiotherapy and digital rehabilitation sessions for best results.
          </Text>
        </View>

        <Text style={styles.footer}>
          © {new Date().getFullYear()} Stroke Recovery Prediction System —
          Confidential Medical Report.
        </Text>
      </Page>
    </Document>
  );
};

export default StrokeReportPDF;
