// Tunables for the live ASL translator. These talk to the Java backend's
// AslWebSocketHandler at /ws/echo, which returns {"label": "...", "confidence": 0.xx}
// for each frame it's sent.

// Backend WebSocket endpoint. Override at build time with VITE_WS_URL if the
// Spring Boot app isn't running on localhost:8080.
export const WS_URL =
  (import.meta.env.VITE_WS_URL as string | undefined) ??
  `ws://${window.location.hostname}:8080/ws/echo`;

// How often we grab a frame from the video feed and send it.
export const CAPTURE_INTERVAL_MS = 350;

// Frame width sent to the backend. The model resizes to 128x128 anyway, so
// this just keeps payloads small; height is derived from the video's aspect ratio.
export const CAPTURE_WIDTH = 240;

// JPEG quality for the captured frame (0-1).
export const CAPTURE_QUALITY = 0.7;

// A prediction only counts as "readable" above this confidence.
export const CONFIDENCE_THRESHOLD = 0.85;

// Consecutive matching, confident predictions needed before a letter is
// committed to the transcript. Prevents flicker/noise from typing garbage.
export const STABLE_FRAMES_TO_COMMIT = 4;

// After committing a letter, ignore further commits for this long. Signing
// naturally holds a shape for a while, so without this the same letter would
// repeat many times per second.
export const COMMIT_COOLDOWN_MS = 1100;

// Reconnect backoff when the socket drops unexpectedly.
export const RECONNECT_DELAY_MS = 2000;

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "open"
  | "reconnecting"
  | "closed"
  | "error";

export interface Prediction {
  label: string;
  confidence: number;
}
