import { useCallback, useEffect, useRef, useState } from "react";
import type { HandLandmarker } from "@mediapipe/tasks-vision";
import { createHandTracker, landmarkFeatures, type LandmarkSample } from "../lib/handTracking";
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
  const trackerRef = useRef<HandLandmarker | null>(null);
  const landmarkSampleRef = useRef<LandmarkSample>({ timestamp: 0, features: null });
  const lastCaptureRef = useRef(0);
  const awaitingPredictionRef = useRef(false);
  const aslEnabledRef = useRef(true);
  const startingRef = useRef(false);
  const cameraGenerationRef = useRef(0);

  const streakLabelRef = useRef<string | null>(null);
  const streakCountRef = useRef(0);
  const cooldownUntilRef = useRef(0);
  const lastCommittedRef = useRef<string | null>(null);
  const wantStreamingRef = useRef(false);

  const [cameraOn, setCameraOn] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [liveGuess, setLiveGuess] = useState<Prediction | null>(null);
  const [transcript, setTranscript] = useState("");
  const [trackingStatus, setTrackingStatus] = useState("Camera off");
  const [modelReady, setModelReady] = useState(false);
  const [mode, setMode] = useState<"asl" | "personal">("asl");

  useEffect(() => { aslEnabledRef.current = mode === "asl"; }, [mode]);
  const getLandmarkSample = useCallback(() => landmarkSampleRef.current, []);

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
        lastCommittedRef.current !== prediction.label &&
        streakCountRef.current >= STABLE_FRAMES_TO_COMMIT &&
        now >= cooldownUntilRef.current
      ) {
        commitLetter(prediction.label);
        lastCommittedRef.current = prediction.label;
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
    if (!video) return;
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !trackerRef.current) return;
    const now = performance.now();
    let handRegion: { x: number; y: number; width: number; height: number } | undefined;
    try {
      const hands = trackerRef.current.detectForVideo(video, now);
      const features = landmarkFeatures(hands);
      landmarkSampleRef.current = { timestamp: now, features };
      setTrackingStatus(features ? `${hands.landmarks.length} hand${hands.landmarks.length === 1 ? "" : "s"} tracked` : "No hand detected");
      if (!features) {
        setLiveGuess(null);
        streakLabelRef.current = null;
        streakCountRef.current = 0;
        lastCommittedRef.current = null;
        return;
      }
      // The ASL-HG images tightly frame one hand. Match that framing locally.
      const regions = hands.landmarks.map(points => {
        const left = Math.min(...points.map(p => p.x)), right = Math.max(...points.map(p => p.x));
        const top = Math.min(...points.map(p => p.y)), bottom = Math.max(...points.map(p => p.y));
        const padX = (right - left) * .2, padY = (bottom - top) * .2;
        const x = Math.max(0, left - padX), y = Math.max(0, top - padY);
        return { x, y, width: Math.min(1, right + padX) - x, height: Math.min(1, bottom + padY) - y };
      });
      handRegion = regions.sort((a, b) => b.width * b.height - a.width * a.height)[0];
    } catch {
      setTrackingStatus("Hand tracking failed; restart the camera");
      landmarkSampleRef.current = { timestamp: now, features: null };
      return;
    }
    if (!socket || socket.readyState !== WebSocket.OPEN || !aslEnabledRef.current || awaitingPredictionRef.current || now - lastCaptureRef.current < CAPTURE_INTERVAL_MS) return;

    if (!handRegion || handRegion.width <= 0 || handRegion.height <= 0) return;
    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvasRef.current = canvas;
    }
    canvas.width = CAPTURE_WIDTH;
    canvas.height = CAPTURE_WIDTH;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, handRegion.x * video.videoWidth, handRegion.y * video.videoHeight,
      handRegion.width * video.videoWidth, handRegion.height * video.videoHeight,
      0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", CAPTURE_QUALITY);
    lastCaptureRef.current = now;
    awaitingPredictionRef.current = true;
    socket.send(dataUrl);
  }, []);

  const startCaptureLoop = useCallback(() => {
    stopCaptureLoop();
    captureTimerRef.current = window.setInterval(captureFrame, 100);
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
      awaitingPredictionRef.current = false;

      socket.onopen = () => {
        if (socketRef.current !== socket) return;
        setStatus("open");
        if (wantStreamingRef.current) startCaptureLoop();
      };

      socket.onmessage = (event) => {
        if (socketRef.current !== socket) return;
        awaitingPredictionRef.current = false;
        try {
          const data = JSON.parse(event.data) as Prediction & {
            type?: string;
            status?: string;
            modelLoaded?: boolean;
            error?: string;
          };

          
          if (data.type === "connection_status" || data.status === "online") {
            setStatus("open");
            setModelReady(data.modelLoaded === true);
            return;
          }

          
          if (data.label !== undefined) {
            setModelReady(data.modelLoaded === true);
            if (!aslEnabledRef.current || !landmarkSampleRef.current.features) return;
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
        if (socketRef.current !== socket) return;
        if (!useFallback && targetUrl !== FALLBACK_WS_URL) {
          socket.onclose = null;
          socket.close();
          connectSocketRef.current(true);
          return;
        }
        setStatus("error");
      };

      socket.onclose = () => {
        if (socketRef.current !== socket) return;
        socketRef.current = null;
        awaitingPredictionRef.current = false;
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
    [handlePrediction, startCaptureLoop],
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
    setModelReady(false);
    setStatus("idle");
  }, [stopCaptureLoop]);

  const startCamera = useCallback(async () => {
    if (startingRef.current || streamRef.current) return;
    startingRef.current = true;
    const generation = ++cameraGenerationRef.current;
    setCameraError(null);
    setTrackingStatus("Loading local hand tracker…");
    try {
      const tracker = await createHandTracker();
      if (generation !== cameraGenerationRef.current) { tracker.close(); return; }
      trackerRef.current = tracker;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      if (generation !== cameraGenerationRef.current) {
        stream.getTracks().forEach(track => track.stop());
        tracker.close();
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
      wantStreamingRef.current = true;
      startCaptureLoop();
      connectSocket(false);
    } catch (err) {
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      trackerRef.current?.close();
      trackerRef.current = null;
      setTrackingStatus("Camera or hand tracker unavailable");
      setCameraError(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Camera access was denied. Allow camera access and try again."
          : `Couldn't start the camera or local hand tracker: ${err instanceof Error ? err.message : "unknown error"}`,
      );
    } finally {
      startingRef.current = false;
    }
  }, [connectSocket, startCaptureLoop]);

  const stopCamera = useCallback(() => {
    cameraGenerationRef.current += 1;
    disconnectSocket();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    trackerRef.current?.close();
    trackerRef.current = null;
    landmarkSampleRef.current = { timestamp: 0, features: null };
    setTrackingStatus("Camera off");
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
    setLiveGuess(null);
    streakLabelRef.current = null;
    streakCountRef.current = 0;
    lastCommittedRef.current = null;
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
    mode,
    setMode,
    modelReady,
    trackingStatus,
    getLandmarkSample,
  };
}
