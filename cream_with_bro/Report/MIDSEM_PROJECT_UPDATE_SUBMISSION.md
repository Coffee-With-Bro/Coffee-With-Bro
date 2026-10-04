# UCS503 Software Engineering — Mid-Semester Project Submission
## Project: Coffee With Bro — Offline ASL Sign Language to Text Recognition System

**Course:** UCS503 — Software Engineering  
**Department:** Computer Science and Engineering  
**Institute:** Thapar Institute of Engineering and Technology, Patiala  
**Academic Year:** 2026–2027 (Odd Semester, 3rd Year)  
**Submitted To:** **Kirtika Goel Mam**  
**Submission Deadline:** Before Wednesday (October 7, 2026)

---

### Team Members & Verified Roles

| Name | Roll Number | Primary Assigned Responsibilities | Recent Contributions (This Week) |
| :--- | :--- | :--- | :--- |
| **Keshav Aggarwal** | `1024030234` | Frontend Architecture & WebSocket Integration | Built React 19 + Vite UI, camera viewfinder HUD, offline Text-to-Speech (TTS), ASL Reference Guide modal, and session history integration. |
| **Harshine Singh** | `1024030232` | Backend Service & System Architecture | Built Spring Boot 4.1.0 WebSocket handler, REST API telemetry (`/api/status`, `/api/supported-signs`), and H2 database session persistence with JPA. |
| **Abhishek Srivastava** | `1024030236` | Preprocessing Pipeline & CNN Model | Python dataset preprocessing (128×128 normalization, MediaPipe landmarks), DL4J CNN classifier design (3 convolution blocks, 36 classes). |
| **Bhuvaneesh Singh Grewal**| `1024030235` | SRS Documentation & Quality Assurance | Authored IEEE SRS specifications, UML Use Case & Activity diagrams, test bench verification (`sugar_with_bro`), and CI/CD test automation. |

---

## 1. What You Should Submit to Mam (Submission Package)

When submitting an update for **UCS503 Software Engineering**, professors evaluate:
1. **System Progress & Working Code** (Working MVP).
2. **Standard Software Engineering Documentation** (SRS, Diagrams, Architecture).
3. **Traceability & Responsibility Mapping** (Who did what).
4. **Testing & Quality Assurance** (Automated tests, zero build errors).

### Recommended Submission Checklist:
- [x] **Project Report (PDF/Overleaf)**: Upload `cream_with_bro/Report/Report.tex` to Overleaf or compile into PDF (`SE_MidSem_Report_Group_CoffeeWithBro.pdf`).
- [x] **GitHub Repository Link**: Provide the repo link with clean commit history, README, and passing tests.
- [x] **Live Demonstration Link / Video (2–3 mins)**: Short screen recording showing:
  1. Frontend camera feed capturing hand signs.
  2. Real-time classification meter updating.
  3. Text being added to the transcript sentence.
  4. Audio playback via the new **"🔊 Speak"** button (Offline Text-to-Speech).
  5. Interactive **"📖 Sign Guide"** showing all 36 supported classes.
  6. Saving session to the backend local database (**"💾 Save"**) and viewing it in **"🕒 History"**.
- [x] **Weekly Progress Status Sheet**: (Included in Section 4 below).

---

## 2. Technical Milestones Completed (What Has Been Built)

### A. Frontend Application (`milk_with_bro`)
- **Technology:** React 19, TypeScript, Vite, CSS design system.
- **Key Features:**
  - Real-time webcam viewfinder (`getUserMedia`) with mirror view and HUD corner brackets.
  - Active recognition confidence meter (animated fill, percentage gauge).
  - Sentence accumulator with `Space`, `Backspace`, `Clear`, and `Copy` controls.
  - **NEW: Offline Text-to-Speech (TTS)** using native browser Web Speech API — speaks out the translated text aloud for auditory communication.
  - **NEW: Interactive ASL Sign Guide Modal** displaying all 36 supported classes (A–Z, 0–9) with hand pose cues and instant testing triggers.
  - **NEW: Session History Modal & REST Persistence** — links directly with the Spring Boot backend to save, review, and restore previous transcripts.
  - **NEW: Quick Sign Simulator Bar** — allows instant testing of sign letters even without a live hand in front of the camera.
  - Responsive multi-page routing: `Translator`, `About`, `Team & Contact`, `Resources`, `Legal & Privacy`, and custom `404 Not Found`.

### B. Backend Inference Service (`coffee_with_bro`)
- **Technology:** Java 25, Spring Boot 4.1.0, Spring WebSocket, Spring Data JPA, DeepLearning4j (DL4J), ND4J.
- **Key Features:**
  - Real-time WebSocket handler (`/ws/echo`) receiving Base64 JPEG frames and returning low-latency inference labels and confidence scores.
  - In-memory DeepLearning4j CNN classifier loading 128×128 RGB weights and 36-class ASL alphabet/digit mapping.
  - **NEW: JPA Entity `TranslationSession`** — stores translation logs, character counts, average confidence, and session timestamps.
  - **NEW: Spring Data Repository `TranslationSessionRepository`** — provides query methods for latest sessions and analytics.
  - **NEW: DTO `SystemStatusDto`** — reports real-time system state, offline status, supported class count, and active hardware execution.
  - **NEW: REST Controller `SystemApiController`** (`/api`):
    - `GET /api/status`: System health, model readiness, and telemetry.
    - `GET /api/supported-signs`: Categorized breakdown of 36 ASL classes (26 letters, 10 digits) and input resolution specs.
    - `GET /api/sessions`: List of recorded sessions from the local H2 database.
    - `POST /api/sessions`: Saves completed translation transcripts with validation.
    - `DELETE /api/sessions`: Resets session storage for clean re-testing.
  - Integrated in-memory H2 database (`jdbc:h2:mem:coffeewithbro`) with H2 Web Console at `/h2-console`.

