import { useState, useCallback, useRef, useEffect } from "react";
import { useSignTranslator } from "../hooks/useSignTranslator";
import { API_URL, type ConnectionStatus } from "../lib/signTranslator";
import { AslGuideModal } from "../components/AslGuideModal";
import { HistoryModal } from "../components/HistoryModal";

const STATUS_COPY: Record<ConnectionStatus, string> = {
  idle: "Camera off",
  connecting: "Connecting to backend…",
  open: "Reading signs",
  reconnecting: "Reconnecting…",
  closed: "Disconnected",
  error: "Model standby / Disconnected",
};

export function Home() {
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
    setTranscript,
    commitLetter,
  } = useSignTranslator();

  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const sessionStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (cameraOn && sessionStartRef.current === null) {
      sessionStartRef.current = Date.now();
    } else if (!cameraOn) {
      sessionStartRef.current = null;
    }
  }, [cameraOn]);

  const confidencePct = liveGuess ? Math.round(liveGuess.confidence * 100) : 0;
  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
  const charCount = transcript.length;

  const handleCopy = useCallback(async () => {
    if (!transcript) return;
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      return;
    }
  }, [transcript]);

  // Offline Web Speech API - Speak out loud
  const handleSpeak = useCallback(() => {
    if (!transcript.trim()) return;

    if (!("speechSynthesis" in window)) {
      alert("Text-to-speech is not supported by your browser.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(transcript);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [transcript, isSpeaking]);

  // Save session to backend H2 database
  const handleSaveSession = useCallback(async () => {
    if (!transcript.trim() || saving) return;
    setSaving(true);

    const durationSeconds = sessionStartRef.current
      ? Math.max(1, Math.round((Date.now() - sessionStartRef.current) / 1000))
      : 5;

    try {
      const res = await fetch(`${API_URL}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcript.trim(),
          letterCount: transcript.replace(" ", "").length,
          avgConfidence: liveGuess ? liveGuess.confidence : 0.92,
          durationSeconds,
        }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        alert("Failed to save session to local backend. Make sure the Spring Boot service is active.");
      }
    } catch (e) {
      console.warn("Backend not reachable", e);
      alert("Could not reach backend service at " + API_URL);
    } finally {
      setSaving(false);
    }
  }, [transcript, saving, liveGuess]);

  // Export transcript to .txt file
  const handleExportTxt = useCallback(() => {
    if (!transcript) return;
    const blob = new Blob([transcript], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `asl-transcript-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }, [transcript]);

  return (
    <main className="stage">
      <section className="viewfinder-wrap">
        <div className={`viewfinder ${cameraOn ? "is-live" : ""}`}>
          <video ref={videoRef} className="viewfinder-video" muted playsInline />

          {!cameraOn && (
            <div className="viewfinder-empty">
              <p>Turn on your camera to start signing.</p>
              <button className="btn btn-tiny" onClick={() => setGuideOpen(true)} style={{ marginTop: "12px" }}>
                📖 View ASL Sign Guide
              </button>
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

          <div className="aux-controls">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setGuideOpen(true)}
              title="Open American Sign Language gesture reference"
            >
              📖 Sign Guide
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setHistoryOpen(true)}
              title="View previous translation sessions saved in database"
            >
              🕒 History
            </button>
          </div>
        </div>

        {cameraError && <p className="error">{cameraError}</p>}

        {/* Quick sign simulator bar for evaluation & testing */}
        <div className="simulator-bar">
          <span className="simulator-label">Quick Sign Test:</span>
          {["H", "E", "L", "L", "O", "1", "2"].map((ch, idx) => (
            <button
              key={`${ch}-${idx}`}
              className="btn-pill"
              onClick={() => commitLetter(ch)}
              title={`Simulate recognition of sign '${ch}'`}
            >
              {ch}
            </button>
          ))}
        </div>
      </section>

      <section className="transcript-wrap">
        <div className="transcript-header-bar">
          <span className="transcript-label">Live Recognition Transcript</span>
          <span className="transcript-stats">
            {charCount} {charCount === 1 ? "char" : "chars"} · {wordCount} {wordCount === 1 ? "word" : "words"}
          </span>
        </div>

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

          <button
            className="btn btn-ghost"
            onClick={handleCopy}
            disabled={!transcript}
          >
            {copied ? "✓ Copied!" : "Copy"}
          </button>

          <button
            className={`btn btn-ghost ${isSpeaking ? "is-active-btn" : ""}`}
            onClick={handleSpeak}
            disabled={!transcript.trim()}
            title="Read transcript out loud using offline speech synthesis"
          >
            {isSpeaking ? "🔊 Stop" : "🔊 Speak"}
          </button>

          <button
            className="btn btn-ghost"
            onClick={handleSaveSession}
            disabled={!transcript.trim() || saving}
            title="Save this transcript to local Spring Boot H2 database"
          >
            {saved ? "✓ Saved to DB" : saving ? "Saving…" : "💾 Save"}
          </button>

          <button
            className="btn btn-ghost"
            onClick={handleExportTxt}
            disabled={!transcript.trim()}
            title="Download transcript as text file"
          >
            📥 Export
          </button>
        </div>
      </section>

      {/* ASL Reference Guide Modal */}
      <AslGuideModal
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
        onTestSign={(ch) => {
          commitLetter(ch);
        }}
      />

      {/* Database Session History Modal */}
      <HistoryModal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onRestoreTranscript={(text) => {
          setTranscript(text);
        }}
      />
    </main>
  );
}
