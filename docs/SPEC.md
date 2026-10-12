# SPEC.md — Technical Specification
Derived from `INTENT.md`. Agents implement this; reviewers verify against it.

## Architecture
```
Browser ──► index.html (static, Vercel CDN)
   │          ├─ assets/js/scene.js   Three.js r160: particle neural sphere + bloom (FR-1)
   │          └─ assets/js/main.js    UI behaviour + form client (FR-2..FR-9)
   │
   └─ POST /api/contact ──► api/contact.py (Python 3.12 serverless, stdlib only)
                               ├─ validate()  → 400 on bad input
                               ├─ honeypot    → 200 silently dropped
                               └─ SMTP (Gmail, TLS 587) → duggitharun909@gmail.com
                                  └─ if SMTP env not configured → 503 {fallback:true}
                                       └─ client falls back to FormSubmit AJAX (ADR-003)
```

## Contract: `POST /api/contact`
Request `application/json`:
| field | type | rule |
|---|---|---|
| name | string | 2–80 chars |
| email | string | RFC-ish regex, ≤ 120 chars |
| subject | string | 0–120 chars (optional) |
| message | string | 10–3000 chars |
| company | string | **honeypot** — must be empty |

Responses: `200 {ok:true}` · `400 {ok:false, errors:{field:msg}}` · `405` non-POST · `503 {ok:false, fallback:true}` SMTP not configured · `502` SMTP failure.

## Hero scene (FR-1)
- ~6 000 particles (2 200 on mobile) on a sphere, displaced by 3D simplex noise in a vertex shader, additive blending.
- Inner wireframe icosahedron + orbit ring of "data packets".
- UnrealBloomPass for glow. Mouse → camera parallax; scroll → scene rotates and fades.
- Performance (ADR-005): bloom fades out with scroll then composer is bypassed; 30 fps ambient mode below the hero; adaptive quality steps down on slow GPUs; pauses when the tab is hidden. Reduced motion → single static frame.

## Projects section
1. **AI Voice Agent (main)**: Plivo ⇄ VAD → Sarvam AI STT → LLM agent → Cartesia TTS → Plivo; inbound + outbound; rendered as a live-call console with CSS waveform (transform-only animation, paused until revealed).
2. AI Agent Platform (RAG) · 3. Claims Automation Engine · GitHub repos.

## Environment variables (Vercel)
`SMTP_USER` (gmail address) · `SMTP_PASS` (Gmail App Password) · `CONTACT_TO` (default duggitharun909@gmail.com)
