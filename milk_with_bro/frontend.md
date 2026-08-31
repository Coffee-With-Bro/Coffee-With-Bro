## Project: Offline Sign Language → Text Translator

A web app that converts hand signs (captured via laptop webcam) into text, with **zero API keys and zero cloud dependency** — everything runs locally.

**The two chosen innovations**
1. **Personal sign dictionary instead of a fixed dataset** — rather than training once on a public ASL dataset, the user teaches the app their *own* gestures via a "record a sign" flow (record each sign 3–5 times to capture natural variation). The vocabulary grows from the user instead of being baked in at training time — turning it into a personal gesture-to-word compiler rather than a fixed ASL demo.
2. **Confirm/correct feedback loop for self-tuning accuracy** — after each recognition, the app asks the user "correct?" (yes/no). Confirmed samples strengthen the reference set for that sign; as samples accumulate, outliers with poor DTW match quality get pruned so each sign's reference data stays tight — a lightweight, fully local form of incremental learning with no training loop or cloud involved.

**Pitch line used**: *"A webcam app where anyone can teach it their own dynamic hand signs, entirely offline, with zero cloud dependency and zero pretrained dataset requirement."*