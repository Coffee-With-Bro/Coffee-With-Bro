import { useEffect, useState } from "react";
import { API_URL, type TranslationSessionRecord } from "../lib/signTranslator";

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreTranscript: (text: string) => void;
}

export function HistoryModal({ isOpen, onClose, onRestoreTranscript }: HistoryModalProps) {
  const [sessions, setSessions] = useState<TranslationSessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    fetch(`${API_URL}/sessions`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: TranslationSessionRecord[]) => {
        if (!cancelled) {
          setSessions(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? `Could not connect to backend at ${API_URL}: ${err.message}`
              : "Failed to load session history",
          );
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  async function handleClearAll() {
    if (!window.confirm("Clear all recorded sessions from local database?")) return;
    try {
      await fetch(`${API_URL}/sessions`, { method: "DELETE" });
      setSessions([]);
    } catch {
      setError("Failed to clear sessions from database.");
    }
  }

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Saved Translation Sessions</h2>
            <p className="modal-sub">
              Persisted in local Spring Boot H2 database for review and auditing.
            </p>
          </div>
          <button className="btn btn-ghost modal-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        <div className="history-content">
          {loading && <p className="history-info">Loading sessions from local database…</p>}

          {error && (
            <div className="history-empty">
              <p className="history-warn">{error}</p>
              <p className="muted" style={{ fontSize: "13px", marginTop: "6px" }}>
                Make sure the Spring Boot service is running on port 8080 (<code>npm run dev:server</code>).
              </p>
            </div>
          )}

          {!loading && !error && sessions.length === 0 && (
            <div className="history-empty">
              <p>No translation sessions recorded yet.</p>
              <p className="muted" style={{ fontSize: "13px", marginTop: "4px" }}>
                Sign letters in the translator and click &quot;Save Session&quot; to store them here.
              </p>
            </div>
          )}

          {!loading && !error && sessions.length > 0 && (
            <div className="history-list">
              {sessions.map((s, idx) => (
                <div className="history-item" key={s.id ?? idx}>
                  <div className="history-item-top">
                    <span className="history-meta">
                      {s.createdAt
                        ? new Date(s.createdAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Recent"}
                      {" · "}
                      {s.letterCount} chars
                      {s.avgConfidence ? ` · ${Math.round(s.avgConfidence * 100)}% conf` : ""}
                    </span>
                    <button
                      className="btn btn-tiny"
                      onClick={() => {
                        onRestoreTranscript(s.transcript);
                        onClose();
                      }}
                      title="Load this transcript into main view"
                    >
                      Use
                    </button>
                  </div>
                  <p className="history-text">{s.transcript}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {sessions.length > 0 && (
            <button className="btn btn-ghost btn-danger" onClick={handleClearAll}>
              Clear Database
            </button>
          )}
          <button className="btn btn-ghost" onClick={onClose} style={{ marginLeft: "auto" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
