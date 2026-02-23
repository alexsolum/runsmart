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

  async function handleGoogleSignIn() {
    setLocalError(null);
    setLocalSuccess(null);
    setSubmitting(true);
    try {
      await auth.signInWithGoogle();
    } catch (err) {
      setLocalError(err.message || "Unable to continue with Google.");
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

        <button type="button" className="auth-google" onClick={handleGoogleSignIn} disabled={submitting}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48">
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="auth-divider" aria-hidden="true">
          <span>or</span>
        </div>

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
