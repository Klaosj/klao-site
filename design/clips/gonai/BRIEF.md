---
workflow: motion-graphics
flow: automation
storyboard: no
message: "From the landing page to one planned day: the BTS route at 64฿, two sample stops, the estimate filling the budget bar to ~410 of 450฿, then the same plan as a view-only share."
destination: website
aspect: 1580x900 (desktop sheet) + 1080x1080 (phone)
language: en
audience: visitors of the klao-site portfolio, GoNai project sheet
length: 5s
angle: ui-sting (rebuilt UI, no screenshots)
---

## Intent

Round 2 of GoNai's sheet clip. Round 1 panned two flat captures; this sting rebuilds the real plan
screen in HTML (GoNai's own compiled CSS, fonts and markup) and lets the UI build itself: the route
card arrives, the two sample stops settle in, the budget bar fills, the view-only share card resolves.
Calm, Apple-minimal, never hype. Plays once, holds the last frame, no audio.

## Story

16:9 · frame 0 is `public/images/gonai.jpg` exactly (the landing). From 0.3 s a calm zoom-through
(landing scale 1 → 1.05, fades out by 0.68 s) into the "Your plan" window:

1. build · the route card arrives with BTS 64฿ (Walk 0฿ · 5 min, BTS 64฿ · 28 min,
   "Cheapest 64฿ · 33 min ⇄ Fastest 150–180฿ · 30 min"); Beans Bar Mezzanine (sample) and
   Grandma's Kitchen (sample) settle in at ~150฿; the budget card follows.
2. breathe · the budget bar fills to 91 % ("Estimated ~410฿ / budget 450฿"); a bar fill, never a count-up.
3. resolve · the plan steps back (left, scale 0.96, opacity 0.8); the view-only share card
   ("Work session from Lat Phrao · 450฿", "~410฿ / 450฿ budget") resolves beside it.

1:1 · the same story, one surface at a time at phone size: the route card (frame 0 = poster) → the two
stops → the budget card, whose bar fills.

## Sources (read-only)

- GoNai repo, `main` @5c30e78: `app/app/plan/[id]/page.tsx`, `plan-view.tsx`, `components/RouteLegs.tsx`,
  `BahtChip.tsx`, `MoneyProgress.tsx`, `StopTimelineList.tsx`, `app/p/[id]/page.tsx`, `app/globals.css`,
  `app/layout.tsx` (fonts), `lib/fixtures.ts`, `lib/venue-display.ts`.
- The plan: made with `tools/capture.mjs` on a local `next dev` (port 3240) of an exported copy of
  `main`, with no `.env` files and the JSON store in the scratch folder. The script refuses to run unless
  `/api/health` says `"store":"json"` on localhost and aborts on any off-site request. Nothing touched
  Supabase, Vercel or the repo; the server was stopped afterwards.
- klao-site `public/images/gonai.jpg` (frame 0) and `../frame.md`.

## Constraints

- Same words, numbers, colours, radii, type as the app; "(sample)" stays on both venue names.
- None of the audit-flagged labels appear ("9 real travelers", "validated", "field-collected",
  "in every Top 3", 44฿ / 37฿); the plan and share screens carry none of them.
- Stage #F5F6F8; one hairline + one surface shadow on our window; app cards keep their own hairline + shadow.
- One accent at most (none added). No glow, cursor, count-up, overshoot (none used).

## Decisions (build run, 2026-10-01)

- 16:9 window = the plan page at a 512 px viewport (cards 480 px, every line on one line), scaled 1.45×.
  The view toggle between the title and the route card is left out so the plan fits at a readable size;
  the window is cropped below the budget card.
- Share card = the 390 px phone page's card (358 px), scaled 1.45×; its `sm:` classes are removed in the
  page because the composition's viewport (1580 px) would otherwise switch on the desktop row layout.
- 1:1 = the plan page at a 412 px phone viewport (cards 380 px), scaled 2.6×. 390–402 px truncates
  "Beans Bar Mezzanine (sam…" or wraps the legs, so 412 px is the narrowest width that keeps "(sample)".
- Scaling is `transform: scale()`, not CSS `zoom`: the layout is the app's 1x layout, and HyperFrames'
  contrast audit measured the wrong boxes under `zoom` (false 4.2:1 failures on the app's #107f6b).
- The stop card's ☕ gets `font-variant-emoji: emoji`: headless capture draws Menlo's monochrome ☕ from
  the `.o-mono` stack, a visitor's Chrome draws the colour emoji (checked against a viewport screenshot
  of the local app; round 1's plan.png shows the monochrome capture artifact).
- Encodes: x264 veryslow CRF 26 (16:9, QP 18 over the first 15 frames) / CRF 22 (1:1), `-tune animation`;
  VP9 CRF 36 / 32 `-cpu-used 0`; keyframes at 0 and the hold (4.4 s); BT.709 matrix + primaries,
  sRGB transfer tag, TV range.
