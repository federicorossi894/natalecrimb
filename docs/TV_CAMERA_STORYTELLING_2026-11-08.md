# TV camera storytelling — 8 November 2026

## Behaviour
- TV only; other pages, payment/email/volunteer flows, DNS and gala unchanged. DEMO remains active; no audio, writes, endpoints or dependencies added.
- Panorama: existing 0.075 rad/s orbit plus small sinusoidal depth/height/composition breathing. Camera position travels around the canopy rather than through it; lookAt also eases. No selection-change snap on return. Existing arrival/dedication framing retains distance max(4, .95 × height). Editorial framing uses max(2.8, .82 × height).
- Narrative start interval: seeded deterministic 45–60 seconds, independent from right-hand scene beats; 10-second story, including 2-second fade/return, with approximately 4–6 seconds reading after approach. Interruptions may lengthen intervals. Rare causes cooling down can defer focus to preserve fairness.
- Selection: least-used available cause, no consecutive same cause when alternatives exist, no consecutive same ID on a multi-bauble tree, ID cooldown at least 180 seconds. No fabricated baubles when empty. Bounded recent history.
- Data: only useTreeStore({publicOnly:true}).addedOrnaments; never TREE_ORNAMENTS, mine or combined demo lists. Existing server projection exposes baubles without private text, and exposes dedication/signature only with approval and consent. Public baubles without text get one TV-only micro-story distilled from PROJECTS. Prossimità explicitly describes future purchase/outfitting.
- Every render re-resolves text from the latest public projection. Failed/stale reads hide the editorial card and redact tree text; moderation revocation removes the dedication/signature after the next successful 15-second poll. Financial wording in a dedication selects the project story instead, without rewriting the donor’s words. No ornament or total amount is shown.
- Priority: integral noon ceremony > arrivals (six-item queue; timer paused during ceremony) > full-frame approved wish wall > existing dedication > editorial. Wall/ceremony suspend camera motion and clear editorial focus. A fresh quiet interval follows interruption.
- Stories occupy the existing right scene slot above the existing QR; background panels are hidden throughout story and fade, avoiding double text. Brand/count/QR remain permanent. Reduced motion freezes camera and keeps text; missing WebGL preserves stories on the illustrated tree.
- /tv-preview adds “Racconti delle palline” and a local-only quarter-wait test control. Focus duration remains real-time. No production inserts or test endpoint.

## Evidence
- Full suite: **347 tests / 33 files passed**, including 335 prior tests and 12 new director/camera tests. Automatic build/typecheck: OK.
- Unit/fake-clock coverage: jitter bounds/reproducibility, 10-second focus, skewed 50:4:4:4 distribution yields 20 turns per cause over 80 focuses, no repeats, solitary cooldown, zero tree, priority cancellation, approved verbatim text/signature, revocation/error redaction, financial field stripping, no local demo selection, future proximity wording, timer cleanup, framing and around-canopy travel.
- Chromium at 1920×1080: **246-second continuous accelerated WebGL run**, 13 distinct IDs observed, all four cause stories, zero page errors; subsequent refined camera checks observed different calore/prossimità IDs with actual `editorial` camera mode/selected ID. Arrival uses actual selected camera; wall and ceremony clear card and suspend camera. No Cloud writes; count stayed **33**.
- DOM rectangles: story y=130.125, height=523.594; QR y=684.438, height=345.656 — 30.719px separation at 1080p. Initial screenshots confirmed readable stories and QR; browser screenshot capture was slow under software GPU and later captures sometimes landed after the focus despite preceding DOM evidence. Numeric camera/DOM readings, not those later frames, establish exact beat state.
- Missing WebGL: zero canvases, illustrated tree plus readable cause story/QR. Reduced motion: camera remained exactly `(0,1.9680,5.7279)` before and during narrative; text stayed visible. No real approved dedication exists currently, so that content path is tested with synthetic unit fixtures, not invented public data.
- Existing public-only polling/noon/reload/Wake Lock/fallback tests continue to pass. No claim of physical 40-day endurance; final optical comfort needs a short on-site TV soak. Original 40-day runbook remains authoritative.

## Audio later
Remain silent. A separate decision may add locally hosted, legally verified music/effects with retained licence evidence and an explicit “Attiva audio” kiosk button; browser autoplay restrictions still apply. No tracks downloaded or enabled here.

## Release
DEMO revision requested only after green tests/build. Published URL and deployment observation are reported separately; no custom domain or primary-host change.