# Lib Directory (`src/lib`)

Pure TypeScript utilities, router logic, and system tunables.

---

## Modules

### 1. `signTranslator.ts`
- **Purpose**: Configuration constants and TypeScript type declarations for backend communication.
- **Exports**:
  - `WS_URL`: WebSocket endpoint resolved from `import.meta.env.VITE_WS_URL` or defaulting to current hostname on port 8080.
  - `CAPTURE_INTERVAL_MS`: Frame extraction frequency (350ms).
  - `CAPTURE_WIDTH`: In-memory capture canvas width (240px) kept small for low latency.
  - `CAPTURE_QUALITY`: JPEG compression quality (0.7).
  - `CONFIDENCE_THRESHOLD`: Minimum confidence (0.85) required for a prediction to count as stable.
  - `STABLE_FRAMES_TO_COMMIT`: Consecutive frames needed to commit a character (4).
  - `COMMIT_COOLDOWN_MS`: Cooldown duration after committing a character (1100ms).
  - `RECONNECT_DELAY_MS`: Delay before attempting reconnection after a dropped socket (2000ms).
  - `ConnectionStatus`: Status union (`idle`, `connecting`, `open`, `reconnecting`, `closed`, `error`).
  - `Prediction`: Model prediction result interface (`label`, `confidence`).

### 2. `useRoute.ts`
- **Purpose**: Minimalist, zero-dependency client-side history router using React's `useSyncExternalStore`.
- **Features**: Subscribes to browser `popstate` events and internal dispatch events, exposes the current URL path as a reactive state, and exports programmatic navigation function `navigate(to: string)`.
