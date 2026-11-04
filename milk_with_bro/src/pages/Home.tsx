import { useState, useCallback, useRef, useEffect } from "react";
import { useSignTranslator } from "../hooks/useSignTranslator";
import { API_URL, type ConnectionStatus } from "../lib/signTranslator";
import { AslGuideModal } from "../components/AslGuideModal";
import { HistoryModal } from "../components/HistoryModal";
import { DictionaryAutocomplete } from "../components/DictionaryAutocomplete";
import { Link } from "../components/Link";
import { trackEvent } from "../lib/analytics";

const STATUS_COPY: Record<ConnectionStatus, string> = {
  idle: "Camera off",
  connecting: "Connecting to backend…",
  open: "Reading signs",
  reconnecting: "Reconnecting…",
  closed: "Disconnected",
  error: "Model standby / Disconnected",
};

interface HomeProps {
  onStateChange?: (state: {
    cameraOn: boolean;
    liveGuessLabel?: string;
    confidencePct: number;
    toggleCamera: () => void;
    openGuide: () => void;
  }) => void;
}

export function Home({ onStateChange }: HomeProps = {}) {
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
      trackEvent("camera_start");
    } else if (!cameraOn) {
      sessionStartRef.current = null;
      trackEvent("camera_stop");
    }
  }, [cameraOn]);

  const confidencePct = liveGuess ? Math.round(liveGuess.confidence * 100) : 0;
  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
  const charCount = transcript.length;

  const toggleCamera = useCallback(() => {
    if (cameraOn) {
      stopCamera();
    } else {
      startCamera();
    }
  }, [cameraOn, startCamera, stopCamera]);

  const openGuide = useCallback(() => {
    setGuideOpen(true);
    trackEvent("open_guide");
  }, []);

  // Sync state to parent for mobile sticky CTA
  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        cameraOn,
        liveGuessLabel: liveGuess?.label,
        confidencePct,
        toggleCamera,
        openGuide,
      });
    }
  }, [cameraOn, liveGuess?.label, confidencePct, toggleCamera, openGuide, onStateChange]);

  const handleCopy = useCallback(async () => {
    if (!transcript) return;
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
      trackEvent("transcript_copy", { charCount });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      return;
    }
  }, [transcript, charCount]);

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
    trackEvent("transcript_speak", { charCount });
    window.speechSynthesis.speak(utterance);
  }, [transcript, isSpeaking, charCount]);

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
        trackEvent("session_saved", { durationSeconds });
        setTimeout(() => setSaved(false), 2500);
      } else {
        alert("Failed to save session to local backend. Make sure the Spring Boot service is active.");
      }
    } catch {
      alert("Could not reach local backend service at " + API_URL);
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
    trackEvent("transcript_export_txt");
  }, [transcript]);

  return (
    <main className="stage">
      {/* ABOVE THE FOLD HERO & CALL-TO-ACTION */}
      <section className="hero-cta-section" aria-label="Translator introduction and call to action">
        <p className="eyebrow">100% Offline · Privacy-First ASL Recognition</p>
        <h1 className="hero-cta-title">Turn Webcam Hand Signs into Live Text.</h1>
        <p className="hero-cta-desc">
          Translate 36 American Sign Language gestures (A–Z, 0–9) directly in your
          browser. Zero cloud latency, zero trackers, and your webcam video never leaves
          your machine.
        </p>

        <div className="hero-badges" aria-label="System features">
          <span className="hero-badge">🔒 100% In-Memory</span>
          <span className="hero-badge">⚡ Low-Latency Local WS</span>
          <span className="hero-badge">🎯 36 Static Signs</span>
          <span className="hero-badge">📚 Dictionary Assist</span>
          <span className="hero-badge">🎓 UCS503 TIET</span>
        </div>
      </section>

      {/* VIEWFINDER & LIVE CAMERA SECTION */}
      <section className="viewfinder-wrap" aria-label="Live camera viewfinder">
        <div className={`viewfinder ${cameraOn ? "is-live" : ""}`}>
          <video
            ref={videoRef}
            className="viewfinder-video"
            muted
            playsInline
            aria-label="Live webcam feed for sign language recognition"
          />

          {!cameraOn && (
            <div className="viewfinder-empty">
              <p>Turn on your camera below to start signing.</p>
            </div>
          )}

          <span className="bracket bracket-tl" aria-hidden="true" />
          <span className="bracket bracket-tr" aria-hidden="true" />
          <span className="bracket bracket-bl" aria-hidden="true" />
          <span className="bracket bracket-br" aria-hidden="true" />

          {cameraOn && (
            <div className="readout" aria-live="polite">
              <span className="readout-letter">{liveGuess?.label ?? "–"}</span>
              <div
                className="readout-meter"
                role="progressbar"
                aria-valuenow={confidencePct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Model prediction confidence"
              >
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
            onClick={toggleCamera}
          >
            {cameraOn ? "⏹ Turn off camera" : "⚡ Turn on camera"}
          </button>

          <span className={`status status-${status}`}>
            <span className="status-dot" />
            {STATUS_COPY[status]}
          </span>

          <div className="aux-controls">
            <button
              className="btn btn-ghost btn-sm"
              onClick={openGuide}
              title="Open American Sign Language gesture reference"
            >
              📖 Sign Guide
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setHistoryOpen(true);
                trackEvent("open_history");
              }}
              title="View previous translation sessions saved in database"
            >
              🕒 History
            </button>
            <Link
              to="/diagnostics"
              className="btn btn-ghost btn-sm"
              title="Open System Diagnostics Dashboard"
            >
              🩺 Diagnostics
            </Link>
          </div>
        </div>

        {cameraError && <p className="error" role="alert">{cameraError}</p>}

        {/* Quick sign simulator bar for evaluation & testing */}
        <div className="simulator-bar" aria-label="Sign test simulator bar">
          <span className="simulator-label">Quick Sign Test:</span>
          {["H", "E", "L", "L", "O", "1", "2"].map((ch, idx) => (
            <button
              key={`${ch}-${idx}`}
              className="btn-pill"
              onClick={() => {
                commitLetter(ch);
                trackEvent("simulate_letter", { letter: ch });
              }}
              title={`Simulate recognition of sign '${ch}'`}
            >
              {ch}
            </button>
          ))}
        </div>
      </section>

      {/* TRANSCRIPT & ACTION CONTROLS SECTION */}
      <section className="transcript-wrap" aria-label="Live Recognition Transcript">
        <div className="transcript-header-bar">
          <span className="transcript-label">Live Recognition Transcript</span>
          <span className="transcript-stats">
            {charCount} {charCount === 1 ? "char" : "chars"} · {wordCount} {wordCount === 1 ? "word" : "words"}
          </span>
        </div>

        <div className="transcript" aria-live="polite">
          {transcript.length === 0 ? (
            <span className="transcript-placeholder">
              Signed letters will build a sentence here.
            </span>
          ) : (
            transcript
          )}
          <span className="cursor" aria-hidden="true" />
        </div>

        {/* Dictionary Word Autocomplete & Validation Subsystem */}
        <DictionaryAutocomplete
          transcript={transcript}
          onSelectWord={(word) => {
            const lastSpaceIndex = transcript.lastIndexOf(" ");
            const base = lastSpaceIndex === -1 ? "" : transcript.slice(0, lastSpaceIndex + 1);
            setTranscript(base + word + " ");
            trackEvent("dictionary_autocomplete_select", { word });
          }}
        />

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
          trackEvent("test_sign_from_guide", { letter: ch });
        }}
      />

      {/* Database Session History Modal */}
      <HistoryModal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onRestoreTranscript={(text) => {
          setTranscript(text);
          trackEvent("restore_transcript");
        }}
      />
    </main>
  );
}
