import { useCallback, useEffect, useRef, useState } from "react";
import {
  CAPTURE_INTERVAL_MS,
  CAPTURE_QUALITY,
  CAPTURE_WIDTH,
  COMMIT_COOLDOWN_MS,
  CONFIDENCE_THRESHOLD,
  RECONNECT_DELAY_MS,
  STABLE_FRAMES_TO_COMMIT,
  WS_URL,
  type ConnectionStatus,
  type Prediction,
} from "../lib/signTranslator";

export function useSignTranslator() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement("canvas"));
  const socketRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureTimerRef = useRef<number | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  // Commit-stability bookkeeping, kept in refs so it survives across frames
  // without re-subscribing the socket's onmessage handler.
  const streakLabelRef = useRef<string | null>(null);
  const streakCountRef = useRef(0);
  const cooldownUntilRef = useRef(0);
  const wantStreamingRef = useRef(false);

  const [cameraOn, setCameraOn] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [liveGuess, setLiveGuess] = useState<Prediction | null>(null);
  const [transcript, setTranscript] = useState("");

  const commitLetter = useCallback((label: string) => {
    setTranscript((prev) => prev + label);
  }, []);

  const handlePrediction = useCallback(
    (prediction: Prediction) => {
      setLiveGuess(prediction);

      if (prediction.confidence < CONFIDENCE_THRESHOLD) {
        streakLabelRef.current = null;
        streakCountRef.current = 0;
        return;
      }

      if (streakLabelRef.current === prediction.label) {
        streakCountRef.current += 1;
      } else {
        streakLabelRef.current = prediction.label;
        streakCountRef.current = 1;
      }

      const now = Date.now();
      if (
        streakCountRef.current >= STABLE_FRAMES_TO_COMMIT &&
        now >= cooldownUntilRef.current
      ) {
        commitLetter(prediction.label);
        cooldownUntilRef.current = now + COMMIT_COOLDOWN_MS;
        // Require the streak to build again before the same letter can
        // repeat, so holding a sign doesn't spam it once cooldown ends.
        streakCountRef.current = 0;
      }
    },
    [commitLetter],
  );

  const stopCaptureLoop = useCallback(() => {
    if (captureTimerRef.current !== null) {
      window.clearInterval(captureTimerRef.current);
      captureTimerRef.current = null;
    }
  }, []);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const socket = socketRef.current;
    if (!video || !socket || socket.readyState !== WebSocket.OPEN) return;
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

    const aspect = video.videoHeight / video.videoWidth || 3 / 4;
    const canvas = canvasRef.current;
    canvas.width = CAPTURE_WIDTH;
    canvas.height = Math.round(CAPTURE_WIDTH * aspect);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", CAPTURE_QUALITY);
    socket.send(dataUrl);
  }, []);

  const startCaptureLoop = useCallback(() => {
    stopCaptureLoop();
    captureTimerRef.current = window.setInterval(captureFrame, CAPTURE_INTERVAL_MS);
  }, [captureFrame, stopCaptureLoop]);

  const connectSocket = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    setStatus((prev) => (prev === "open" ? prev : "connecting"));
    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;

    socket.onopen = () => {
      setStatus("open");
      if (wantStreamingRef.current) startCaptureLoop();
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as Prediction & { error?: string };
        if (data.error) return;
        handlePrediction({ label: data.label, confidence: data.confidence });
      } catch {
        // Ignore malformed frames rather than crash the UI.
      }
    };

    socket.onerror = () => {
      setStatus("error");
    };

    socket.onclose = () => {
      stopCaptureLoop();
      socketRef.current = null;
      if (wantStreamingRef.current) {
        setStatus("reconnecting");
        reconnectTimerRef.current = window.setTimeout(connectSocket, RECONNECT_DELAY_MS);
      } else {
        setStatus("closed");
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handlePrediction, startCaptureLoop, stopCaptureLoop]);

  const disconnectSocket = useCallback(() => {
    wantStreamingRef.current = false;
    stopCaptureLoop();
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    socketRef.current?.close();
    socketRef.current = null;
    setStatus("idle");
  }, [stopCaptureLoop]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
      wantStreamingRef.current = true;
      connectSocket();
    } catch (err) {
      setCameraError(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Camera access was denied. Allow camera access and try again."
          : "Couldn't reach a camera on this device.",
      );
    }
  }, [connectSocket]);

  const stopCamera = useCallback(() => {
    disconnectSocket();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
    setLiveGuess(null);
    streakLabelRef.current = null;
    streakCountRef.current = 0;
  }, [disconnectSocket]);

  const addSpace = useCallback(() => setTranscript((prev) => prev + " "), []);
  const backspace = useCallback(() => setTranscript((prev) => prev.slice(0, -1)), []);
  const clearTranscript = useCallback(() => setTranscript(""), []);

  useEffect(() => stopCamera, [stopCamera]);

  return {
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
  };
}
