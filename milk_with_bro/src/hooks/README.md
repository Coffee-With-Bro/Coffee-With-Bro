# Hooks Directory (`src/hooks`)

Custom React hooks encapsulating stateful business logic.

---

## Hooks

### `useSignTranslator.ts`
- **Purpose**: Central state and lifecycle coordinator for the live ASL translator.
- **Responsibilities**:
  - Requests and tracks webcam media streams (`navigator.mediaDevices.getUserMedia`).
  - Manages WebSocket connection lifecycle (`ws://localhost:8080/ws/echo`), reconnection backoffs, and cleanup.
  - Controls interval-based frame capture loop drawing video frames to an in-memory canvas and encoding them as JPEG data URLs.
  - Implements streak-detection logic: requires consecutive confident predictions (`STABLE_FRAMES_TO_COMMIT`) and respects a commit cooldown (`COMMIT_COOLDOWN_MS`) to prevent noise and letter stuttering.
  - Manages transcript state and editing operations (append, space, backspace, clear).
