# CLAUDE.md — Agent Operating Manual

This repo is built with an **AI-Native SDLC**: agents do the building, humans do the reviewing.
Read `INTENT.md` first. Every change must serve a requirement in it.

## Workflow (every task)
1. **Intent** — locate the FR/NFR in `INTENT.md` this change serves. If none exists, propose an INTENT.md edit first.
2. **Spec** — update `docs/SPEC.md` if structure, data or contracts change.
3. **Build** — smallest change that meets the spec. Match existing style.
4. **Validate** — run `python3 -m pytest -q`; open `index.html` via `python3 -m http.server` and check the browser console is clean.
5. **Record** — non-obvious choices go in `docs/DECISIONS.md` (ADR format). Validation results in `docs/VALIDATION.md`.
6. **Human review** — summarise the diff + acceptance criteria touched; never self-approve a deploy to production.

## Project layout
```
index.html            # single page, semantic sections
assets/css/style.css  # design tokens on :root, mobile-first
assets/js/scene.js    # Three.js hero (WebGL, bloom, particles) — ES module
assets/js/main.js     # UI: loader, cursor, reveal, counters, tilt, form
assets/resume.pdf     # downloadable resume
api/contact.py        # Vercel Python serverless function (POST /api/contact)
tests/                # pytest for api/
docs/                 # SPEC, DECISIONS (ADRs), VALIDATION
```

## Rules
- **Content truth:** every claim/metric must trace to a source listed in INTENT.md §3 (resume or facts Tharun supplied in review). Never invent employers, numbers or projects.
- **No build step.** Libraries load from pinned CDN versions (`three@0.160.0`). Do not add npm deps without an ADR.
- **Secrets:** only via Vercel env vars (`SMTP_USER`, `SMTP_PASS`, `CONTACT_TO`). Never commit them.
- **Performance:** any new animation must respect `prefers-reduced-motion` and pause when off-screen.
- **Accessibility:** interactive elements are real `<button>`/`<a>`, with visible focus states.
- **Cache busting:** `/assets/*` is cached for 24 h — bump the `?v=N` query on CSS/JS links in `index.html` whenever those files change.
- **Python style:** stdlib only in `api/` (keeps cold starts fast), type hints, pure functions for validation so they're unit-testable.

## Commands
```bash
python3 -m http.server 8000      # local preview (form falls back to FormSubmit locally)
python3 -m pytest -q             # API tests
npx vercel deploy --prod         # deploy (requires `npx vercel login`)
```
