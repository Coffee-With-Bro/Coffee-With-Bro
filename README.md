# Coffee With Bro — Offline ASL Sign Language to Text Recognition System

An offline, privacy-first American Sign Language (ASL) recognition platform converting live webcam hand signs into written text in real time.

Developed for **UCS503 Software Engineering**  
Department of Computer Science and Engineering  
**Thapar Institute of Engineering and Technology**  
Academic Year: **2026–27 (Odd Semester)**

---

## Architecture Overview

```
                      +---------------------------------------+
                      |               Web Browser             |
                      |            (milk_with_bro)            |
                      |   React 19 + TypeScript + Vite UI     |
                      +---------------------------------------+
                                     |         ^
          Base64 Frame Snapshots     |         |  Predictions &
             (JPEG over WS)          |         |  Confidence Scores
                                     v         |
                      +---------------------------------------+
                      |         Spring Boot Backend           |
                      |          (coffee_with_bro)            |
                      |       AslWebSocketHandler.java        |
                      |     DeepLearning4j CNN Classifier     |
                      +---------------------------------------+
                                          ^
                                          | Loads weights & labels
                      +---------------------------------------+
                      |       Model & Data Pipeline           |
                      |            (ice_with_bro)             |
                      |  Python, MediaPipe, OpenCV, PyTorch   |
                      +---------------------------------------+
```

---

## Repository Directory Map

The repository is modularly structured into five distinct components:

| Directory | Role | Primary Technologies |
| :--- | :--- | :--- |
| [`milk_with_bro`](./milk_with_bro/) | **Frontend Application (MVP)**: Real-time camera viewfinder, recognition gauges, transcript buffer, and navigation views. | React 19, TypeScript, Vite, CSS |
| [`coffee_with_bro`](./coffee_with_bro/) | **Backend Inference Service**: Spring Boot WebSocket server hosting the DeepLearning4j CNN model. | Java 17, Spring Boot, DL4J, ND4J |
| [`ice_with_bro`](./ice_with_bro/) | **Machine Learning & Preprocessing**: Dataset cleaning, 128×128 normalization, MediaPipe landmarks, and model training. | Python 3, PyTorch, MediaPipe, OpenCV |
| [`cream_with_bro`](./cream_with_bro/) | **Software Engineering Documentation**: IEEE SRS specifications, project proposals, UML Use Case & Activity diagrams. | LaTeX, draw.io, Markdown |
| [`sugar_with_bro`](./sugar_with_bro/) | **Diagnostic Test Bench**: Standalone HTML/JS WebSocket client for isolated backend network verification. | HTML5, JavaScript (Native WebSocket) |

---

## Quick Start & Testing Commands

All common tasks can be run directly via NPM scripts, VS Code tasks, or terminal commands.

### 1. Test All Codes (ESLint & TypeScript Build)
Runs automated ESLint code checks and TypeScript production compilation:
```bash
npm test
```
*Alternatively, run `node scripts/test-all.js` or use VS Code Command Palette: `Tasks: Run Task` -> `Test All (Lint & Build)`.*

### 2. Start Frontend Development Server
Launches the Vite dev server at `http://localhost:5173`:
```bash
npm run dev:frontend
```
*(Or navigate to `milk_with_bro` and run `npm run dev`)*

### 3. Start Backend Java Server
Launches the Spring Boot WebSocket server at `http://localhost:8080`:
```cmd
npm run dev:server
```
*(Or navigate to `coffee_with_bro` and run `.\mvnw.cmd spring-boot:run`)*

### 4. Start Both Frontend & Server Concurrently
Launches both services simultaneously in a single command:
```bash
npm run dev:all
```
*Alternatively, run `node scripts/start-both.js` or select the VS Code task `Start Frontend & Server`.*

---

## System Constraints & Engineering Highlights

- **100% Offline Execution**: Zero cloud APIs, zero external model inference endpoints, and zero telemetry.
- **Privacy by Design**: Live webcam frames are processed strictly in local device memory and discarded immediately after classification.
- **Strict Separation of Concerns**: Frontend, backend inference, dataset preprocessing, and diagnostic tools can be developed, tested, and evaluated independently.

---

## Team Members & Responsibilities

- **Abhishek Srivastava** (1024030236): Data Preprocessing & CNN Architecture
- **Keshav Aggarwal** (1024030234): Frontend Interface & WebSocket Integration
- **Harshine Singh** (1024030232): Backend Service & System Architecture
- **Bhuvaneesh Singh Grewal** (1024030235): SRS Documentation & Quality Assurance
