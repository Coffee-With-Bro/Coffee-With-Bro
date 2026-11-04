import { useState, useEffect } from "react";
import { API_URL, WS_URL, FALLBACK_API_URL, FALLBACK_WS_URL } from "../lib/signTranslator";
import { Link } from "../components/Link";
import { TranslationAnalytics } from "../components/TranslationAnalytics";

interface SystemStatus {
  status: string;
  appName: string;
  modelLoaded: boolean;
  modelPath: string;
  labelsPath: string;
  supportedClassesCount: number;
  sampleClasses: string[];
  offlineOnly: boolean;
  totalSessionsRecorded: number;
  timestamp: string;
}

interface SupportedSigns {
  totalClasses: number;
  digits: string[];
  letters: string[];
  inputResolution: string;
  inferenceEngine: string;
  offlineMode: boolean;
}

interface DictionaryInfo {
  totalWords: number;
}

type WsProbeStatus = "probing" | "online" | "standby" | "unreachable";

export function Diagnostics() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [supportedSigns, setSupportedSigns] = useState<SupportedSigns | null>(null);
  const [dictInfo, setDictInfo] = useState<DictionaryInfo | null>(null);
  const [wsStatus, setWsStatus] = useState<WsProbeStatus>("probing");
  const [wsLatencyMs, setWsLatencyMs] = useState<number | null>(null);
  const [httpLatencyMs, setHttpLatencyMs] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;

    // 1. Probe WebSocket reachability (with automatic port fallback)
    const wsStartTime = performance.now();
    const probeWs = (targetUrl: string, isFallback: boolean) => {
      try {
        const ws = new WebSocket(targetUrl);
        const timer = window.setTimeout(() => {
          ws.close();
          if (!cancelled) setWsStatus("unreachable");
        }, 3000);

        ws.onopen = () => {
          window.clearTimeout(timer);
          const roundtrip = Math.round(performance.now() - wsStartTime);
          if (!cancelled) {
            setWsLatencyMs(roundtrip);
            setWsStatus("online");
          }
          ws.close();
        };

        ws.onerror = () => {
          window.clearTimeout(timer);
          if (!isFallback && targetUrl !== FALLBACK_WS_URL) {
            probeWs(FALLBACK_WS_URL, true);
          } else if (!cancelled) {
            setWsStatus("unreachable");
          }
        };
      } catch {
        if (!isFallback && targetUrl !== FALLBACK_WS_URL) {
          probeWs(FALLBACK_WS_URL, true);
        } else if (!cancelled) {
          setWsStatus("unreachable");
        }
      }
    };
    probeWs(WS_URL, false);

    // 2. Fetch REST API endpoints with automatic port fallback
    const t0 = performance.now();
    const fetchWithFallback = async (endpoint: string) => {
      try {
        const res = await fetch(`${API_URL}${endpoint}`);
        if (res.ok) return res;
      } catch {
        // Probe fallback port if primary is unreachable
      }
      return fetch(`${FALLBACK_API_URL}${endpoint}`);
    };

    Promise.all([
      fetchWithFallback("/status"),
      fetchWithFallback("/supported-signs"),
      fetchWithFallback("/dictionary/count"),
    ])
      .then(async ([statusRes, signsRes, dictRes]) => {
        const roundtrip = Math.round(performance.now() - t0);
        if (!statusRes.ok) {
          throw new Error(`Status endpoint returned HTTP ${statusRes.status}`);
        }
        const statusData: SystemStatus = await statusRes.json();
        const signsData: SupportedSigns = signsRes.ok ? await signsRes.json() : null;
        const dictData: DictionaryInfo = dictRes.ok ? await dictRes.json() : null;

        if (!cancelled) {
          setHttpLatencyMs(roundtrip);
          setSystemStatus(statusData);
          setSupportedSigns(signsData);
          setDictInfo(dictData);
          setLastCheckTime(new Date());
          setApiError(null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setApiError(
            err instanceof Error
              ? `${err.message} (Target: ${API_URL})`
              : "Could not reach Spring Boot backend service.",
          );
          setSystemStatus(null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refreshTrigger]);

  const handleManualRefresh = () => {
    setLoading(true);
    setWsStatus("probing");
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <main className="page diagnostics-page">
      <header className="page-head">
        <p className="eyebrow">System Telemetry &amp; Health Verification</p>
        <h1 className="page-title">Diagnostics Dashboard</h1>
        <p className="lede">
          Real-time measurement of backend server availability, CNN model readiness,
          WebSocket responsiveness, and database persistence.
        </p>

        <div className="diagnostics-toolbar">
          <button
            type="button"
            className="btn btn-start"
            onClick={handleManualRefresh}
            disabled={loading}
          >
            {loading ? "Refreshing Telemetry…" : "↻ Refresh Diagnostics"}
          </button>
          <Link to="/" className="btn btn-ghost">
            ← Return to Translator
          </Link>
          {lastCheckTime && (
            <span className="diagnostics-timestamp">
              Last check: {lastCheckTime.toLocaleTimeString()}
            </span>
          )}
        </div>
      </header>

      {/* ERROR / DISCONNECTED STATE */}
      {apiError && (
        <section className="diagnostics-alert-banner" role="alert">
          <div className="alert-badge">BACKEND OFFLINE</div>
          <div>
            <h3>Unable to establish connection to Spring Boot backend</h3>
            <p className="alert-details">{apiError}</p>
            <p className="alert-hint">
              Ensure the Java backend service is started via:
              <code>npm run dev:server</code> or <code>mvnw.cmd spring-boot:run</code> on port 8080.
            </p>
          </div>
        </section>
      )}

      {/* CORE TELEMETRY STATUS TILES */}
      <section className="diagnostics-grid" aria-label="Core Subsystem Health">
        {/* TILE 1: Backend Server */}
        <div className={`diag-card ${systemStatus ? "status-success" : "status-error"}`}>
          <div className="diag-card-top">
            <span className="diag-card-title">Spring Boot Server</span>
            <span className={`diag-pill ${systemStatus ? "pill-green" : "pill-red"}`}>
              {systemStatus ? "AVAILABLE" : "UNREACHABLE"}
            </span>
          </div>
          <div className="diag-card-metric">
            {systemStatus ? (
              <>
                <span className="diag-value">HTTP 200 OK</span>
                <span className="diag-sub">
                  Latency: {httpLatencyMs !== null ? `${httpLatencyMs}ms` : "–"}
                </span>
              </>
            ) : (
              <>
                <span className="diag-value text-danger">Connection Refused</span>
                <span className="diag-sub">{API_URL}</span>
              </>
            )}
          </div>
          <div className="diag-meta-list">
            <div>
              <strong>Service:</strong> {systemStatus?.appName ?? "coffee_with_bro"}
            </div>
            <div>
              <strong>Mode:</strong> {systemStatus?.offlineOnly ? "100% Offline (Zero Cloud)" : "–"}
            </div>
          </div>
        </div>

        {/* TILE 2: CNN Model Readiness */}
        <div
          className={`diag-card ${
            systemStatus?.modelLoaded ? "status-success" : "status-warning"
          }`}
        >
          <div className="diag-card-top">
            <span className="diag-card-title">DL4J CNN Inference</span>
            <span
              className={`diag-pill ${
                systemStatus?.modelLoaded ? "pill-green" : "pill-amber"
              }`}
            >
              {systemStatus?.modelLoaded ? "MODEL READY" : "STANDBY MODE"}
            </span>
          </div>
          <div className="diag-card-metric">
            <span className="diag-value">
              {systemStatus?.modelLoaded ? "Neural Net Active" : "Heuristic Standby"}
            </span>
            <span className="diag-sub">
              Engine: {supportedSigns?.inferenceEngine ?? "DeepLearning4j CNN"}
            </span>
          </div>
          <div className="diag-meta-list">
            <div>
              <strong>Weights:</strong> <code>{systemStatus?.modelPath ?? "models/asl_cnn_model.zip"}</code>
            </div>
            <div>
              <strong>Labels:</strong> <code>{systemStatus?.labelsPath ?? "models/labels.txt"}</code>
            </div>
          </div>
        </div>

        {/* TILE 3: WebSocket Transport */}
        <div
          className={`diag-card ${
            wsStatus === "online"
              ? "status-success"
              : wsStatus === "probing"
              ? "status-neutral"
              : "status-error"
          }`}
        >
          <div className="diag-card-top">
            <span className="diag-card-title">WebSocket Channel</span>
            <span
              className={`diag-pill ${
                wsStatus === "online"
                  ? "pill-green"
                  : wsStatus === "probing"
                  ? "pill-blue"
                  : "pill-red"
              }`}
            >
              {wsStatus === "online"
                ? "CONNECTED"
                : wsStatus === "probing"
                ? "TESTING…"
                : "CLOSED"}
            </span>
          </div>
          <div className="diag-card-metric">
            <span className="diag-value">
              {wsStatus === "online" ? "Echo Handler Active" : wsStatus === "probing" ? "Probing Socket" : "Socket Offline"}
            </span>
            <span className="diag-sub">
              {wsLatencyMs !== null ? `Roundtrip Ping: ${wsLatencyMs}ms` : "Endpoint: /ws/echo"}
            </span>
          </div>
          <div className="diag-meta-list">
            <div>
              <strong>URL:</strong> <code>{WS_URL}</code>
            </div>
            <div>
              <strong>Transport:</strong> Text/JSON over WS
            </div>
          </div>
        </div>

        {/* TILE 4: In-Memory H2 Database */}
        <div className={`diag-card ${systemStatus ? "status-success" : "status-error"}`}>
          <div className="diag-card-top">
            <span className="diag-card-title">H2 In-Memory DB</span>
            <span className={`diag-pill ${systemStatus ? "pill-green" : "pill-red"}`}>
              {systemStatus ? "CONNECTED" : "DISCONNECTED"}
            </span>
          </div>
          <div className="diag-card-metric">
            <span className="diag-value">
              {systemStatus ? `${systemStatus.totalSessionsRecorded} Saved Sessions` : "Offline"}
            </span>
            <span className="diag-sub">JPA Hibernate 7 / Spring Data</span>
          </div>
          <div className="diag-meta-list">
            <div>
              <strong>Console:</strong> <code>http://localhost:8080/h2-console</code>
            </div>
            <div>
              <strong>Target:</strong> <code>jdbc:h2:mem:coffeewithbro</code>
            </div>
          </div>
        </div>

        {/* TILE 5: Dictionary Subsystem */}
        <div className={`diag-card ${dictInfo ? "status-success" : "status-error"}`}>
          <div className="diag-card-top">
            <span className="diag-card-title">Dictionary Subsystem</span>
            <span className={`diag-pill ${dictInfo ? "pill-green" : "pill-red"}`}>
              {dictInfo ? "ACTIVE" : "OFFLINE"}
            </span>
          </div>
          <div className="diag-card-metric">
            <span className="diag-value">
              {dictInfo ? `${dictInfo.totalWords} Lexicon Words` : "Unavailable"}
            </span>
            <span className="diag-sub">In-Memory NavigableSet Lexicon</span>
          </div>
          <div className="diag-meta-list">
            <div>
              <strong>Capabilities:</strong> Prefix autocomplete &amp; word validation
            </div>
            <div>
              <strong>Latency:</strong> Instant O(log N) lookup
            </div>
          </div>
        </div>
      </section>

      {/* SUPPORTED RECOGNITION CLASSES BREAKDOWN */}
      {supportedSigns && (
        <section className="panel diag-classes-panel" aria-label="Supported Sign Classes">
          <div className="diag-panel-header">
            <div>
              <h2 className="section-title">
                Supported Recognition Classes ({supportedSigns.totalClasses} Total)
              </h2>
              <p className="muted" style={{ margin: "4px 0 16px" }}>
                Input resolution: <strong>{supportedSigns.inputResolution}</strong> · Static gesture fingerspelling
              </p>
            </div>
          </div>

          <div className="diag-class-group">
            <h4 className="diag-group-title">Letters (A–Z) — {supportedSigns.letters.length} Classes</h4>
            <div className="diag-chips-wrap">
              {supportedSigns.letters.map((letter) => (
                <span key={letter} className="diag-class-badge">
                  {letter}
                </span>
              ))}
            </div>
          </div>

          <div className="diag-class-group" style={{ marginTop: "16px" }}>
            <h4 className="diag-group-title">Digits (0–9) — {supportedSigns.digits.length} Classes</h4>
            <div className="diag-chips-wrap">
              {supportedSigns.digits.map((digit) => (
                <span key={digit} className="diag-class-badge diag-digit-badge">
                  {digit}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* REAL TRANSLATION SESSION ANALYTICS */}
      <TranslationAnalytics />
    </main>
  );
}
