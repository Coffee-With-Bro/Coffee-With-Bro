# Components Directory (`src/components`)

Reusable UI components shared across the application.

---

## Components

### 1. `NavBar.tsx`
- **Purpose**: Main header navigation element present across all views.
- **Features**: Displays the interactive "Coffee with Bro" brand wordmark with hover confetti, subtitle indicator, and navigation links (`Translator`, `About`, `Team`, `Resources`, `Legal`) with active state indicators.

### 2. `Link.tsx`
- **Purpose**: Client-side navigational anchor tag.
- **Features**: Intercepts primary left-clicks to trigger programmatic history navigation via `navigate()` without reloading the browser document, while preserving native behavior for modifier keys (`Ctrl+click`, `Cmd+click`, `middle-click`) and standard `href` accessibility attributes.

### 3. `ContactForm.tsx`
- **Purpose**: Offline contact form located on the Team page.
- **Features**: In-line client-side validation for name, email, subject, and message fields; handles errors dynamically and prepares a pre-filled draft in the visitor's default email client using a `mailto:` scheme, upholding the project's zero-cloud privacy architecture.
