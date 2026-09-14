# cream_with_bro — Course Documentation & Engineering Deliverables

The documentation and software engineering artifact repository for **Coffee with Bro**.

Course: **UCS503 — Software Engineering**  
Department of Computer Science and Engineering  
Thapar Institute of Engineering and Technology  
Academic Year: **2026–27 (Odd Semester)**

---

## Overview

`cream_with_bro` houses all formal documentation, IEEE-standard Software Requirements Specifications (SRS), project proposals, UML system design models, LaTeX source documents, and evaluation reports.

---

## Directory Contents

| Path | Purpose |
| :--- | :--- |
| `SRS.tex` | LaTeX source for the formal Software Requirements Specification. |
| `SRSFinal.tex` | Final consolidated version of the SRS document. |
| `Main.tex` | Project proposal and team structure documentation. |
| `PC_Config.md` | Hardware specifications, training machine specs, and environmental configurations. |
| `SystemRequirements.md` | Functional and non-functional requirements quick reference. |
| `SE.pdf` | Compiled PDF deliverable of the project report and proposal. |
| `ActivityDiagram/` | UML Activity diagram source files (`.drawio`) and exported high-resolution PNGs. |
| `UseCaseDiagram/` | UML Use Case diagram source files (`.drawio`) and exported high-resolution PNGs. |
| `Report/` | Mid-term and semester report LaTeX source files. |
| `thapar_logo.jpg` | University emblem asset used on title pages. |

---

## Compiling LaTeX Documents

To compile the LaTeX source documents into PDF format using `pdflatex`:

```bash
pdflatex SRS.tex
pdflatex Main.tex
```

Ensure a standard TeX distribution (TeX Live, MiKTeX, or MacTeX) is installed.