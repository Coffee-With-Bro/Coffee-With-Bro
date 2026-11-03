# Coffee With Bro — System Requirements & Architecture Specification

> A real-time, 100% offline American Sign Language (ASL) fingerspelling recognition platform. Video frames are captured directly via browser webcam, streamed across an onboard low-latency WebSocket to a Spring Boot backend, and classified through a DeepLearning4j Convolutional Neural Network (CNN) without any external cloud API dependencies.

---

## 1. Tech Stack & Environment Matrix

### Backend Core (`coffee_with_bro`)
| Technology / Component | Version / Specification | Purpose |
|:---|:---|:---|
| **Java** | 25 (Java SE 25.0.1) | Primary application runtime |
| **Spring Boot** | 4.1.0 | WebMVC, WebSocket server & DI container |
| **Maven Wrapper** | 3.9.16 (Included: `mvnw` / `mvnw.cmd`) | Hermetic build and dependency resolution |
| **DeepLearning4j (DL4J)** | 1.0.0-M2.1 | On-device CNN model loading and neural inference |
| **ND4J Native Platform** | 1.0.0-M2.1 | High-performance CPU vector & matrix math |
| **DataVec** | 1.0.0-M2.1 | Image raster pipeline (128×128 RGB normalization) |
| **Spring Data JPA** | 4.1.0 (Hibernate ORM 7.4.1) | Translation session entity persistence |
| **H2 Database Engine** | 2.4.240 (In-Memory) | Embedded zero-configuration session store |
| **JUnit Jupiter (JUnit 5)** | 5.x (via `spring-boot-starter-test`) | Automated controller, service, & integration testing |

### Frontend UI (`milk_with_bro`)
| Technology / Component | Version / Specification | Purpose |
|:---|:---|:---|
| **React** | 19.2.4 | Declarative component UI and state management |
| **TypeScript** | 5.9.3 | Type safety and strict compilation |
| **Vite** | 8.2.2 | Fast HMR dev server and Rolldown/Rollup bundler |
| **Node.js** | 20+ (Tested: v24.20.0) | Frontend runtime environment |
| **WebRTC & HTML5 Canvas** | Browser Native W3C API | Hardware camera frame capture (240px @ ~350ms) |
| **Web Speech API** | Browser Native W3C API | On-device text-to-speech synthesis (zero telemetry) |
| **Playwright** | 1.63.0 | End-to-end automated UI & UX verification |

---

## 2. Sign Language Scope: ASL vs. ISL Clarification & Limitations

### Gesture Classification Scope
- **Language Supported:** **American Sign Language (ASL)** fingerspelling gestures.
- **Classes Recognized:** **36 Static Gestures**
  - **Alphabets:** `A` through `Z` (26 uppercase letters)
  - **Digits:** `0` through `9` (10 numerical digits)
- **Input Dimensions:** 128×128 pixels RGB normalized to `[0.0, 1.0]`.

### Important Clarifications & Model Limitations
1. **ASL vs. ISL Distinction:**  
   The application specifically classifies **American Sign Language (ASL)** single-handed manual alphabet and number handshapes. It is distinct from Indian Sign Language (ISL), which utilizes two-handed gestures for many characters and distinct grammatical morphology. While dataset exploration scripts for ISL exist in `ice_with_bro/`, the active model weights and production classifier recognize ASL fingerspelling.
2. **Static Fingerspelling vs. Dynamic Sentences:**  
   The system classifies **static, discrete handshapes** one gesture at a time. It does **not** recognize continuous dynamic sign language sentences (which involve facial expressions, body movement, and continuous trajectory). Complete words and sentences are constructed through temporal stabilization, fingerspelling buffers, and the newly integrated dictionary autocomplete subsystem.

---

## 3. Newly Implemented Features & Subsystems

### A. System Diagnostics Dashboard (`/diagnostics`)
A real-time telemetry dashboard providing transparency into subsystem health:
- **Spring Boot Server Reachability:** Active HTTP health probes with millisecond roundtrip latency.
- **CNN Model Inference State:** Live detection of whether DL4J neural net weights (`models/asl_cnn_model.zip`) are loaded or running in heuristic standby mode.
- **WebSocket Channel Health:** Interactive live ping testing against `ws://localhost:8080/ws/echo` measuring socket connection latency.
- **Supported Recognition Classes:** Dynamic visualization of all 36 classes (A–Z and 0–9) and input resolution specs.
- **Database Status:** Real-time JPA connection verification and session counter.
- **Dictionary Subsystem Status:** In-memory lexicon word count and lookup latency telemetry.
- **Manual Diagnostics Refresh:** Interactive manual refresh with visual loading, success, and error states.

