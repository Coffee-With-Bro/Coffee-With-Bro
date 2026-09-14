# sugar_with_bro — Standalone WebSocket Test Bench

A zero-dependency HTML & JavaScript test client for verifying the Spring Boot WebSocket server independently.

---

## Purpose

`sugar_with_bro` is a minimal diagnostic utility designed to test the Java backend's WebSocket endpoint (`ws://localhost:8080/ws/echo`) without needing to launch or build the full React frontend application.

It satisfies the Software Engineering course requirement of **independent component testability**: verifying network round-trips and socket handshakes in isolation.

---

## File Contents

- `index.html`: A single self-contained HTML page featuring an input box, a send button, a connection status logger, and a WebSocket client instance.

---

## Usage

1. Ensure the Spring Boot backend server in `coffee_with_bro` is running:
   ```cmd
   cd coffee_with_bro && .\mvnw.cmd spring-boot:run
   ```

2. Open `sugar_with_bro/index.html` directly in any web browser (no web server required).

3. The page will attempt to connect to `ws://localhost:8080/ws/echo`.
   - On successful connection, you will see: `Connected to server.`
   - Type any text and click **Send** to verify that the message is transmitted and the server echoes back a response.
