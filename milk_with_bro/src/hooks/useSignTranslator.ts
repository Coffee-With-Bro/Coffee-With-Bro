import { useCallback, useEffect, useRef, useState } from "react";
import {
  CAPTURE_INTERVAL_MS,
  CAPTURE_QUALITY,
  CAPTURE_WIDTH,
  COMMIT_COOLDOWN_MS,
  CONFIDENCE_THRESHOLD,
  FALLBACK_WS_URL,
  RECONNECT_DELAY_MS,
  STABLE_FRAMES_TO_COMMIT,
  WS_URL,
  type ConnectionStatus,
  type Prediction,
} from "../lib/signTranslator";

export function useSignTranslator() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureTimerRef = useRef<number | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

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
    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvasRef.current = canvas;
    }
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

  const connectSocketRef = useRef<(useFallback?: boolean) => void>(() => {});

  const connectSocket = useCallback(
    (useFallback = false) => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      setStatus((prev) => (prev === "open" ? prev : "connecting"));
      const targetUrl = useFallback ? FALLBACK_WS_URL : WS_URL;
      const socket = new WebSocket(targetUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        setStatus("open");
        if (wantStreamingRef.current) startCaptureLoop();
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as Prediction & {
            type?: string;
            status?: string;
            modelLoaded?: boolean;
            error?: string;
          };

          
          if (data.type === "connection_status" || data.status === "online") {
            setStatus("open");
            return;
          }

          
          if (data.label !== undefined) {
            handlePrediction({
              label: data.label,
              confidence:
                typeof data.confidence === "number" ? data.confidence : 0,
            });
          }
        } catch {
          return;
        }
      };

      socket.onerror = () => {
        if (!useFallback && targetUrl !== FALLBACK_WS_URL) {
          
          connectSocketRef.current(true);
          return;
        }
        setStatus("error");
      };

      socket.onclose = () => {
        stopCaptureLoop();
        socketRef.current = null;
        if (wantStreamingRef.current) {
          setStatus("reconnecting");
          reconnectTimerRef.current = window.setTimeout(
            () => connectSocketRef.current(false),
            RECONNECT_DELAY_MS,
          );
        } else {
          setStatus("closed");
        }
      };
    },
    [handlePrediction, startCaptureLoop, stopCaptureLoop],
  );

  useEffect(() => {
    connectSocketRef.current = connectSocket;
  }, [connectSocket]);

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
      connectSocket(false);
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
    setTranscript,
    commitLetter,
    simulatePrediction: handlePrediction,
  };
}