### C. Testing & Quality Assurance
- Automated test script `npm test` runs three stages concurrently with **zero errors**:
  1. Frontend ESLint checks (`npm run lint` — 0 errors, 0 warnings).
  2. Frontend TypeScript production build (`tsc -b && vite build` — 100% clean bundle).
  3. Spring Boot JUnit 5 integration tests (`mvn test` — 4/4 tests passed).

---

## 3. Speaking Script for Mam's Evaluation (Per Team Member)

When Mam asks each student what they did:

### 1. Keshav Aggarwal (Frontend & Integration)
> *"Mam, I developed the user-facing web application using React 19, TypeScript, and Vite. I implemented the camera streaming pipeline that captures webcam frames via HTML5 Canvas and transmits them over a high-speed WebSocket connection. I also built the confidence gauge, the sentence transcript buffer, and the offline Text-to-Speech synthesis feature that speaks out recognized words aloud. Today, I also integrated the ASL Sign Reference Guide and connected our frontend to Harshine's REST endpoints so users can save and inspect their translation history."*

### 2. Harshine Singh (Backend & Architecture)
> *"Mam, I designed the Spring Boot 4.1.0 backend service. I implemented the WebSocket handler (`AslWebSocketHandler`) that decodes base64 frames and runs concurrent inference through our DeepLearning4j CNN model. Additionally, this week I added a REST API layer (`SystemApiController`) and configured Spring Data JPA with an embedded H2 database to persist translation sessions, calculate letter counts and average confidence scores, and deliver system diagnostics."*

### 3. Abhishek Srivastava (Preprocessing & CNN Architecture)
> *"Mam, I work on the machine learning pipeline in Python and DL4J. I normalized the ASL gesture dataset into 128×128 RGB tensors and designed a 3-stage convolutional neural network architecture with convolution, batch normalization, ReLU, and max pooling, ending in a softmax classifier for 36 classes (A–Z and 0–9). The entire model runs locally on device CPU/ND4J without external cloud dependencies."*

### 4. Bhuvaneesh Singh Grewal (SRS Documentation & Quality Assurance)
> *"Mam, I authored the IEEE Software Requirements Specification (SRS) and designed the UML Use Case and Activity diagrams detailing the interaction between the webcam, preprocessing engine, WebSocket handler, and database. I also developed the standalone diagnostic WebSocket bench in `sugar_with_bro` and set up the automated test suites in `npm test` that validate linting, build integrity, and JUnit test passes across our environments."*

---

## 4. Semester Progress Tracker (Weekly Milestones)

| Milestone / Task | Status | Completion Date |
| :--- | :---: | :--- |
| Problem Definition, Team Formation & SRS Drafting | **Completed** | Week 2 |
| UML Use Case & Activity Diagrams Finalized | **Completed** | Week 3 |
| Dataset Acquisition & 128×128 Preprocessing Pipeline | **Completed** | Week 4 |
| DeepLearning4j CNN Model Training & Standalone Bench | **Completed** | Week 5 |
| Spring Boot WebSocket Handler (`/ws/echo`) Implementation | **Completed** | Week 6 |
| React 19 Frontend Camera Viewfinder & HUD Meters | **Completed** | Week 7 |
| **Mid-Semester Milestone (THIS WEEK):** | | |
| — Backend REST API (`/api/status`, `/api/sessions`, `/api/supported-signs`) | **Completed** | **Week 8 (Current)** |
| — Local H2 Database Session Persistence via Spring Data JPA | **Completed** | **Week 8 (Current)** |
| — Offline Speech Synthesis (Text-to-Speech Readout) | **Completed** | **Week 8 (Current)** |
| — ASL 36-Class Sign Reference Guide Modal | **Completed** | **Week 8 (Current)** |
| — Unified Automated Test Suite (`npm test` — Zero Errors) | **Completed** | **Week 8 (Current)** |
| **Upcoming End-Sem Milestones:** | | |
| — Confidence calibration & dynamic temporal smoothing | *Planned* | Week 10 |
| — Custom gesture dictionary extension (user custom signs) | *Planned* | Week 12 |
| — Final IEEE Project Thesis & Performance Benchmarking | *Planned* | Week 14 |

---

## 5. Quick Commands to Demo for Mam

To showcase the live project in front of Mam:

1. **Run full verification test:**
   ```bash
   npm test
   ```
   *(Proves that ESLint, TypeScript build, and Spring Boot JUnit tests all pass with 0 errors!)*

2. **Start both Frontend & Backend concurrently:**
   ```bash
   npm run dev:all
   ```
   - Opens React Frontend at: `http://localhost:5173`
   - Runs Spring Boot Service at: `http://localhost:8080`
   - H2 Database Console at: `http://localhost:8080/h2-console`
   - REST API status check: `http://localhost:8080/api/status`
