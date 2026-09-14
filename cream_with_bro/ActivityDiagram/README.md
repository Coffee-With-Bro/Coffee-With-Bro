# Activity Diagram

Contains the UML Activity Diagrams modeling the sequential control flow and concurrency of the Coffee with Bro system.

---

## Files

- `ActivityDiagram.drawio`: Editable diagram source created using diagrams.net (draw.io).
- `ActivityDiagram.png`: High-resolution rendered raster image for inclusion in LaTeX reports and presentations.

---

## Diagram Workflow

1. **User Interaction**: Opens browser and grants webcam access.
2. **Client Processing**: Browser captures video frame, downscales to 240px width, and sends base64 payload via WebSocket.
3. **Backend Processing**: Spring Boot WebSocket handler decodes frame, normalizes to 128×128 grayscale/RGB, feeds through DL4J CNN layers.
4. **Response Loop**: Server computes softmax probabilities and responds with top class and confidence.
5. **Client Presentation**: Frontend checks confidence threshold, updates live meter, updates streak buffer, and appends to transcript upon stable prediction.
