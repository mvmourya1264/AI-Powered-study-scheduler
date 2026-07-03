import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { api } from "../api";

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "register") {
        await api.register(email, password, fullName);
      }
      const res = await api.login(email, password);
      localStorage.setItem("token", res.data.access_token);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.detail || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="main" style={{ maxWidth: 420, paddingTop: 90 }}>
      <div className="eyebrow">Study Scheduler</div>
      <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
      <p>
        {mode === "login"
          ? "Sign in to pick up your study plan."
          : "Set up an account to save your syllabi and schedules."}
      </p>

      <form onSubmit={handleSubmit} className="card">
        {mode === "register" && (
          <div className="field">
            <label>Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ada Lovelace"
            />
          </div>
        )}
        <div className="field">
          <label>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
        </div>

        {error && <div className="error-msg">{error}</div>}

        <button type="submit" className="btn" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
          {loading ? <span className="spinner" /> : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>

      <p style={{ marginTop: 16, fontSize: 14 }}>
        {mode === "login" ? "New here?" : "Already have an account?"}{" "}
        <button
          className="btn ghost"
          type="button"
          style={{ padding: 0, textDecoration: "underline" }}
          onClick={() => {
            setError("");
            setMode(mode === "login" ? "register" : "login");
          }}
        >
          {mode === "login" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </div>
  );
}
