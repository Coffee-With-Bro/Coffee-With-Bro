# coffee_with_bro — Spring Boot Backend Service

The core Java backend service for the **Coffee with Bro** offline sign-to-text recognition system.

Built for **UCS503 Software Engineering** at Thapar Institute of Engineering and Technology.

---

## Overview

`coffee_with_bro` is a **Spring Boot** application that hosts a Convolutional Neural Network (CNN) trained with **DeepLearning4j (DL4J)**. It exposes a low-latency WebSocket endpoint (`/ws/echo`) to receive base64-encoded webcam frames from the frontend, decode and resize them to 128×128, run neural network inference locally, and return predicted characters with confidence scores. It also provides REST APIs for word autocompletion, dictionary validation, and translation session history analytics.

### Key Responsibilities

- **WebSocket Communication**: Maintains a persistent, low-overhead WebSocket connection at `/ws/echo` for rapid continuous frame transmission.
- **Image Decoding & Normalization**: Converts incoming base64 payloads into Java `BufferedImage` objects and normalizes pixels for neural network input.
- **Deep Learning Inference**: Executes local inference across 36 static ASL classes (A–Z, 0–9) using DeepLearning4j and ND4J without any external cloud APIs.
- **REST APIs**: Provides endpoints for system health (`/api/system/status`), translation session tracking (`/api/sessions`), and prefix autocompletion (`/api/dictionary/suggest`).
- **Cloud-Ready Containerization**: Supports dynamic `$PORT` assignment, non-root execution, Docker multi-stage builds, and one-click cloud deployment on Railway and Render.

---

## Architecture & Source Layout

```
coffee_with_bro/
├── Dockerfile                                # Multi-stage production container build (Eclipse Temurin JRE 21)
├── pom.xml                                   # Maven build configuration and DL4J dependencies
├── mvnw / mvnw.cmd                           # Cross-platform Maven wrapper
└── src/main/java/com/coffeewithbro/coffee_with_bro/
    ├── CoffeeWithBroApplication.java         # Spring Boot entry point
    ├── config/
    │   └── WebSocketConfig.java              # Registers /ws/echo endpoint and allows CORS
    ├── controller/
    │   ├── DictionaryController.java         # Prefix autocompletion & dictionary validation
    │   └── SystemApiController.java          # System diagnostics, status, and session analytics
    ├── dto/                                  # Data Transfer Objects
    ├── entity/
    │   └── TranslationSession.java           # JPA entity for session storage
    ├── ml/
    │   ├── AslCnnModel.java                  # DL4J MultiLayerNetwork CNN architecture
    │   ├── AslPredictor.java                 # Inference engine loading model zip & labels.txt
    │   ├── PredictionResult.java             # Immutable record holding label and confidence
    │   └── TrainAslCnn.java                  # Standalone JVM CNN training pipeline
    ├── repository/
    │   └── TranslationSessionRepository.java # Spring Data JPA repository
    ├── service/
    │   ├── DictionaryService.java            # Word validation and autocomplete logic
    │   └── TranscriptStabilizerService.java  # Debouncing and letter confirmation
    └── websocket/
        └── AslWebSocketHandler.java          # Handles binary/base64 frame stream and emits predictions
```

---

## Prerequisites

- **Java Development Kit (JDK)**: version 21 LTS (or 17+)
- **Maven**: included via `mvnw` / `mvnw.cmd` wrapper
- **Docker** (optional): for containerized execution and deployment

---

## Configuration & Environment Variables

Key configuration options can be configured via `src/main/resources/application.properties` or overridden via environment variables:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | HTTP & WebSocket server port | `8080` |
| `SPRING_PROFILES_ACTIVE` | Active profile (`dev`, `prod`, `test`) | `prod` |
| `ASL_MODEL_PATH` | Path to trained DL4J model ZIP file | `models/asl_cnn_model.zip` |
| `ASL_LABELS_PATH` | Path to newline-delimited class labels | `models/labels.txt` |
| `JAVA_OPTS` | JVM memory and GC flags | `-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0` |

---

## Running the Application

### 1. Using the Maven Wrapper (Local Dev)

On Windows (Command Prompt / PowerShell):
```cmd
.\mvnw.cmd spring-boot:run
```

On macOS / Linux:
```bash
./mvnw spring-boot:run
```

The server starts on port `8080` by default. The endpoints are reachable at:
- **WebSocket Endpoint**: `ws://localhost:8080/ws/echo`
- **System Diagnostics API**: `http://localhost:8080/api/system/status`
- **Dictionary Autocomplete**: `http://localhost:8080/api/dictionary/suggest?prefix=HE`

### 2. Running with Docker

Build and run the standalone container:
```bash
# Build the image
docker build -t coffee-backend -f coffee_with_bro/Dockerfile ./coffee_with_bro

# Run container
docker run -p 8080:8080 -e PORT=8080 coffee-backend
```

### 3. Full-Stack with Docker Compose

To start both the Spring Boot backend and the pre-rendered frontend simultaneously:
```bash
docker compose up --build
```
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8080`

---

## Cloud Deployment

### Deploying on Railway
1. Create a new project on [Railway](https://railway.com/).
2. Select **Deploy from GitHub repo** and choose this repository.
3. Railway automatically detects `railway.json` and builds via `coffee_with_bro/Dockerfile`.
4. Railway injects the `$PORT` variable automatically.

### Deploying on Render
1. Create a new **Blueprint Instance** on [Render](https://render.com/).
2. Connect your repository. Render automatically discovers `render.yaml`.
3. The Web Service will build using Docker with health check at `/api/system/status`.

---

## Building the Package

To compile and produce an executable JAR file:
```cmd
.\mvnw.cmd clean package
```
The output artifact is generated in the `target/` folder as `coffee_with_bro-0.0.1-SNAPSHOT.jar`.
