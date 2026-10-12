# Tharun Duggi — Portfolio

3D/VFX portfolio for an AI Agent Developer & Python Full Stack Engineer, built end-to-end with an **AI-native SDLC**: agents build, humans review.

| File | Role in the AI-native SDLC |
|---|---|
| [`INTENT.md`](INTENT.md) | Why it exists, requirements, acceptance criteria — the source of truth |
| [`CLAUDE.md`](CLAUDE.md) | Operating manual + guardrails for coding agents |
| [`docs/SPEC.md`](docs/SPEC.md) | Architecture & API contract |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Architecture Decision Records |
| [`docs/VALIDATION.md`](docs/VALIDATION.md) | Test + review evidence |

**Stack:** HTML/CSS/ES modules · Three.js r160 (custom GLSL simplex-noise particles, UnrealBloom) · Python 3 serverless function (`api/contact.py`) · Vercel.

## Run locally
```bash
python3 -m http.server 8000        # http://localhost:8000
uvx pytest -q                      # API tests
```
Append `?lite` to the URL to disable bloom on slow GPUs.

## Contact form → email
1. **Works immediately** via FormSubmit fallback. The first message triggers a one-time *"Activate form"* email to duggitharun909@gmail.com — click it once.
2. **Python path (recommended):** create a Gmail App Password (Google Account → Security → 2-Step Verification → App passwords), then in Vercel → Project → Settings → Environment Variables add
   `SMTP_USER=duggitharun909@gmail.com`, `SMTP_PASS=<16-char app password>` and redeploy. Messages now go through `api/contact.py`.

## Deploy
```bash
npx vercel login
npx vercel deploy --prod
```
