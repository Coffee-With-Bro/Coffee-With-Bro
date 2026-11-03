# cream_with_bro — Course Documentation & Engineering Deliverables

The documentation and software engineering artifact repository for **Coffee With Bro**.

Course: **UCS503 — Software Engineering**  
Department of Computer Science and Engineering  
Thapar Institute of Engineering and Technology  
Academic Year: **2026–27 (Odd Semester)**

---

## Overview

`cream_with_bro` houses all formal software engineering deliverables: IEEE-standard Software Requirements Specifications (SRS), complete UML system design models (all 9 diagrams), LaTeX source documents, architectural references, and evaluation reports.

---

## Directory Contents

| Path | Purpose | Deliverables |
| :--- | :--- | :--- |
| [`ActivityDiagram/`](./ActivityDiagram/) | UML Activity Diagrams modeling sequential control flow and concurrency. | Live recognition (3 swimlanes) & offline DL4J CNN training workflows (`.drawio`, `.png`). |
| [`ClassDiagram/`](./ClassDiagram/) | UML Class Diagrams detailing object-oriented architecture and relationships. | All 22 backend Java classes, DTO records, controllers, services, repositories (`.drawio`, `.png`). |
| [`CollaborationDiagram/`](./CollaborationDiagram/) | UML Collaboration / Communication Diagram modeling object links and message flows. | Client, Spring Boot backend, and offline dataset collaborating objects (`.drawio`, `.png`). |
| [`ComponentDiagram/`](./ComponentDiagram/) | UML Component Diagram specifying modular subsystem structures and ports. | React frontend, Spring Boot backend, H2 database, and DL4J training components (`.drawio`, `.png`). |
| [`DeploymentDiagram/`](./DeploymentDiagram/) | UML Deployment Diagram specifying hardware nodes, execution environments, and protocols. | 100% offline local workstation deployment with browser, JVM, and local filesystem (`.drawio`, `.png`). |
| [`ObjectDiagram/`](./ObjectDiagram/) | UML Object Diagram capturing concrete runtime instance states and links. | Single-frame post-classification runtime snapshot with active WebSocket and DL4J state (`.drawio`, `.png`). |
| [`SequenceDiagram/`](./SequenceDiagram/) | UML Sequence Diagrams detailing chronological interaction message protocols. | Real-time recognition, 4-frame stability commit, lexicon autocomplete, and offline training (`.drawio`, `.png`). |
| [`StateDiagram/`](./StateDiagram/) | UML State Machine Diagram modeling states, triggers, guards, and actions. | Full client/backend lifecycle: connecting, capturing, evaluating, committing, persisting (`.drawio`, `.png`). |
| [`UseCaseDiagram/`](./UseCaseDiagram/) | UML Use Case Diagrams defining actor boundaries and functional specifications. | Live recognition, REST telemetry, lexicon word assistance, and offline pipeline (`.drawio`, `.png`). |
| [`Report/`](./Report/) | Academic reports, mid-term updates, and evaluation documentation. | Mid-term submission markdown and LaTeX report sources (`Report.tex`). |
| `SRS.tex` | Formal IEEE Software Requirements Specification LaTeX source. | System requirements, functional/non-functional constraints, and interface specifications. |
| `SRSFinal.tex` | Consolidated final version of the IEEE SRS. | Finalized deliverable for evaluation. |
| `Main.tex` | Project proposal and team structure documentation. | Academic proposal source. |
| `PC_Config.md` | Machine specifications and environment configurations. | System benchmark specifications. |
| `SystemRequirements.md` | Requirements quick-reference guide. | Requirements summary. |
| `SE.pdf` | Compiled PDF deliverable of the project report and proposal. | Formal PDF submission. |
| `thapar_logo.jpg` | University emblem asset. | Logo asset for title pages. |

---

## Compiling LaTeX Documents

To compile the LaTeX source documents into PDF format using `pdflatex`:

```bash
pdflatex SRS.tex
pdflatex Main.tex
```

Ensure a standard TeX distribution (TeX Live, MiKTeX, or MacTeX) is installed.
