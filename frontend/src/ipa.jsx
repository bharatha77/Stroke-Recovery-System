export const predictRecovery = async (payload) => {
  console.log("📡 Calling /predict/all with payload:", payload);
  try {
    const response = await fetch("http://127.0.0.1:8000/predict/all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log("🧾 Response status:", response.status);

    const data = await response.json();
    console.log("✅ Response JSON:", data);
    return data;
  } catch (err) {
    console.error("❌ predictRecovery failed:", err);
    return null;
  }
};
