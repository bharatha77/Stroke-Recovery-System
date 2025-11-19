import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  TextField,
  MenuItem,
  IconButton,
  Paper,
  Tooltip,
  InputAdornment,
  Dialog,
  DialogContent,
  DialogTitle,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DownloadIcon from "@mui/icons-material/Download";
import FilterAltIcon from "@mui/icons-material/FilterAlt";

import { fetchSessionHistory } from "../api/api";

function SessionHistory({ username }) {
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");

  // PDF Preview Modal
  const [openPdf, setOpenPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");

  const openPdfPreview = (url) => {
    setPdfUrl(url);
    setOpenPdf(true);
  };

  const closePdfPreview = () => {
    setOpenPdf(false);
    setPdfUrl("");
  };

  useEffect(() => {
    if (!username) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchSessionHistory(username);
        setSessions(data);
        setFilteredSessions(data);
      } catch (err) {
        console.error("Failed to fetch session history:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [username]);

  // Search + Filter Logic
  useEffect(() => {
    let updated = [...sessions];

    if (search.trim() !== "") {
      updated = updated.filter((session) =>
        new Date(session.timestamp)
          .toLocaleString()
          .toLowerCase()
          .includes(search.toLowerCase())
      );
    }

    if (filterCategory !== "All") {
      updated = updated.filter(
        (session) =>
          session.final_category?.toLowerCase() ===
          filterCategory.toLowerCase()
      );
    }

    setFilteredSessions(updated);
  }, [search, filterCategory, sessions]);

  if (!username)
    return (
      <Typography variant="h6" sx={{ textAlign: "center", mt: 4 }}>
        Please login to view your session history.
      </Typography>
    );

  if (loading)
    return (
      <Box sx={{ textAlign: "center", mt: 5 }}>
        <CircularProgress />
        <Typography sx={{ mt: 1 }}>Loading session history...</Typography>
      </Box>
    );

  return (
    <Box
      sx={{
        maxWidth: 800,
        mx: "auto",
        mt: 3,
        p: 3,
        borderRadius: 3,
        background: "linear-gradient(135deg, #e6f7ff, #f7fbff)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
      }}
    >
      <Typography
        variant="h4"
        sx={{
          fontWeight: "bold",
          textAlign: "center",
          color: "#006bb3",
          mb: 3,
        }}
      >
        🏥 Session History
      </Typography>

      {/* Total Sessions */}
      <Typography
        variant="h6"
        sx={{
          textAlign: "center",
          color: "#004d80",
          mb: 2,
        }}
      >
        Total Sessions: <b>{filteredSessions.length}</b>
      </Typography>

      {/* Search + Filter */}
      <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
        <TextField
          fullWidth
          label="Search by Date"
          variant="outlined"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="primary" />
              </InputAdornment>
            ),
          }}
        />

        <TextField
          select
          label="Filter Category"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          sx={{ minWidth: 180 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <FilterAltIcon />
              </InputAdornment>
            ),
          }}
        >
          <MenuItem value="All">All</MenuItem>
          <MenuItem value="Excellent">Excellent</MenuItem>
          <MenuItem value="Good">Good</MenuItem>
          <MenuItem value="Poor">Poor</MenuItem>
        </TextField>
      </Box>

      {/* List */}
      <Paper
        sx={{
          maxHeight: 450,
          overflowY: "auto",
          p: 2,
          borderRadius: 3,
          border: "1px solid #cce6ff",
          background: "#ffffff",
        }}
      >
        {filteredSessions.length === 0 ? (
          <Typography sx={{ textAlign: "center", py: 3, color: "gray" }}>
            No sessions found.
          </Typography>
        ) : (
          <List>
            {filteredSessions.map((session, idx) => (
              <React.Fragment key={session.id || idx}>
                <ListItem
                  sx={{
                    flexDirection: "column",
                    alignItems: "start",
                    p: 2,
                    borderRadius: 2,
                    background: "#f0f7ff",
                    mb: 2,
                    border: "1px solid #cce6ff",
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography variant="h6" sx={{ color: "#005c99" }}>
                        📅 {new Date(session.timestamp).toLocaleString()}
                      </Typography>
                    }
                    secondary={
                      <>
                        {/* Final Score */}
                        <Typography sx={{ mt: 1, fontSize: "16px", fontWeight: 600 }}>
                          Recovery Score:{" "}
                          <span style={{ color: "#003d66" }}>
                            {session.final_score?.toFixed(2)}%
                          </span>
                        </Typography>

                        {/* Category */}
                        <Typography sx={{ fontSize: "14px", color: "#007acc" }}>
                          Category: <b>{session.final_category}</b>
                        </Typography>

                        {/* PDF Buttons */}
                        {session.pdf_filename && (
                          <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
                            {/* View PDF (Preview Modal) */}
                            <Tooltip title="Preview PDF">
                              <IconButton
                                color="primary"
                                onClick={() =>
                                  openPdfPreview(
                                    `http://127.0.0.1:8000/sessions/pdf/${session.pdf_filename}`
                                  )
                                }
                              >
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>

                            {/* Download PDF */}
                            <Tooltip title="Download PDF">
                              <IconButton
                                color="primary"
                                onClick={() => {
                                  const link = document.createElement("a");
                                  link.href = `http://127.0.0.1:8000/sessions/pdf/${session.pdf_filename}`;
                                  link.download = session.pdf_filename;
                                  link.click();
                                }}
                              >
                                <DownloadIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}
                      </>
                    }
                  />
                </ListItem>

                {idx < filteredSessions.length - 1 && (
                  <Divider sx={{ my: 1 }} />
                )}
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>

      {/* ===== PDF PREVIEW MODAL ===== */}
      <Dialog open={openPdf} onClose={closePdfPreview} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold", color: "#006bb3" }}>
          PDF Preview
        </DialogTitle>
        <DialogContent>
          <iframe
            src={pdfUrl}
            title="PDF Preview"
            width="100%"
            height="600px"
            style={{ border: "none" }}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export default SessionHistory;
