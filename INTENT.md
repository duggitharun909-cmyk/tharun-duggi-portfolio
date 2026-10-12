# INTENT.md — Tharun Duggi · Portfolio

> The single source of truth for **why** this project exists and **what "done" means**.
> Agents build from this file. Humans review against it. If the code and this file disagree, this file wins — or gets updated through review.

## 1. Intent (one sentence)
Give recruiters, hiring managers and founders a **memorable, professional, 3D/VFX-driven portfolio** that proves Tharun Duggi is a production-grade **Python Full Stack + AI/ML (AI Agent) Engineer** within 10 seconds — and lets them reach him in one click.

## 2. Audience
| Who | What they need in < 30 s |
|---|---|
| Recruiters (LinkedIn traffic) | Role, years, stack, headline metrics, a way to contact |
| Hiring managers / tech leads | Real systems built: RAG, agents, serverless, APIs, measurable impact |
| Founders / clients | Trust + a contact form that actually reaches Tharun |

## 3. Source of truth for content
`Tharun_Duggi_Python_AI_ML_3.5Y_Final.pdf` (resume) + GitHub `duggitharun909-cmyk`
+ facts supplied directly by Tharun in review (2026-10-12: Voice AI calling agent — Plivo, Sarvam AI STT, Cartesia TTS, VAD, latency; open to roles in Hyderabad, Chennai, Bengaluru).
**No invented facts.** Every metric on the site must trace back to the resume.

## 4. Functional requirements
- **FR-1 Hero** — real-time WebGL 3D scene (neural/particle VFX, bloom glow, mouse + scroll reactive), name, role, CTAs.
- **FR-2 About** — summary + animated impact counters (3+ yrs, 55% cost cut, 500+ daily conversations, 10k+ users, 75% automation).
- **FR-3 Experience** — timeline: Techgy Innovations (Jan 2026–Present), Innoclique Cognitive Health (Jan 2023–Jan 2026).
- **FR-4 Projects** — **Real-time AI Voice Agent (main project)**: streaming inbound + outbound calls for lead qualification; Plivo telephony, Sarvam AI STT (Indian regional languages), Cartesia TTS, VAD + latency handling. Then AI Agent Platform (Serverless Multi-Tenant RAG), Healthcare Claims Automation Engine, + GitHub repos.
- **FR-5 Skills** — grouped stack (Languages, AI/GenAI, Frameworks, Cloud, Databases).
- **FR-6 AI-Native SDLC** — section that shows *how* Tharun builds (Intent → Spec → Agent Build → Human Review → Validate → Deploy).
- **FR-7 Education & Certifications.**
- **FR-8 Contact form** — name, email, subject, message → delivered to `duggitharun909@gmail.com`. Validation, honeypot spam trap, success/error states.
- **FR-9 Links** — LinkedIn, GitHub, email, resume download.

## 5. Non-functional requirements
- **NFR-1 Professional first, creative second** — must be safe to put on LinkedIn.
- **NFR-2 Performance** — no build step, CDN-pinned libs, particle count scales down on mobile. **Scrolling must stay smooth**: no live backdrop-blur over the WebGL canvas, no infinite repaint animations, bloom only while the hero is in view, 30 fps ambient mode below the hero, adaptive quality that steps down on slow GPUs.
- **NFR-3 Accessibility** — semantic HTML, keyboard reachable, `prefers-reduced-motion` respected, WebGL failure falls back gracefully.
- **NFR-4 Responsive** — 360 px → 4K, no horizontal scroll.
- **NFR-5 Privacy** — phone number is not published; no secrets in the repo (SMTP creds via env vars only).
- **NFR-6 Backend in Python** — contact endpoint is a Python serverless function (shows the full-stack claim, not just tells it).

## 6. Acceptance criteria (human review checklist)
- [ ] Hero 3D scene renders and reacts to the mouse on desktop; static gradient fallback without WebGL.
- [ ] All copy matches the resume; no fabricated numbers.
- [ ] Contact form submission arrives in `duggitharun909@gmail.com`.
- [ ] `pytest` passes for the contact API.
- [ ] Scrolling below the hero is smooth on a mid-range laptop (no visible jank).
- [ ] Lighthouse: no layout breaks at 375 px; reduced-motion disables heavy animation.
- [ ] Deployed on Vercel with a public URL.

## 7. Out of scope (v1)
Blog/CMS, analytics, i18n, dark/light toggle (site is intentionally dark/cinematic).
