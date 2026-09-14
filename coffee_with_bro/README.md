# coffee_with_bro — Spring Boot Backend Service

The core Java backend service for the **Coffee with Bro** offline sign-to-text recognition system.

Built for **UCS503 Software Engineering** at Thapar Institute of Engineering and Technology.

---

## Overview

`coffee_with_bro` is a **Spring Boot** application that hosts a Convolutional Neural Network (CNN) trained with **DeepLearning4j (DL4J)**. It exposes a low-latency WebSocket endpoint (`/ws/echo`) to receive base64-encoded webcam frames from the frontend, decode and resize them to 128×128, run neural network inference locally, and return predicted characters with confidence scores.

### Key Responsibilities

- **WebSocket Communication**: Maintains a persistent, low-overhead WebSocket connection at `/ws/echo` for rapid continuous frame transmission.
- **Image Decoding & Normalization**: Converts incoming base64 payloads into Java `BufferedImage` objects and normalizes pixels for neural network input.
- **Deep Learning Inference**: Executes local inference across 36 static ASL classes (A–Z, 0–9) using DeepLearning4j and ND4J without any external cloud APIs.
- **Result Formatting**: Emits JSON responses containing the winning class label and its confidence probability.

---

## Architecture & Source Layout

```
coffee_with_bro/
├── pom.xml                                   # Maven build configuration and DL4J dependencies
├── mvnw / mvnw.cmd                           # Cross-platform Maven wrapper
└── src/main/java/com/coffeewithbro/coffee_with_bro/
    ├── CoffeeWithBroApplication.java         # Spring Boot entry point
    ├── config/
    │   └── WebSocketConfig.java              # Registers /ws/echo endpoint and allows CORS
    ├── ml/
    │   ├── AslCnnModel.java                  # DL4J MultiLayerNetwork CNN architecture
    │   ├── AslPredictor.java                 # Inference engine loading model zip & labels.txt
    │   ├── PredictionResult.java             # Immutable record holding label and confidence
    │   └── TrainAslCnn.java                  # Standalone JVM CNN training pipeline
    └── websocket/
        └── AslWebSocketHandler.java          # Handles binary/base64 frame stream and emits predictions
```

---

## Prerequisites

- **Java Development Kit (JDK)**: version 17 or higher
- **Maven**: included via `mvnw` / `mvnw.cmd` wrapper

---

## Configuration

Model paths can be configured via `src/main/resources/application.properties` or overridden via environment variables:

```properties
asl.model-path=${ASL_MODEL_PATH:models/asl_cnn_model.zip}
asl.labels-path=${ASL_LABELS_PATH:models/labels.txt}
```

---

## Running the Application

### Using the Maven Wrapper

On Windows (Command Prompt / PowerShell):
```cmd
.\mvnw.cmd spring-boot:run
```

On macOS / Linux:
```bash
./mvnw spring-boot:run
```

The server starts on port `8080` by default. The WebSocket endpoint is reachable at:
```
ws://localhost:8080/ws/echo
```

---

## Building the Package

To compile and produce an executable JAR file:
```cmd
.\mvnw.cmd clean package
```
The output artifact is generated in the `target/` folder.
