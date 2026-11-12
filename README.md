# ☕ Coffee With Bro

> A real-time, 100% offline American Sign Language (ASL) to text recognition system built for your webcam.

Developed for **UCS503 — Software Engineering**  
Department of Computer Science & Engineering, **Thapar Institute of Engineering and Technology**  
Academic Session: 2026–2027 (5th Semester)

---

## What is this?

**Coffee With Bro** is a desktop web app that turns live webcam hand signs into written text in real time. 

The primary focus is **privacy and local execution**. Most sign language translation tools push camera frames up to cloud APIs. Here, everything runs completely offline on your own machine — frames are captured in the browser, sent over a local WebSocket to an onboard Java neural network, and translated on the spot. No cloud latency, no external API keys, and your webcam video never leaves your computer.

---

## Why the name? ☕🥛🧊🍦🍬

We broke the project down into separate components named after the ingredients of an iced coffee:

| Component | What it does | Stack |
| :--- | :--- | :--- |
| [**`coffee_with_bro`**](./coffee_with_bro/) | **The Core Brew (Backend)** — Spring Boot WebSocket server that runs the DeepLearning4j CNN model to classify hand signs, provides REST APIs for session history, dictionary autocomplete, and system telemetry. | Java 25, Spring Boot 4.1, DL4J, ND4J, H2, JUnit 5 |
| [**`milk_with_bro`**](./milk_with_bro/) | **The Smooth Layer (Frontend)** — React + Vite UI with a live camera viewfinder, confidence meters, transcript builder, dictionary autocomplete, and system diagnostics dashboard. | React 19, TypeScript, Vite |
| [**`ice_with_bro`**](./ice_with_bro/) | **The Chilled Prep (ML Pipeline)** — Dataset cleanup, MediaPipe landmark extraction, and PyTorch / DL4J model experimentation. | Python 3, PyTorch, MediaPipe, OpenCV |
| [**`cream_with_bro`**](./cream_with_bro/) | **The Presentation (Docs)** — Software Engineering docs: IEEE SRS, UML use-case & activity diagrams, LaTeX reports, and architecture specifications. | LaTeX, draw.io, Markdown |
| [**`sugar_with_bro`**](./sugar_with_bro/) | **The Quick Taste (Test Bench)** — A single HTML test page to verify WebSocket connections without spinning up the whole UI. | Vanilla HTML & JS |

---

## How It Works

```
  +--------------------------------------------------------+
  |              Webcam Feed (In Browser)                  |
  |                  [milk_with_bro]                       |
  |  Captures video frames every ~350ms                    |
  +--------------------------------------------------------+
                             |
             Base64 JPEG     |   Prediction & Confidence
             Frame Snapshot  |   (e.g., {"label":"A", "confidence":0.94})
                             v   ^
  +--------------------------------------------------------+
  |             Spring Boot WebSocket Server               |
  |                  [coffee_with_bro]                     |
  |  Resizes to 128x128 -> Runs local DL4J CNN inference   |
  +--------------------------------------------------------+
                             ^
                             | Model weights & labels
  +--------------------------------------------------------+
  |             Trained Offline with PyTorch / DL4J        |
  |                   [ice_with_bro]                       |
  +--------------------------------------------------------+
```

1. **Camera capture**: Your webcam captures hand gestures in the browser (`milk_with_bro`).
2. **Local streaming**: Lightweight image snapshots are sent over `ws://localhost:8080/ws/echo` every 350ms.
3. **Inference**: The Spring Boot backend (`coffee_with_bro`) resizes the frame to 128×128 and runs it through a 36-class Convolutional Neural Network (letters A–Z, numbers 0–9).
4. **Instant feedback**: The predicted sign and confidence score are sent back to the UI.
5. **Building sentences & Dictionary Assist**: Stabilized letters are appended to your live transcript. The integrated dictionary offers real-time word autocomplete suggestions and verification. You can add spaces, backspace mistakes, speak out loud with Web Speech, save to the local database, or export to a `.txt` file with one click.

---

## Language & Recognition Scope: ASL vs. ISL Clarification

- **Supported Language:** **American Sign Language (ASL)** single-handed manual alphabet and number handshapes.
- **Supported Classes:** 36 static gesture classes (digits `0`–`9` and uppercase letters `A`–`Z`).
- **ASL vs. ISL Distinction:** The active inference engine classifies ASL fingerspelling gestures. While exploratory dataset download scripts for Indian Sign Language (ISL) exist in `ice_with_bro/`, ISL utilizes a distinct grammatical syntax and two-handed alphabets; the active production classifier targets 36 ASL classes.
- **Model Limitation:** The system classifies **static, discrete fingerspelling gestures**. It does not perform continuous, dynamic full-sentence sign language translation (which requires continuous multi-frame video feature tracking, body pose, and facial expressions). Sentences are formed by sequentially fingerspelling words assisted by the autocomplete subsystem.

---

## Key Features & Subsystems

