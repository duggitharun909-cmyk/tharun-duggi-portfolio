# VALIDATION.md — Evidence for human review
Run: 2026-10-12 · Agent: Claude Code · Reviewer: Tharun Duggi (pending)

| Acceptance criterion (INTENT §6) | Result | Evidence |
|---|---|---|
| Hero 3D scene renders; fallback without WebGL | ✅ | Chrome (WebGL/ANGLE) screenshots desktop 1440×900 + mobile 390×844; `body.no-webgl` gradient path on CDN/WebGL failure |
| Copy matches résumé, no fabricated metrics | ✅ | All numbers (3+, 55%, 25%, 40%, 500+, 10K+, 60%, 75%, 1,000+, 99.9%) traced to résumé |
| Contact API tests | ✅ | `pytest`: **9 passed** (validation, honeypot, 503 fallback, SMTP send, SMTP failure) |
| No horizontal scroll at 390 px | ✅ | `scrollWidth == innerWidth` on desktop and mobile |
| Reduced motion | ✅ | Screenshots captured under `prefers-reduced-motion: reduce` — single static WebGL frame, reveals shown |
| Console clean | ✅ | 0 errors / 0 warnings from app code |
| Deployed on Vercel | ✅ | https://tharun-duggi-portfolio.vercel.app — page, assets, résumé 200; `/api/contact` live (405 on GET, 400 on invalid); `.env.local` and `app.py` not served (404) |

## Defects found by the agent during validation (and fixed)
1. **Washed-out background** — `setClearColor` was double sRGB-encoded through EffectComposer → `rgb(38,42,59)`; bloom threshold 0 amplified it to `rgb(118,128,169)`. Fixed with `scene.background` + threshold 0.08 → measured `rgb(6,9,17)`.
2. **Mobile hero** — core glow sat on the name; moved sphere to a "crown" above the heading.
3. **Clipped descenders** in gradient "Duggi" (`background-clip:text` paints only inside the box) — padded the word box.
4. Double rAF loop on tab switch; tag-sphere double loop on re-intersect — guarded.

## Iteration 2 — 2026-10-12 (review feedback: new main project + scroll lag)
| Check | Result | Evidence |
|---|---|---|
| Voice AI project added as main project | ✅ | Desktop + 390 px screenshots; no overflow; 0 console errors |
| No `backdrop-filter` left on the page | ✅ | Computed-style scan: 0 elements |
| Below-hero frame time | ✅ | Median 16.7 ms / p95 16.8 ms (60 fps) with scene in `ambient-30fps` mode |
| Adaptive quality on a weak GPU | ✅ | Software-rendered Chrome (worst case): hero 117 ms/frame at full quality → auto-stepped to level 3 → 16.7 ms/frame |
| `pytest` | ✅ | 9 passed |

Note: headless runs use software WebGL, so absolute numbers are worst case. Human check on a real laptop/phone is still required (INTENT §6).

## Iteration 3 — 2026-10-12 (review: white page with "sad canvas" icon)
| Check | Result | Evidence |
|---|---|---|
| Reproduced | ✅ | `WEBGL_lose_context.loseContext()` on the old build → sphere gone, no recovery, no fallback |
| Context lost → readable fallback | ✅ | `body.no-webgl`, canvas `display:none`, dark gradient, text readable |
| Context restored → scene resumes | ✅ | Sphere re-rendered, 0 page errors |
