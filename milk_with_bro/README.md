# milk_with_bro — Frontend Web Application

The interactive browser-based user interface for the **Coffee with Bro** offline American Sign Language (ASL) sign-to-text recognition system.

Built for **UCS503 Software Engineering** at Thapar Institute of Engineering and Technology.

---

## Overview

`milk_with_bro` is a client application built with **React 19**, **TypeScript**, and **Vite**. It provides a webcam interface that captures live video frames of hand gestures, streams them over a persistent WebSocket connection to the Spring Boot backend (`coffee_with_bro`), and displays real-time predictions, confidence scores, and an accumulated transcript buffer.

### Key Capabilities

- **Real-Time Camera Capture**: Accesses local webcams through `navigator.mediaDevices.getUserMedia` with mirrored viewfinder display and alignment brackets.
- **WebSocket Streaming**: Automatically streams lightweight JPEG snapshots to `ws://localhost:8080/ws/echo` at fixed 350ms intervals.
- **Confidence & Readout Gauges**: Real-time visualization of current predicted character and model confidence percentage.
- **Transcript Management**: Accumulates stabilized predictions with duplicate cooldown prevention, offering Space, Backspace, Clear, and instant Clipboard Copy actions.
- **Coursework Navigation**: Informational views including About (system architecture & pipeline), Team (contributors & contact form), Resources (attributed open-source software licenses), and Legal (terms and privacy guarantees).
- **Privacy & Offline Guarantee**: No cloud APIs, no external video transmission, and no cookies or trackers. All video processing stays local.

---

## Directory Structure

```
milk_with_bro/
├── index.html               # Single-page HTML host shell
├── package.json             # NPM dependencies and scripts
├── vite.config.ts           # Vite bundler configuration
├── tsconfig.json            # TypeScript configuration
├── public/                  # Static assets and icons
└── src/                     # Application source code
    ├── App.tsx              # Root shell, routing coordinator, and layout
    ├── App.css              # Core typography, viewfinder, and meter design tokens
    ├── main.tsx             # React DOM entry point
    ├── index.css            # Base stylesheet and dark mode defaults
    ├── components/          # Reusable UI widgets (NavBar, Link, ContactForm)
    ├── Confetti/            # Interactive confetti effect
    ├── hooks/               # Custom lifecycle hooks (useSignTranslator)
    ├── lib/                 # Core utilities, client-side routing, and connection constants
    └── pages/               # Top-level views (Home, About, Team, Resources, Legal)
```

---

## Prerequisites

- **Node.js**: version 18.0.0 or higher (v20+ recommended)
- **npm**: version 9.0.0 or higher
- A working webcam attached to your machine

---

## Installation & Setup

1. Open your terminal and navigate to this directory:
   ```bash
   cd milk_with_bro
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

---

## Available Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Starts the Vite development server with Hot Module Replacement (HMR) at `http://localhost:5173`. |
| `npm run build` | Compiles TypeScript types (`tsc -b`) and bundles production assets into `dist/`. |
| `npm run lint` | Runs ESLint across all TypeScript and React files to verify code quality. |
| `npm run preview` | Locally serves the built production bundle from `dist/` to inspect production behavior. |

---

## Configuration & Environment Variables

The backend WebSocket address defaults to:
```
ws://<hostname>:8080/ws/echo
```

To configure a custom backend endpoint without modifying code, create a `.env.local` file in this directory:
```env
VITE_WS_URL=ws://localhost:8080/ws/echo
```

---

## Communication Protocol

1. **Client -> Server**:
   Sends base64-encoded JPEG image payloads representing individual video frames (`data:image/jpeg;base64,...`).
2. **Server -> Client**:
   Receives JSON payloads containing the predicted character and confidence score:
   ```json
   {
     "label": "A",
     "confidence": 0.9421
   }
   ```
   If an error occurs:
   ```json
   {
     "error": "could not decode image"
   }
   ```
