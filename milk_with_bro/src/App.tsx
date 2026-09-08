import { useSignTranslator } from "./hooks/useSignTranslator";
import type { ConnectionStatus } from "./lib/signTranslator";
import "./App.css";

const STATUS_COPY: Record<ConnectionStatus, string> = {
  idle: "Camera off",
  connecting: "Connecting to translator…",
  open: "Reading signs",
  reconnecting: "Connection dropped — reconnecting…",
  closed: "Disconnected",
  error: "Couldn't reach the translator",
};

function App() {
  const {
    videoRef,
    cameraOn,
    cameraError,
    status,
    liveGuess,
    transcript,
    startCamera,
    stopCamera,
    addSpace,
    backspace,
    clearTranscript,
  } = useSignTranslator();

  const confidencePct = liveGuess ? Math.round(liveGuess.confidence * 100) : 0;

  return (
    <div id="root">
      <header className="topbar">
        <span className="topbar-mark">Coffee with Bro</span>
        <span className="topbar-sub">Sign language translator</span>
      </header>

      <main className="stage">
        <section className="viewfinder-wrap">
          <div className={`viewfinder ${cameraOn ? "is-live" : ""}`}>
            <video ref={videoRef} className="viewfinder-video" muted playsInline />

            {!cameraOn && (
              <div className="viewfinder-empty">
                <p>Turn on your camera to start signing.</p>
              </div>
            )}

            <span className="bracket bracket-tl" />
            <span className="bracket bracket-tr" />
            <span className="bracket bracket-bl" />
            <span className="bracket bracket-br" />

            {cameraOn && (
              <div className="readout">
                <span className="readout-letter">{liveGuess?.label ?? "–"}</span>
                <div className="readout-meter">
                  <div
                    className="readout-meter-fill"
                    style={{ width: `${confidencePct}%` }}
                  />
                </div>
                <span className="readout-pct">{confidencePct}%</span>
              </div>
            )}
          </div>

          <div className="controls">
            <button
              className={cameraOn ? "btn btn-stop" : "btn btn-start"}
              onClick={cameraOn ? stopCamera : startCamera}
            >
              {cameraOn ? "Turn off camera" : "Turn on camera"}
            </button>
            <span className={`status status-${status}`}>
              <span className="status-dot" />
              {STATUS_COPY[status]}
            </span>
          </div>

          {cameraError && <p className="error">{cameraError}</p>}
        </section>

        <section className="transcript-wrap">
          <div className="transcript">
            {transcript.length === 0 ? (
              <span className="transcript-placeholder">
                Signed letters will build a sentence here.
              </span>
            ) : (
              transcript
            )}
            <span className="cursor" />
          </div>

          <div className="transcript-controls">
            <button className="btn btn-ghost" onClick={addSpace}>
              Space
            </button>
            <button className="btn btn-ghost" onClick={backspace}>
              Backspace
            </button>
            <button className="btn btn-ghost" onClick={clearTranscript}>
              Clear
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
