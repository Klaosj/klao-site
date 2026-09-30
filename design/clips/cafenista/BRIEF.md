---
workflow: motion-graphics
flow: automation
storyboard: no
message: "The owner sees the machine running cold on the Today timeline; the bar is already prompted to pull a check shot."
destination: website
aspect: 1580x900
language: th
audience: visitors of the klao-site portfolio (project sheet, 16:9 media box)
length: 5s
angle: webpage
---

## Intent

One 5.0 s unnarrated product clip for the Cafénista project sheet on klao-site. It plays
once and holds its last frame. Frame 0 doubles as the still screenshot (index thumbnail,
reduced-motion fallback). Tone: the site's "White Edition" — Apple-minimal, calm,
understated. The owner dislikes hype.

Story (30 fps, 1580x900, no audio):

1. 0.0–0.5 s hold — owner "วันนี้" (Today) screen centred in a clean screen frame, top of
   page visible including the red alert card.
2. ~0.5–2.4 s — inside the frame the page scrolls (translate the inner image) down to the
   "เส้นเวลาวันนี้" timeline; the machine line dropping into the pink band ends clearly visible.
3. ~2.4–4.2 s — owner screen eases left; the bar phone rises in on the right
   (opacity 0→1, translateY ~24 px→0) showing the top of the bar screen with the alert card and
   the "ชงช็อตตรวจ" button. The owner alert card (08:45) is already scrolled out of view.
4. ~4.2–5.0 s — settle and hold on the two-device composition.

## Assets

- assets/owner-today.png — crop of `cafenista/design/renders/m4/owner-today.desktop.light.png`
  (x 240–1040, full height, native 1×); the owner Today screen, shown at native size.
- assets/bar-alert-live.png — `cafenista/design/renders/m1/bar-alert-live.light.png`, uniformly
  downscaled (Lanczos) to its displayed phone size; the barista bar screen.

## Customizations

- Eases: klao-site tokens drift `cubic-bezier(.28,.11,.32,1)` and settle
  `cubic-bezier(.32,.72,0,1)`, implemented as deterministic cubic-bezier ease functions.

## Notes

- Visuals: only the real UI renders. Never invent UI, text or numbers; never retouch render
  content. Crop / scale / mask / frame / move only.
- The two alert times (08:45 owner vs 08:44 bar) must never be on screen together.
- Canvas #F5F6F8. Frames: owner radius ~18 px, phone ~36 px, 1 px hairline rgba(0,0,0,.08),
  at most one soft shadow (0 12px 32px rgba(0,0,0,.08)). No glow, neon, gradients, device chrome.
- Motion: translate / scale / opacity only; camera scale ≤ 1.08; no bounce or overshoot, no cursor,
  callouts, captions, logos, text overlays, particles, glitch, count-ups. No added text.
- Crisp: UI images at ≥1× their displayed size; never upscale a render beyond native pixels.
- Deliverables in out/: cafenista.mp4 (H.264 yuv420p +faststart, no audio, ≤450 KB target /
  700 KB cap), cafenista.webm (VP9, same targets), cafenista.jpg (exact frame 0, ≤250 KB),
  cafenista-end.jpg (exact last frame), contact.jpg (7 proof frames).
- Source repos (cafenista, klao-site) are read-only.

## Decisions (build run, 2026-09-30)

- Owner kept at native 1:1 (no scale-down) so its Thai text stays pixel-exact; the optional
  slight scale-down was skipped.
- Owner frame 800x780 at y 60, x 390 → 178; page inset +24 px at frame 0; scroll ends at page
  y 1100 (both cut edges land on blank card rows). Phone 360x780 at x 1042, y 60.
- Timings: hold 0–0.5 · scroll 0.5–2.4 (drift) · owner left 2.4–3.9 (drift) · phone y 3.0–4.2
  (settle), opacity 3.0–3.8 (drift) · static 4.2–5.0.
- Master = lossless PNG sequence (`renders/master-final`); web files encoded by
  `tools/encode-final.sh` (x264 veryslow CRF 26; VP9 CRF 32), tagged BT.709 primaries/matrix,
  sRGB transfer, TV range.
