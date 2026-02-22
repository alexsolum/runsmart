import React, { useState } from "react";
import { useAppData } from "../context/AppDataContext";

export default function AuthPage() {
  const { auth } = useAppData();
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [localSuccess, setLocalSuccess] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError(null);
    setLocalSuccess(null);
    setSubmitting(true);
    try {
      if (mode === "signin") {
        await auth.signIn(email, password);
      } else {
        await auth.signUp(email, password);
        setLocalSuccess("Account created — check your email to confirm, then sign in.");
        setMode("signin");
      }
    } catch (err) {
      setLocalError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">RunSmart</div>
        <h1 className="auth-title">{mode === "signin" ? "Sign in" : "Create account"}</h1>

        {localError && <p className="auth-feedback auth-feedback--error">{localError}</p>}
        {localSuccess && <p className="auth-feedback auth-feedback--success">{localSuccess}</p>}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <label className="auth-label">
            <span>Email</span>
            <input
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={submitting}
            />
          </label>

          <label className="auth-label">
            <span>Password</span>
            <input
              type="password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              disabled={submitting}
              minLength={6}
            />
          </label>

          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting
              ? mode === "signin" ? "Signing in…" : "Creating account…"
              : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="auth-toggle">
          {mode === "signin" ? "No account? " : "Already have an account? "}
          <button
            type="button"
            className="auth-toggle-btn"
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setLocalError(null); setLocalSuccess(null); }}
          >
            {mode === "signin" ? "Create one" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
