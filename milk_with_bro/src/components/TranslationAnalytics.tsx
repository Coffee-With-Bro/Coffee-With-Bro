import { useState, useEffect } from "react";
import { API_URL } from "../lib/signTranslator";

export interface SessionStats {
  totalSessions: number;
  totalLettersTranslated: number;
  averageConfidence: number;
  averageDurationSeconds: number;
  mostRecentSessionTime: string | null;
}

interface TranslationAnalyticsProps {
  compact?: boolean;
}

export function TranslationAnalytics({ compact = false }: TranslationAnalyticsProps) {
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_URL}/sessions/stats`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data: SessionStats) => {
        if (!cancelled) {
          setStats(data);
          setLastUpdated(new Date());
          setLoading(false);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? `Could not reach backend analytics at ${API_URL}: ${err.message}`
              : "Failed to load translation session analytics",
          );
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refreshTrigger]);

  const handleRefresh = () => {
    setLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  const formatTimestamp = (isoStr: string | null) => {
    if (!isoStr) return "No activity recorded";
    try {
      const d = new Date(isoStr);
      return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <section className={`analytics-container ${compact ? "is-compact" : ""}`} aria-label="Translation Session Analytics">
      <div className="analytics-header">
        <div>
          <h3 className="analytics-title">📊 Translation Session Analytics</h3>
          <p className="analytics-subtitle">
            Aggregated in real time from persistent H2 database records.
          </p>
        </div>
        <div className="analytics-actions">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh analytics metrics from backend"
          >
            {loading ? "Refreshing…" : "↻ Refresh Stats"}
          </button>
        </div>
      </div>

      {loading && !stats && (
        <div className="analytics-loading">
          <span>Loading telemetry from Spring Boot backend…</span>
        </div>
      )}

      {error && (
        <div className="analytics-error-banner" role="alert">
          <span className="analytics-error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {stats && (
        <>
          {stats.totalSessions === 0 ? (
            <div className="analytics-empty-state">
              <span className="analytics-empty-icon">📂</span>
              <p className="analytics-empty-title">Database Is Empty</p>
              <p className="analytics-empty-desc">
                No translation sessions have been saved yet. Sign letters in the translator
                and click &ldquo;💾 Save&rdquo; to persist transcripts and view real analytics.
              </p>
            </div>
          ) : (
            <div className="analytics-grid">
              <div className="analytics-card">
                <span className="analytics-card-label">Total Saved Sessions</span>
                <span className="analytics-card-value">{stats.totalSessions.toLocaleString()}</span>
                <span className="analytics-card-hint">Persisted JPA records</span>
              </div>

              <div className="analytics-card">
                <span className="analytics-card-label">Characters Translated</span>
                <span className="analytics-card-value">
                  {stats.totalLettersTranslated.toLocaleString()}
                </span>
                <span className="analytics-card-hint">Total recognized characters</span>
              </div>

              <div className="analytics-card">
                <span className="analytics-card-label">Average Confidence</span>
                <span className="analytics-card-value">
                  {Math.round(stats.averageConfidence * 100)}%
                </span>
                <span className="analytics-card-hint">DL4J CNN inference accuracy</span>
              </div>

              <div className="analytics-card">
                <span className="analytics-card-label">Avg Session Duration</span>
                <span className="analytics-card-value">
                  {stats.averageDurationSeconds < 60
                    ? `${stats.averageDurationSeconds}s`
                    : `${Math.round(stats.averageDurationSeconds / 6) / 10}m`}
                </span>
                <span className="analytics-card-hint">Active translation time</span>
              </div>

              <div className="analytics-card analytics-card-wide">
                <span className="analytics-card-label">Most Recent Activity</span>
                <span className="analytics-card-value-sm">
                  {formatTimestamp(stats.mostRecentSessionTime)}
                </span>
                <span className="analytics-card-hint">
                  {lastUpdated
                    ? `Last checked: ${lastUpdated.toLocaleTimeString()}`
                    : "Synchronized with backend"}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