### 🩺 System Diagnostics Dashboard (`/diagnostics`)
A dedicated diagnostic center accessible via the top navigation bar or directly at `/diagnostics`:
- **Live Server Availability:** Health check to `/api/status` with real-time HTTP roundtrip latency in milliseconds.
- **CNN Model Readiness:** Dynamic detection of DeepLearning4j model weights (`asl_cnn_model.zip`) vs heuristic standby mode.
- **WebSocket Transport Ping:** Live interactive reachability probe against `ws://localhost:8080/ws/echo`.
- **Supported Recognition Classes:** Full catalog of all 36 recognizable classes (Letters A–Z, Digits 0–9) and 128×128 resolution specifications.
- **Database & Lexicon Health:** Real-time JPA connection status, session counter, and dictionary vocabulary size.
- **Manual Telemetry Refresh:** One-click refresh with visual loading and error states.

### 📚 Dictionary Autocomplete & Validation Engine
- **Prefix Autocomplete:** Real-time autocomplete suggestions powered by `/api/dictionary/suggest?prefix=...` with 220ms debouncing.
- **Interactive Completion:** One-click word chips that replace the current fingerspelled prefix without corrupting earlier sentence context.
- **Word Validation:** Automatic verification of completed words against the 43+ word dictionary upon entering a space (`/api/dictionary/validate?word=...`).
- **Non-blocking Resilience:** Operates smoothly in the background without interrupting webcam capture or transcription.

### 📊 Translation Session Analytics Subsystem
- **Real JPA Aggregations:** Computes real metrics via Spring Data JPA queries on the H2 database (`/api/sessions/stats` and `SessionStatsDto`):
  - Total Saved Translation Sessions
  - Total Characters / Letters Translated
  - Average CNN Inference Confidence Score
  - Average Session Translation Duration
  - Most Recent Session Activity Timestamp
- **Zero Fabrication:** Returns strictly real calculated statistics from persisted JPA records; displays a clean empty state when no sessions are recorded.
- **Multi-Location Integration:** Embedded directly inside both the System Diagnostics Dashboard and the Session History Modal.

---

## Quick Start

### Prerequisites
Before running, make sure you have installed:
- **Node.js** (v20 or higher, tested on v24.20.0) — [nodejs.org](https://nodejs.org/)
- **Java Development Kit (JDK 25)** — check with `java -version`
- A working webcam attached to your machine

### One-Click Launch (Recommended)

- **Windows**: Double-click [`run.bat`](./run.bat) (or run `.\run.ps1` in PowerShell).
- **macOS / Linux**: Run `./run.sh` in your terminal.

Alternatively, you can just run:
```bash
npm start
```
*(or `npm run dev:all`)*

This single command starts both the Spring Boot backend (`http://localhost:8080`) and the Vite frontend (`http://localhost:5173`), and automatically opens your browser once ready.

---

### Running Services Individually

If you prefer running the frontend and backend in separate terminal windows:

#### 1. Start Backend (Java Spring Boot)
```bash
cd coffee_with_bro
# On Windows:
.\mvnw.cmd spring-boot:run

# On macOS / Linux:
./mvnw spring-boot:run
```
The backend will be live at `http://localhost:8080` (WebSocket at `ws://localhost:8080/ws/echo`, H2 Console at `http://localhost:8080/h2-console`).

#### 2. Start Frontend (React + Vite)
```bash
cd milk_with_bro
npm install
npm run dev
```
The frontend will be live at `http://localhost:5173`.

---

## Testing & Code Quality

We set up automated checks for frontend linting, TypeScript compilation, and backend unit tests:

```bash
# Run all automated tests (frontend lint, build, & backend tests):
npm test
```

You can also run individual checks:
- **Frontend Lint**: `npm run lint` (ESLint on React 19 codebase)
- **Frontend Build check**: `npm run build` (TypeScript check & Vite production bundle)
- **Backend JUnit 5 Tests**: `cd coffee_with_bro && .\mvnw.cmd test` (26 unit & integration tests)
- **Static Route Prerendering**: `npm run prerender`

---

## Tips for Best Recognition

- **Good lighting**: Make sure your hand is clearly illuminated and not backlit.
- **Clean background**: A solid or uncluttered background helps the model isolate your hand shape.
- **Positioning**: Keep your hand roughly centered inside the viewfinder guide brackets.
- **Steady signing**: Hold each sign steady for roughly half a second for the transcript buffer to lock in the character.
- **Autocomplete**: Use the dictionary assist bar below the transcript to quickly autocomplete fingerspelled words.

---

## The Team

Built by 5th semester Computer Science students at TIET:

- **Abhishek Srivastava** (1024030236) — ML Pipeline, Data Preprocessing & CNN Architecture (`ice_with_bro`)
- **Keshav Aggarwal** (1024030234) — Frontend UI, Viewfinder & WebSocket Client (`milk_with_bro`)
- **Karanveer Singh** (1024030240) — Systems Integration & Software Engineering (`coffee_with_bro` / `milk_with_bro`)
- **Harshine Singh** (1024030232) — Spring Boot Backend, DL4J Integration & WebSocket Handler (`coffee_with_bro`)
- **Bhuvaneesh Singh Grewal** (1024030235) — IEEE SRS Documentation, Diagrams & QA Testing (`cream_with_bro`)

---

## License & Academic Disclaimer

This project was built strictly for academic and educational purposes under the UCS503 Software Engineering curriculum at Thapar Institute of Engineering & Technology. All datasets and libraries used belong to their respective open-source authors.
