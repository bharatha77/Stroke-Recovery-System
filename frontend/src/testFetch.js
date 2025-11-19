// testFetch.js
const axios = require("axios");

async function testAPI() {
  try {
    const payload = {
      keystroke_score: 50,
      mouse_score: 60,
      webcam_score: 70,
    };
    const response = await axios.post("http://127.0.0.1:8000/predict/all", payload);
    console.log("✅ API Response:", response.data);
  } catch (err) {
    console.error("❌ API Error:", err.message);
  }
}

testAPI();
