# Pages Directory (`src/pages`)

Contains the top-level view components mapped to application routes.

---

## Views

### 1. `Home.tsx` (`/`)
- **Purpose**: Primary interactive sign-to-text translator interface.
- **Components**:
  - Live viewfinder showing webcam feed with alignment reticle and mirrored playback.
  - Recognition readout displaying detected ASL character and real-time confidence meter.
  - Camera control buttons (`Turn on camera` / `Turn off camera`) and connection status dot.
  - Accumulated transcript buffer with Space, Backspace, Clear, and instant Clipboard Copy actions.

### 2. `About.tsx` (`/about`)
- **Purpose**: Overview of project mission, technical problem statement, 4-stage pipeline (Capture -> Stream -> Classify -> Assemble), scope (36 static signs: A–Z, 0–9), and coursework context.

### 3. `Team.tsx` (`/team`)
- **Purpose**: Introduces the four student team members, their assigned component ownerships, university roll numbers, and an offline message form.

### 4. `Resources.tsx` (`/resources`)
- **Purpose**: Comprehensive attribution list of dependencies, datasets (ASL-HG), typography (Space Grotesk, JetBrains Mono), tools (diagrams.net, LaTeX), and their respective open-source licenses.

### 5. `Legal.tsx` (`/legal`)
- **Purpose**: Terms of use and privacy policy detailing academic coursework usage, non-medical disclaimer, zero data collection, and local processing guarantees.

### 6. `pages.css`
- **Purpose**: Shared typography, layout scaffolding, step numbers, grid patterns, form elements, and responsive styles for all content pages.
