# Aje UI sting (round 2)

Two HyperFrames 0.8.97 compositions that rebuild Aje's real Next steps screen (its built-in example idea) as HTML and
let Aje's own review moment play. `BRIEF.md` has the story and the decisions; `../frame.md` is klao-site's frame spec.

Brand truth: [../frame.md](../frame.md) — every clip follows it.

```
design/clips/aje/
  sting-16x9/   index.html · index.motion.json · ui/ (aje-d.css, fonts.css, fonts/) · assets/aje.jpg   1580×900
  sting-1x1/    index.html · index.motion.json · ui/ (aje-d.css, aje-p.css, fonts.css, fonts/)        1080×1080
  tools/        capture.mjs · vp.mjs · verify-ui.mjs · compose.mjs · build.sh · encode.sh · stills.py · quality.py
  BRIEF.md  README.md
```

## How the UI is rebuilt

Not a screenshot and not a redraw: the sting embeds Aje's own DOM and stylesheet, captured from the running app.

1. `tools/capture.mjs` drives the real app (fresh profile; external requests aborted, `/api/*` answered `{}` locally,
   so no model or database call) to the example's Next steps with "Talk to 5 clinic owners" open, at 1280×900
   (desktop) and 320×568 (phone). It saves the live `.app` subtree, the compiled stylesheet (media queries resolved
   for that viewport, selectors scoped to `.vp-d` / `.vp-p`, unused rules dropped), the next/font files, the computed
   sky (body gradient + fixed glow layer, in px) and reference screenshots.
2. `tools/vp.mjs` turns that into a "viewport box": a div the size of the browser viewport whose own backgrounds are
   Aje's sky, with the page scroll as a translate.
3. `tools/verify-ui.mjs` renders the box alone and diffs it against the real screenshots (DPR 2). Inside the regions
   the sting shows: mean absolute difference 0.06–0.14 / 255, PSNR 50–59 dB (antialiasing only).
4. `tools/compose.mjs` writes both `index.html` files: our stage and windows, the boxes cropped by each window, and
   the one paused GSAP timeline. App CSS animations are switched off inside the boxes; the timeline re-plays Aje's
   own entrances (rise, receipt, check draw, chip arrival) with the timings in the BUILD / BREATHE / RESOLVE blocks.

## Re-render

Needs Node 22+, ffmpeg with libx264 + libvpx, Python 3 with Pillow + NumPy.

Paths below are relative to this folder, `design/clips/aje/`.

```bash
bash tools/build.sh   # check both cuts, render PNG masters, encode, stills, PSNR lines
```

The script finds its folders from its own path, so it runs from any directory. Masters (lossless PNG) go to
`design/work/build/<cut>/`; the four files and the stills are written to `design/clips/` (the folder above this one).
Neither is committed: the site serves its own copies from `public/clips/` and `public/images/`.

Recapture (only if Aje's UI changes): start Aje (`cd <Aje>/web && npx next dev -p 3230`), then from this folder
`PLAYWRIGHT_MODULE=<Aje>/web/node_modules/playwright/index.mjs node tools/capture.mjs` (writes `work/capture`),
`node tools/verify-ui.mjs work/capture work/verify`, and
`KLAO_SITE=<klao-site> node tools/compose.mjs work/capture .`. Stop the dev server afterwards.

## Fidelity

| On screen | Source (Aje repo `web/src/…`, read-only) | How it gets here |
|---|---|---|
| Header: mark, "Aje", "Dental LINE receptionist (example)", "What is Aje?", "ไทย" | `components/App.tsx` (header), `BrandMark.tsx`; `app/globals.css` `.top`, `.brand`, `.vn`, `.hlink`, `.lang-toggle` | live DOM + compiled CSS |
| Sky (teal "quests" mood + glows) | `app/globals.css` `body`, `body[data-tab="quests"]`, `body::before` | computed px on the box |
| Card "START HERE · Talk to 5 clinic owners", "Customer interview (Mom Test) · Problem & Customer", "Talk to people" | `components/Quests.tsx` `QuestCard`; `lib/sample.ts` (example test) | live DOM |
| Steps 1–3 (what to do / what you want to learn / a useful result) | `QuestCard` `.test-steps`; `lib/sample.ts` | live DOM |
| "Evidence reviewed · Your review is updated" + check | `QuestResult` `.quest-receipt`; check draw = `globals.css` `.is-fresh … path` (dash 20) | live DOM; draw re-timed |
| "Problem F → B · +56", "Customer D → C · +23", "Reviewed" | `QuestResult` `.result` (deltas from `lib/sample.ts` seed grade) | live DOM; arrival = Aje's `{opacity 0, y 6}` |
| "Problem and Customer moved on field evidence. Next block: …" | `lib/sample.ts` `advisor_note`; `.qnote` | live DOM; `rise` re-timed |
| Card entrance | `globals.css` `@keyframes rise` (14 px, `.2,.8,.2,1`, .5 s) | GSAP, same values |
| Fonts | `app/layout.tsx` next/font: DM Sans, Geist, IBM Plex Sans Thai | files copied from the app |
| Frame 0 (16:9) | klao-site `public/images/aje.jpg` | byte-for-byte copy |
| Stage, windows, shadow, eases | klao-site `frame.md` | ours |

## Not 100% faithful

- Two windows: the header is shown as it sits at the top of the page, the card as the page scrolled 260 px. In the
  app they are one viewport; Aje's header has no blur, so the real combined view shows page text through the name.
- 1:1: the card is Aje's phone layout (320 px); the name strip is the desktop header (Aje hides the name below 641 px
  and truncates it below 961 px). A phone never shows both at once.
- Crops stop before the level meter ("Level 3 of 9"), which the real header shows.
- Timing: Aje plays the review reveal in ~0.6 s at grade time; the sting spreads it over ~2.4 s. "Reviewed" follows the
  score chips instead of appearing with the receipt; the deltas arrive with final numbers (no count-up, per frame.md);
  the card's `evidence-focus` flash is left out; the header fades in after the dissolve.
- The 1:1 move from the card's top to its review is a page change (out, in), not a scroll.

## Measured (build run 2026-10-01)

| File | Size | Codec | Keyframes | PSNR vs master (mean / min) | Frame 0 vs `aje.jpg` |
|---|---|---|---|---|---|
| `aje-sting-16x9.mp4` | 427 KB | H.264 High, CRF 26, zones 0–8 QP 20, +faststart | 0, 4.033 s | 41.6 / 37.8 dB | 47.5 dB |
| `aje-sting-16x9.webm` | 393 KB | VP9, CRF 34 | 0, 4.033 s | 42.0 / 39.5 dB | 45.2 dB |
| `aje-sting-1x1.mp4` | 379 KB | H.264 High, CRF 22, zone 0 QP 16, +faststart | 0, 4.033 s | 43.7 / 40.9 dB | n/a (own poster) |
| `aje-sting-1x1.webm` | 264 KB | VP9, CRF 32 | 0, 4.033 s | 42.9 / 39.6 dB | n/a |

All: 30 fps, 150 frames, 5.000 s, one video stream, yuv420p, BT.709 matrix + primaries, sRGB transfer, TV range.
Masters: frames 121–150 (4.033 s →) are identical in both cuts. `hyperframes check`: 0 errors, 0 warnings in both
(contrast 68/68 and 37/37 WCAG AA; motion sidecars pass; one info in 1:1: step 1's last line is cut by the window, on purpose).
