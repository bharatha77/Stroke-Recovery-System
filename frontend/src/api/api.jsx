import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

export const uploadPdfFile = async (username, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const params = new URLSearchParams({ username });

  const res = await axios.post(`${API_BASE_URL}/upload-pdf?${params.toString()}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.filename;
};

export const saveSession = async (sessionData) => {
  const res = await axios.post(`${API_BASE_URL}/sessions`, sessionData);
  return res.data;
};

export const fetchSessionHistory = async (username) => {
  const res = await axios.get(`${API_BASE_URL}/sessions/${username}`);
  return res.data;
};

export const predictRecovery = async (payload) => {
  const sanitized = {
    keystroke_score: payload.keystroke_score || 0,
    mouse_score: payload.mouse_score || 0,
    webcam_score: payload.webcam_score || 0,
  };
  const res = await axios.post(`${API_BASE_URL}/predict/all`, sanitized);
  return res.data;
};
