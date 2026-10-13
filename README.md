# ☕ Coffee With Bro

> A real-time, 100% offline American Sign Language (ASL) to text recognition system built for your webcam.

Developed for **UCS503 — Software Engineering**  
Department of Computer Science & Engineering, **Thapar Institute of Engineering and Technology**  
Academic Session: 2026–2027 (5th Semester)

---

## What is this?

**Coffee With Bro** is a desktop web app that turns live webcam hand signs into written text in real time. 

The big focus here is **privacy and local execution**. Most sign language translation tools push camera frames up to cloud APIs. Here, everything runs completely offline on your own machine — frames are captured in the browser, sent over a local WebSocket to an onboard Java neural network, and translated on the spot. No cloud latency, no external API keys, and your webcam video never leaves your computer.

---

## Why the name? ☕🥛🧊🍦🍬

We broke the project down into separate components named after the ingredients of an iced coffee:

| Component | What it does | Stack |
| :--- | :--- | :--- |
| [**`coffee_with_bro`**](./coffee_with_bro/) | **The Core Brew (Backend)** — Spring Boot WebSocket server that runs the DeepLearning4j CNN model to classify hand signs. | Java 17, Spring Boot, DL4J, ND4J |
| [**`milk_with_bro`**](./milk_with_bro/) | **The Smooth Layer (Frontend)** — React + Vite UI with a live camera viewfinder, confidence meters, and transcript builder. | React 19, TypeScript, Vite |
| [**`ice_with_bro`**](./ice_with_bro/) | **The Chilled Prep (ML Pipeline)** — Dataset cleanup, MediaPipe landmark extraction, and PyTorch model experimentation. | Python 3, PyTorch, MediaPipe, OpenCV |
| [**`cream_with_bro`**](./cream_with_bro/) | **The Presentation (Docs)** — Software Engineering docs: IEEE SRS, UML use-case & activity diagrams, and LaTeX reports. | LaTeX, draw.io, Markdown |
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
5. **Building sentences**: Stabilized letters are appended to your live transcript, where you can add spaces, backspace mistakes, or copy the final text with one click.

---

## Quick Start

### Prerequisites
Before running, make sure you have installed:
- **Node.js** (v18 or higher) — [nodejs.org](https://nodejs.org/)
- **Java Development Kit (JDK 17+)** — check with `java -version`
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
The backend will be live at `http://localhost:8080` (WebSocket at `ws://localhost:8080/ws/echo`).

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
npm test
```

You can also run individual checks:
- **Frontend Lint**: `npm run lint`
- **Frontend Build check**: `npm run build`
- **End-to-End UI Verification**: `npm run test:ui`

---

## Tips for Best Recognition

- **Good lighting**: Make sure your hand is clearly illuminated and not backlit.
- **Clean background**: A solid or uncluttered background helps the model isolate your hand shape.
- **Positioning**: Keep your hand roughly centered inside the viewfinder guide brackets.
- **Steady signing**: Hold each sign steady for roughly half a second for the transcript buffer to lock in the character.

---

## The Team

Built by 5th semester Computer Science students at TIET:

- **Abhishek Srivastava** (1024030236) — ML Pipeline, Data Preprocessing & CNN Architecture (`ice_with_bro`)
- **Keshav Aggarwal** (1024030234) — Frontend UI, Viewfinder & WebSocket Client (`milk_with_bro`)
- **Harshine Singh** (1024030232) — Spring Boot Backend, DL4J Integration & WebSocket Handler (`coffee_with_bro`)
- **Bhuvaneesh Singh Grewal** (1024030235) — IEEE SRS Documentation, Diagrams & QA Testing (`cream_with_bro`)

---

## License & Academic Disclaimer

This project was built strictly for academic and educational purposes under the UCS503 Software Engineering curriculum. All datasets and libraries used belong to their respective open-source authors.
