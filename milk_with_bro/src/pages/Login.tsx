import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { navigate } from "../lib/useRoute";
import { Link } from "../components/Link";

type AuthMode = "signin" | "signup" | "forgot" | "reset";

export function Login() {
  const {
    user,
    signIn,
    signUp,
    signOut,
    resetPasswordForEmail,
    updatePassword,
    signInWithOAuth,
    isPasswordRecovery,
    loading: authLoading,
  } = useAuth();

  const [selectedMode, setSelectedMode] = useState<AuthMode | null>(null);
  const mode: AuthMode = selectedMode ?? (isPasswordRecovery ? "reset" : "signin");
  const setMode = (m: AuthMode) => setSelectedMode(m);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleOAuth = async (provider: "google" | "github") => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setSubmitting(true);
    try {
      const { error } = await signInWithOAuth(provider);
      if (error) {
        setErrorMessage(error.message);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to initiate social sign-in.";
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (mode === "forgot") {
      if (!email.trim()) {
        setErrorMessage("Please enter your account email address.");
        return;
      }
      setSubmitting(true);
      try {
        const { error } = await resetPasswordForEmail(email.trim());
        if (error) {
          setErrorMessage(error.message);
        } else {
          setSuccessMessage("Password reset email sent! Please check your inbox for the recovery link.");
        }
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : "Failed to send reset email.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (mode === "reset") {
      if (!password.trim() || password.length < 6) {
        setErrorMessage("New password must be at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage("Passwords do not match.");
        return;
      }
      setSubmitting(true);
      try {
        const { error } = await updatePassword(password);
        if (error) {
          setErrorMessage(error.message);
        } else {
          setSuccessMessage("Password successfully updated! You can now sign in.");
          setMode("signin");
          setPassword("");
          setConfirmPassword("");
        }
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : "Failed to update password.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);

    try {
      if (mode === "signin") {
        const { error } = await signIn(email.trim(), password);
        if (error) {
          setErrorMessage(error.message);
        } else {
          navigate("/diagnostics");
        }
      } else {
        const { error, user: newUser } = await signUp(email.trim(), password);
        if (error) {
          setErrorMessage(error.message);
        } else if (newUser && !newUser.confirmed_at && newUser.identities?.length) {
          setSuccessMessage(
            "Account created! Please check your email inbox to confirm your email before signing in."
          );
        } else {
          setSuccessMessage("Account created successfully!");
          navigate("/diagnostics");
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <main className="page" id="main-content">
        <header className="page-head">
          <p className="eyebrow">Supabase Authentication</p>
          <h1 className="page-title">Loading Session</h1>
        </header>
        <section className="card" style={{ textAlign: "center", padding: "40px" }}>
          <p style={{ fontFamily: "var(--mono)", color: "var(--ink-dim)" }}>
            Checking your current session status...
          </p>
        </section>
      </main>
    );
  }

  if (user && mode !== "reset") {
    return (
      <main className="page" id="main-content">
        <header className="page-head">
          <p className="eyebrow">Supabase Authentication</p>
          <h1 className="page-title">Signed In</h1>
          <p className="prose">
            You are currently signed in to Coffee with Bro via Supabase Auth.
          </p>
        </header>

        <section className="card" style={{ maxWidth: "560px", margin: "0 auto", width: "100%" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <span style={{ fontSize: "12px", fontFamily: "var(--mono)", color: "var(--ink-dim)" }}>
                Active Account
              </span>
              <p style={{ margin: "4px 0 0", fontSize: "16px", fontWeight: 600, color: "var(--ink)" }}>
                {user.email}
              </p>
            </div>

            <div>
              <span style={{ fontSize: "12px", fontFamily: "var(--mono)", color: "var(--ink-dim)" }}>
                User ID
              </span>
              <p
                style={{
                  margin: "4px 0 0",
                  fontFamily: "var(--mono)",
                  fontSize: "12px",
                  color: "var(--ink-dim)",
                  wordBreak: "break-all",
                }}
              >
                {user.id}
              </p>
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-start"
                onClick={() => navigate("/diagnostics")}
                style={{ flex: 1 }}
              >
                Go to Diagnostics →
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => signOut()}
                style={{ flex: 1 }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page" id="main-content">
      <header className="page-head">
        <p className="eyebrow">Supabase Authentication</p>
        <h1 className="page-title">
          {mode === "signin" && "Sign In to Coffee with Bro"}
          {mode === "signup" && "Create an Account"}
          {mode === "forgot" && "Reset Your Password"}
          {mode === "reset" && "Choose a New Password"}
        </h1>
        <p className="prose">
          {mode === "reset"
            ? "Enter your new password below to regain full access to your account."
            : mode === "forgot"
            ? "Enter your email address and we will send you a recovery link to reset your password."
            : "Sign in to access protected routes, live system diagnostics, DL4J CNN inference telemetry, and administrative tools."}
        </p>
      </header>

      <section
        className="card"
        style={{
          maxWidth: "480px",
          margin: "0 auto",
          width: "100%",
          padding: "28px",
        }}
      >
        
        {(mode === "signin" || mode === "signup") && (
          <div
            role="tablist"
            aria-label="Auth Mode"
            style={{
              display: "flex",
              borderBottom: "1px solid var(--line)",
              marginBottom: "24px",
              gap: "8px",
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signin"}
              onClick={() => {
                setMode("signin");
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              style={{
                flex: 1,
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                borderBottom: mode === "signin" ? "2px solid var(--accent)" : "2px solid transparent",
                color: mode === "signin" ? "var(--ink)" : "var(--ink-dim)",
                fontWeight: mode === "signin" ? 600 : 400,
                cursor: "pointer",
                fontFamily: "var(--sans)",
                fontSize: "15px",
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signup"}
              onClick={() => {
                setMode("signup");
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              style={{
                flex: 1,
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                borderBottom: mode === "signup" ? "2px solid var(--accent)" : "2px solid transparent",
                color: mode === "signup" ? "var(--ink)" : "var(--ink-dim)",
                fontWeight: mode === "signup" ? 600 : 400,
                cursor: "pointer",
                fontFamily: "var(--sans)",
                fontSize: "15px",
              }}
            >
              Create Account
            </button>
          </div>
        )}

        
        {errorMessage && (
          <div
            className="form-error-summary"
            role="alert"
            style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}
          >
            <span aria-hidden="true">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        
        {successMessage && (
          <div
            role="status"
            style={{
              padding: "12px 16px",
              background: "var(--accent-dim, rgba(16, 185, 129, 0.1))",
              border: "1px solid var(--line)",
              borderRadius: "4px",
              marginBottom: "20px",
              fontSize: "14px",
              color: "var(--ink)",
            }}
          >
            ✓ {successMessage}
          </div>
        )}

        
        <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {mode !== "reset" && (
            <div className="field">
              <label htmlFor="auth-email">
                Email Address <span className="required-star" aria-hidden="true">*</span>
              </label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
              />
            </div>
          )}

          {mode !== "forgot" && (
            <div className="field">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label htmlFor="auth-password" style={{ margin: 0 }}>
                  {mode === "reset" ? "New Password" : "Password"}{" "}
                  <span className="required-star" aria-hidden="true">*</span>
                </label>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--accent)",
                      fontSize: "13px",
                      cursor: "pointer",
                      padding: 0,
                      textDecoration: "underline",
                    }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                id="auth-password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                required
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
              />
            </div>
          )}

          {mode === "reset" && (
            <div className="field">
              <label htmlFor="auth-confirm-password">
                Confirm New Password <span className="required-star" aria-hidden="true">*</span>
              </label>
              <input
                id="auth-confirm-password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={submitting}
              />
            </div>
          )}

          <button
            className="btn btn-start"
            type="submit"
            disabled={submitting}
            style={{ marginTop: "8px", width: "100%", justifyContent: "center" }}
          >
            {submitting
              ? "Processing..."
              : mode === "signin"
              ? "Sign In →"
              : mode === "signup"
              ? "Register Account →"
              : mode === "forgot"
              ? "Send Recovery Email →"
              : "Update Password →"}
          </button>

          {mode === "forgot" && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setMode("signin");
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              style={{ width: "100%", justifyContent: "center" }}
            >
              ← Back to Sign In
            </button>
          )}
        </form>

        
        {(mode === "signin" || mode === "signup") && (
          <div style={{ marginTop: "24px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                textAlign: "center",
                color: "var(--ink-dim)",
                fontSize: "13px",
                margin: "16px 0",
              }}
            >
              <div style={{ flex: 1, height: "1px", background: "var(--line)" }} />
              <span style={{ padding: "0 12px", fontFamily: "var(--mono)" }}>OR CONTINUE WITH</span>
              <div style={{ flex: 1, height: "1px", background: "var(--line)" }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => handleOAuth("google")}
                disabled={submitting}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  width: "100%",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1c0 2.8.7 5.4 1.9 7.8l3.7-2.9c-.2-.7-.4-1.5-.4-2.3z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
                  />
                </svg>
                <span>Google</span>
              </button>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => handleOAuth("github")}
                disabled={submitting}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  width: "100%",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
                <span>GitHub</span>
              </button>
            </div>
          </div>
        )}

        <footer style={{ marginTop: "24px", textAlign: "center", fontSize: "13px", color: "var(--ink-dim)" }}>
          <span>Protected with Supabase Auth · </span>
          <Link to="/privacy">Privacy Notice</Link>
        </footer>
      </section>
    </main>
  );
}
