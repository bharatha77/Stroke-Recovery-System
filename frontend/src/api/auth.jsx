import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

export const signupUser = async (userData) => {
  try {
    const res = await axios.post(`${API_BASE_URL}/signup`, userData);
    return res.data;
  } catch (err) {
    throw err.response?.data || err;
  }
};

export const signinUser = async (credentials) => {
  try {
    const form = new URLSearchParams();
    form.append("username", credentials.username);
    form.append("password", credentials.password);

    const res = await axios.post(`${API_BASE_URL}/signin`, form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return res.data;
  } catch (err) {
    throw err.response?.data || err;
  }
};
