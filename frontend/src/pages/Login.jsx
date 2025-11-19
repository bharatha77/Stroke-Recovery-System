import React, { useState, useEffect, useRef } from "react";
import { signinUser } from "../api/auth";
import { useNavigate, Link } from "react-router-dom";

/**
 * ✅ Your same logic preserved.
 * ✨ Only UI upgraded using inline CSS — no Tailwind or Framer Motion.
 * 🎨 Gradient + Glassmorphic + 3D tilt on mouse move.
 */

function Login() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const cardRef = useRef(null);
  const raf = useRef(null);
  const mouse = useRef({ x: 0, y: 0 });
  const anim = useRef({ rx: 0, ry: 0, tx: 0 });

  useEffect(() => {
    if (localStorage.getItem("token")) navigate("/dashboard");
  }, [navigate]);

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function onMouseMove(e) {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const offsetX = e.clientX - cx;
    const offsetY = e.clientY - cy;

    const ry = (offsetX / (rect.width / 2)) * 1;
    const rx = (offsetY / (rect.height / 2)) * 1;
    mouse.current.x = ry;
    mouse.current.y = rx;

    if (!raf.current) raf.current = requestAnimationFrame(frame);
  }

  function onMouseLeave() {
    mouse.current.x = 0;
    mouse.current.y = 0;
  }

  function frame() {
    const targetRy = mouse.current.x * 10;
    const targetRx = -mouse.current.y * 10;
    const targetTx = -mouse.current.x * 12;

    anim.current.rx = lerp(anim.current.rx, targetRx, 0.12);
    anim.current.ry = lerp(anim.current.ry, targetRy, 0.12);
    anim.current.tx = lerp(anim.current.tx, targetTx, 0.12);

    const el = cardRef.current;
    if (el) {
      el.style.transform = `
        perspective(1000px)
        rotateX(${anim.current.rx.toFixed(2)}deg)
        rotateY(${anim.current.ry.toFixed(2)}deg)
        translateX(${anim.current.tx.toFixed(2)}px)
      `;
      el.style.backgroundPosition = `${50 + anim.current.tx * 0.06}% ${
        50 - anim.current.rx * 0.06
      }%`;
    }

    const closeEnough =
      Math.abs(anim.current.rx - targetRx) < 0.01 &&
      Math.abs(anim.current.ry - targetRy) < 0.01 &&
      Math.abs(anim.current.tx - targetTx) < 0.01;

    if (!closeEnough) {
      raf.current = requestAnimationFrame(frame);
    } else {
      raf.current = null;
    }
  }

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await signinUser(form);
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("username", form.username);
      navigate("/dashboard");
    } catch (err) {
      setError(err.detail || "Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  // 🌈 --- UI Styles ---
  const pageStyle = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, #0f172a 0%, #2563eb 40%, #7c3aed 100%)",
    padding: 24,
    fontFamily:
      "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
  };

  const cardStyle = {
    width: "100%",
    maxWidth: 420,
    padding: 40,
    borderRadius: 20,
    background:
      "linear-gradient(145deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))",
    border: "1px solid rgba(255,255,255,0.15)",
    backdropFilter: "blur(15px)",
    WebkitBackdropFilter: "blur(15px)",
    boxShadow:
      "0 25px 60px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1)",
    color: "#fff",
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
    transformStyle: "preserve-3d",
  };

  const titleStyle = {
    fontSize: 30,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 10,
  };

  const subtitleStyle = {
    fontSize: 14,
    textAlign: "center",
    color: "rgba(255,255,255,0.8)",
    marginBottom: 30,
  };

  const formStyle = {
    display: "grid",
    gap: 18,
  };

  const inputWrap = { position: "relative" };

  const inputStyle = {
    width: "100%",
    padding: "14px 16px 14px 46px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
    transition: "box-shadow 0.2s ease, border-color 0.2s ease",
  };

  const iconStyle = {
    position: "absolute",
    left: 14,
    top: "50%",
    transform: "translateY(-50%)",
    width: 20,
    height: 20,
    opacity: 0.85,
  };

  const buttonStyle = {
    width: "100%",
    padding: "13px 16px",
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    background:
      "linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)",
    color: "#fff",
    fontWeight: 700,
    fontSize: 15,
    boxShadow: "0 8px 24px rgba(14,165,233,0.3)",
    transition: "all 0.2s ease",
  };

  const footerStyle = {
    marginTop: 24,
    textAlign: "center",
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
  };

  const errorStyle = {
    marginTop: 10,
    color: "#f87171",
    textAlign: "center",
    fontWeight: 600,
    fontSize: 13,
  };

  // 🌟 --- JSX ---
  return (
    <div style={pageStyle}>
      <div
        ref={cardRef}
        style={cardStyle}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      >
        <h2 style={titleStyle}>Welcome Back 👋</h2>
        <p style={subtitleStyle}>Sign in to continue to your dashboard</p>

        <form style={formStyle} onSubmit={handleSubmit}>
          {/* Username */}
          <div style={inputWrap}>
            <svg viewBox="0 0 24 24" style={iconStyle} fill="none">
              <path
                d="M12 12c2.76 0 5-2.24 5-5S14.76 2 12 2 7 4.24 7 7s2.24 5 5 5zm0 2c-3.31 0-6 2.69-6 6"
                stroke="rgba(255,255,255,0.9)"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="Username"
              required
              style={inputStyle}
            />
          </div>

          {/* Password */}
          <div style={inputWrap}>
            <svg viewBox="0 0 24 24" style={iconStyle} fill="none">
              <path
                d="M17 11V8a5 5 0 00-10 0v3M5 11h14v8H5z"
                stroke="rgba(255,255,255,0.9)"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Password"
              required
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            style={{
              ...buttonStyle,
              opacity: loading ? 0.7 : 1,
              transform: loading ? "scale(0.98)" : "scale(1)",
            }}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {error && <div style={errorStyle}>{error}</div>}

        <div style={footerStyle}>
          Don’t have an account?{" "}
          <Link
            to="/signup"
            style={{ color: "#fff", fontWeight: 700, textDecoration: "none" }}
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
