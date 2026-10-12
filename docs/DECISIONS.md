# DECISIONS.md — Architecture Decision Records

## ADR-001 · Static site + CDN Three.js, no bundler
**Context:** Portfolio must be fast to load, trivial to deploy, easy for agents to modify.
**Decision:** Plain HTML/CSS/ES modules; Three.js `0.160.0` via import map from jsDelivr.
**Consequence:** Zero build step, zero `node_modules`. Trade-off: no tree-shaking (acceptable; ~150 KB gz).

## ADR-002 · Contact backend in Python (Vercel serverless)
**Context:** Tharun is a Python full-stack engineer; the portfolio should demonstrate it.
**Decision:** `api/contact.py` using only the stdlib (`smtplib`, `json`, `re`) — no cold-start penalty from deps.
**Consequence:** Needs `SMTP_USER`/`SMTP_PASS` env vars (Gmail App Password).

## ADR-003 · Zero-config fallback for email delivery
**Context:** The site must accept messages on day one, before SMTP secrets are configured.
**Decision:** If `/api/contact` returns 503/404 (unconfigured, or local static preview), the client posts the same payload to `formsubmit.co/ajax/<email>`.
**Consequence:** FormSubmit sends a one-time activation email on the first submission; after clicking it, messages flow. Once SMTP env vars are set, the Python path is used and the fallback is never hit.

## ADR-004 · Phone number not published
**Context:** Public LinkedIn traffic attracts scrapers.
**Decision:** Show email/LinkedIn/GitHub + form; phone stays only in the downloadable resume.

## ADR-005 · Scroll performance: cheap glass, adaptive WebGL
**Context:** Review (2026-10-12) reported scroll jank and lag in the background animation below the hero.
**Root causes:** (1) `backdrop-filter: blur` on ~25 glass panels over a canvas that changes every frame forces the browser to re-blur every panel every frame; (2) UnrealBloom runs several full-screen blur passes per frame even when the sphere is dimmed; (3) DPR up to 1.75; (4) repaint-bound infinite animations (grain, gradient shine, box-shadow pulse, `top`-animated packets); (5) layout read (`scrollHeight`) on every scroll event.
**Decision:**
- Glass panels → solid translucent gradient, no backdrop-filter anywhere.
- Bloom strength fades out over the first viewport of scroll; once ~0, the composer is bypassed (direct render).
- Below the hero the scene renders at 30 fps ("ambient" mode).
- Adaptive quality: after warm-up, average frame time over 30 frames; > 24 ms steps down one level, > 50 ms jumps to the lowest (DPR 1 → no bloom → DPR 0.75). Never steps up (avoids oscillation).
- DPR cap 1.5 desktop / 1.25 mobile. All CSS loops animate only `transform`/`opacity`.
- Scroll handler is rAF-batched; page height cached via ResizeObserver.
**Consequence:** Slightly less frosted look on cards; hero looks identical. `window.__sceneStats` exposes `{quality, mode, fps}` for validation.

## ADR-006 · Survive WebGL context loss
**Context:** Review (2026-10-12) screenshot: white page with Chrome's "sad canvas" icon, light text invisible. Cause: the WebGL context was lost (GPU switch on dual-GPU Macs, GPU process reset, memory pressure from other tabs) and the app had no handler.
**Decision:** `powerPreference: 'default'` (stop forcing the discrete GPU); handle `webglcontextlost` (preventDefault, stop loop, hide canvas → dark CSS gradient fallback) and `webglcontextrestored` (resize targets, resume). After 3 losses in one visit, stay on the fallback. `html` and the canvas get a dark background so a failure can never render white.
**Consequence:** Worst case is the static gradient hero, never an unreadable page.