### B. Dictionary Autocomplete & Word Validation Engine
Integrates the backend dictionary (`/api/dictionary/*`) directly with the live transcript builder:
- **Fingerspelling Autocomplete:** Queries `/api/dictionary/suggest?prefix={prefix}&limit=5` with 220ms request debouncing as the user signs or types.
- **Interactive Suggestions:** Allows one-click selection of suggested words, intelligently replacing only the current incomplete prefix without overwriting prior sentence context.
- **Word Validation:** Automatically verifies completed words against the 43+ word lexicon upon entering a space (`/api/dictionary/validate?word={word}`) and displays status confirmation.
- **Graceful Error Handling:** Completely non-blocking; operates silently if the backend is temporarily offline without disturbing webcam video or transcription.

### C. Translation Session Analytics Engine
Leverages real persisted JPA records in the H2 database (`/api/sessions/stats` & `SessionStatsDto`):
- **Aggregated Metrics:** Real-time database aggregation displaying:
  - Total saved translation sessions.
  - Total characters/letters translated.
  - Average model inference confidence score.
  - Average session translation duration.
  - Most recent translation timestamp.
- **Zero Fabrication:** Strictly calculates real metrics from persisted JPA records; handles empty databases gracefully with clean zero-state messaging.
- **Multi-View Integration:** Embedded within both the System Diagnostics page and the Session History modal.

### D. Automated Testing Expansion
Comprehensive JUnit 5 test suite with 26 passing automated tests:
- **`DictionaryControllerTest` (7 tests):** Covers matching prefix suggestions, empty prefix handling, limit constraints, valid word validation, invalid word validation, empty token validation, and vocabulary count.
- **`SystemApiControllerTest` (8 tests):** Covers system status payload, supported signs metadata, session creation, empty/whitespace/null input validation (400 Bad Request), empty database analytics, populated database analytics, individual session deletion (200 & 404), and full database purge.
- **`TranscriptStabilizerServiceTest` (5 tests):** Unit tests for confidence threshold gating, consecutive frame accumulation, single-commit lock, label change resets, and session buffer lifecycle.
- **`DictionaryServiceTest` (5 tests):** Unit tests for in-memory TreeSet logarithmic search and case insensitivity.
- **`CoffeeWithBroApplicationTests` (1 test):** Verifies Spring application context bootstrapping.

---

## 4. REST API Specification

| Endpoint | Method | Request Payload / Params | Response Payload | Description |
|:---|:---|:---|:---|:---|
| `/api/status` | `GET` | None | `SystemStatusDto` | System telemetry, model readiness, and session count |
| `/api/supported-signs` | `GET` | None | `Map<String, Object>` | List of all 36 classes, resolution, and engine metadata |
| `/api/sessions` | `GET` | None | `List<TranslationSession>` | Most recent 20 persisted translation sessions |
| `/api/sessions` | `POST` | `TranslationSession` JSON | `TranslationSession` (HTTP 201) | Persists a new translation session record |
| `/api/sessions/{id}` | `DELETE` | Path variable `id` | Status confirmation (HTTP 200/404) | Deletes a single session by its database ID |
| `/api/sessions` | `DELETE` | None | Status confirmation (HTTP 200) | Purges all sessions from the database |
| `/api/sessions/stats` | `GET` | None | `SessionStatsDto` | Aggregate session metrics computed via JPA queries |
| `/api/dictionary/suggest` | `GET` | `prefix` (string), `limit` (int) | `DictionarySuggestionDto` | Logarithmic prefix search for word autocomplete |
| `/api/dictionary/validate` | `GET` | `word` (string) | `{ word: string, valid: bool }` | Verifies if token is in the dictionary lexicon |
| `/api/dictionary/count` | `GET` | None | `{ totalWords: number }` | Returns total vocabulary size of the lexicon |

---

## 5. Verification & Testing Commands

To run the complete automated test suite (Frontend ESLint, TypeScript Production Build, and Backend JUnit 5 tests):

```bash
# From workspace root:
npm test
# (Equivalent to: node scripts/test-all.js)
```

Individual component commands:
- **Backend Tests:** `cd coffee_with_bro && .\mvnw.cmd test` (Windows) or `./mvnw test` (macOS/Linux)
- **Frontend Lint:** `npm --prefix milk_with_bro run lint`
- **Frontend Production Build:** `npm --prefix milk_with_bro run build`
- **Prerender Static Routes:** `node scripts/prerender.js`
