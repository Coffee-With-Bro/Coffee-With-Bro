export const WS_URL =
  (import.meta.env.VITE_WS_URL as string | undefined) ??
  `ws://${window.location.hostname}:8080/ws/echo`;

export const CAPTURE_INTERVAL_MS = 350;
export const CAPTURE_WIDTH = 240;
export const CAPTURE_QUALITY = 0.7;
export const CONFIDENCE_THRESHOLD = 0.85;
export const STABLE_FRAMES_TO_COMMIT = 4;
export const COMMIT_COOLDOWN_MS = 1100;
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
