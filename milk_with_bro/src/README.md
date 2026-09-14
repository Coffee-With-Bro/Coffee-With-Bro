# Frontend Source Directory (`src`)

Contains the core client application logic, state hooks, presentation components, and style systems for `milk_with_bro`.

---

## Directory Architecture

- **`components/`**: Reusable interface building blocks (`NavBar`, `Link`, `ContactForm`).
- **`pages/`**: Full views rendered based on client-side routing (`Home`, `About`, `Team`, `Resources`, `Legal`).
- **`hooks/`**: Custom React stateful logic (`useSignTranslator` for camera control, frame extraction, and WebSocket networking).
- **`lib/`**: Standalone helper modules and configuration constants (`useRoute.ts` lightweight history router and `signTranslator.ts` connection parameters).
- **`Confetti/`**: Visual micro-interaction celebrating team branding (`BoostIconConfetti.tsx`).
- **`App.tsx`**: Top-level application shell coordinating active route views and footer.
- **`App.css`**: Core typography definitions, viewfinder styles, camera readouts, and global CSS tokens.
- **`index.css`**: CSS resets, root variables, dark mode color schemes, and accessibility media queries.
- **`main.tsx`**: React 19 entry point rendering the app into `#root` with `StrictMode`.
