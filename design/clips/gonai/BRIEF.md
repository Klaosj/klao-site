---
workflow: motion-graphics
flow: automation
storyboard: no
message: "From the landing page to one planned day: the route, two stops and the total in baht against the budget, then the same plan as a view-only share on a phone."
destination: website
aspect: 1580x900
language: en
audience: visitors of the klao-site portfolio (project sheet, 16:9 media box)
length: 5s
angle: webpage
---

## Intent

One 5.0 s unnarrated product clip for the GoNai project sheet on klao-site. It plays once and
holds its last frame. Frame 0 is the sheet's existing screenshot (`public/images/gonai.jpg`,
1580x900) shown full-bleed and untouched, because the site crossfades from that still to the
video. Tone: the site's "White Edition" — Apple-minimal, calm, understated. The owner dislikes
hype, so the clip shows only real UI and makes no claims of its own.

Story (30 fps, 1580x900, no audio):

1. 0.0–0.5 s hold — the GoNai landing page, exactly the screenshot.
2. 0.5–2.1 s — the landing eases forward slightly (scale 1 → 1.03) and fades to the canvas
   (0.5–1.0); the in-app "Your plan" window rises in, centred (0.9–2.1): Lat Phrao → Siam, BTS 64฿, two stops at
   ~150฿, "Estimated ~410฿ / budget 450฿".
3. 2.4–4.2 s — the window drifts left (2.4–3.9); the phone rises in on the right (3.05–4.2) with the same plan's
   view-only share page (leave ~09:24, the two stops with times, "~410฿ / 450฿ budget").
4. 4.2–5.0 s — hold on the window + phone composition.

## Assets

- `assets/landing.jpg` — klao-site `public/images/gonai.jpg`, byte-for-byte copy.
- `assets/plan.png` — GoNai `/app/plan/<id>` captured at an 880x780 viewport, 2x DPR, top 766 CSS
  px kept (cut falls in the page's own padding above the footer), Lanczos to 1x (880x766).
- `assets/share.png` — the same plan's `/p/<id>?k=…` share page at 390x844, 2x DPR, Lanczos to the
  360 px phone width, top 766 px kept (blank page below the content).

Both app screens come from GoNai branch `fix/p0-truth-keepalive` (the truthful-copy branch the
screenshot also shows) run locally with the dev JSON store and no Supabase env. The plan was made
in that local copy only; nothing was written to production. The catalog is the same placeholder
set that is live (venue names carry "(sample)"); the BTS fare is from the official table.

## Customizations

- Eases: klao-site tokens drift `cubic-bezier(.28,.11,.32,1)` and settle
  `cubic-bezier(.32,.72,0,1)`, implemented as deterministic cubic-bezier ease functions.

## Notes

- Visuals: only real UI. Never invent UI, text or numbers; never retouch capture content.
  Crop / scale / frame / move only.
- Never visible in any frame (GoNai audit, 24 Sep 2026): "Fare confirmed by 9 real travelers",
  "validated by real visitors", "field-collected", "in every Top 3", stale BTS 44฿ / 37฿, and the
  in-app trust badges fed by placeholder counts ("Confirmed by N travelers", "Last checked Nd
  ago — reconfirming"), plus the planner/welcome lines "every number comes from real (field)
  data" and "Real humans pull the data within 24h". The planner, explore and welcome screens are
  therefore not used; the plan page and the share page carry none of them.
- Canvas #F5F6F8. Frames: window radius 18 px, phone 36 px, 1 px hairline rgba(0,0,0,.08), one
  soft shadow (0 12px 32px rgba(0,0,0,.08)). No glow, gradients, device chrome.
- Motion: translate / scale / opacity only; scale ≤ 1.03 here; no bounce or overshoot, no cursor,
  callouts, captions, logos, text overlays, count-ups. No added text.
- Crisp: app captures at 2x, downscaled once to the displayed size; never upscaled.
- Deliverables in out/: gonai.mp4 (H.264 yuv420p +faststart, no audio, ≤450 KB target / 700 KB
  cap), gonai.webm (VP9, same targets), gonai-end.jpg (exact last frame), contact.jpg (7 proof
  frames). Frame 0 must match `public/images/gonai.jpg` (PSNR ≥ 40 dB after encoding).
- Source repos (GoNai, klao-site) are read-only.

## Decisions (build run, 2026-09-30)

- Screens: the in-app plan page and the share page are the only GoNai screens with a planned day
  and its baht total that carry none of the flagged labels. The planner (Top 3 cards with trust
  badges), explore and welcome screens were rejected for that reason.
- Plan: Work, Lat Phrao, 450฿ (the app's work default; the landing's ask bar also says 450฿),
  Beans Bar Mezzanine + Grandma's Kitchen → the app's own estimate ~410฿ / 450฿.
- Window 880x766 at y 67 (880 is the narrowest width where GoNai's header stays on one line;
  766 ends in the page's padding above the footer). Phone 360x766 at x 1082, y 67. Window
  centred at x 350, then x 138 (shift −212); 64 px gap; 138 px side margins.
- Iterations: v1 → v2 shortened the landing fade to 0.6 s; v3 cut it to 0.5 s and started the
  plan at 0.9 s so the two pages never read as a double exposure (≤ 2 frames, both < 10%
  opacity), and moved the phone to 3.05 s so it appears only once the window has cleared its slot.
- Master = lossless PNG sequence (`renders/master-final`, `hyperframes render --format
  png-sequence`); web files by `tools/encode-final.sh`: x264 veryslow CRF 23 with frames 0–14 at
  QP 16 (keeps frame 0 at 41.5 dB against the screenshot; the ceiling for yuv420p is 41.7 dB),
  VP9 CRF 36; tagged BT.709 primaries/matrix, sRGB transfer, TV range. `tools/verify.py` checks
  frame 0, the last frame and the hold.
