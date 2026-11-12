import { useEffect, type ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import { navigate } from "../lib/useRoute";

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({ children, redirectTo = "/login" }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate(redirectTo);
    }
  }, [user, loading, redirectTo]);

  if (loading) {
    return (
      <div className="page" role="status" aria-live="polite">
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "48px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <span style={{ fontSize: "36px" }} aria-hidden="true">☕</span>
          <p style={{ fontFamily: "var(--mono)", fontSize: "14px", color: "var(--ink-dim)", margin: 0 }}>
            Verifying Supabase authentication session...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page" role="status" aria-live="polite">
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "48px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <span style={{ fontSize: "36px" }} aria-hidden="true">🔒</span>
          <p style={{ fontFamily: "var(--mono)", fontSize: "14px", color: "var(--ink-dim)", margin: 0 }}>
            Protected route. Redirecting to sign in...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

