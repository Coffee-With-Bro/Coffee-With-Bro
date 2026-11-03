const defaultHostname =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1")
    ? window.location.hostname
    : "localhost";

export const WS_URL =
  (import.meta.env.VITE_WS_URL as string | undefined) ??
  `ws://${defaultHostname}:8080/ws/echo`;

export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  `http://${defaultHostname}:8080/api`;

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

export interface TranslationSessionRecord {
  id?: number;
  transcript: string;
  letterCount: number;
  avgConfidence: number;
  durationSeconds: number;
  createdAt?: string;
}
