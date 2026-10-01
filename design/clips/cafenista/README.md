# Cafénista UI sting (round 2)

Two HyperFrames 0.8.97 compositions that rebuild Cafénista's real UI in HTML and animate it.
The 16:9 opens on the site's own still and zooms through into the rebuilt UI.

Brand truth: [../frame.md](../frame.md) — every clip follows it.

```
source/
  sting-16x9/   index.html · ui.css · ui.js · assets/cafenista.jpg   1580×900, desktop project sheet
  sting-1x1/    index.html · ui.css · ui.js                          1080×1080, phone (re-composed, bigger UI)
  tools/        build.sh · encode.sh · stills.py · quality.py · psnr_still.py
  BRIEF.md  DESIGN-NOTE.md (this sting's design note)  frame.md (klao-site frame spec, copied)
```

`assets/cafenista.jpg` is a byte-identical copy of klao-site `public/images/cafenista.jpg` (sha1 7c851576…).
`ui.css` / `ui.js` are identical in both folders: the app's CSS (tokens 0.4.0 theme A) and the
component markup, with class names mirroring `apps/web/components/*` so they can be checked line
by line. `index.html` holds the stage, layout and the one paused GSAP timeline.

## Re-render

Needs Node 22+, ffmpeg with libx264 + libvpx, Python 3 with Pillow + NumPy, and macOS (Thai uses
the system's Sukhumvit Set through `local()`, as the app does; elsewhere it falls back to
system Thai and line breaks may move).

```bash
bash source/tools/build.sh
```

It runs `hyperframes check` on both cuts, renders lossless PNG masters to `work/build/<cut>/`,
then writes `out/`:

- `cafenista-sting-16x9.mp4|webm`, `cafenista-sting-1x1.mp4|webm` — 30 fps, 150 frames, no audio,
  keyframes at 0 and at the hold (16:9 4.433 s, 1:1 4.367 s); x264 may add a scene-cut I-frame.
  16:9: x264 veryslow CRF 24 with frames 0–14 at QP 18 (+faststart), VP9 CRF 33.
  1:1: x264 CRF 22, VP9 CRF 32.
- `cafenista-frame0-1x1.jpg` (exact frame 0 = phone poster, q 82), `end-*.jpg` (held last frame),
  `contact-*.jpg` (7 frames each).
- a PSNR line per file against the master, then frame 0 of the 16:9 master and files against the
  site's still (the master is bit-identical; ~40.5 dB after 4:2:0, whose limit for this image is 40.55 dB).

Preview while editing: `cd source/sting-16x9 && npx hyperframes@0.8.97 preview --background`.

## Editing

- Timing lives in the `ZOOM-THROUGH / BUILD / BREATHE / RESOLVE` blocks of each `index.html`; eases are
  the frame.md curves solved as real cubic-béziers (don't swap in GSAP's named eases).
- 16:9 frame 0 must stay the still: keep `#shot` on top at scale 1 / opacity 1 until 0.3 s, and don't
  add `will-change` to it (a composited layer can resample the image).
- The chart is driven by `CF.geometry(s)`, a port of the app's `sparkGeometry`: s = 0 is
  dashboard-normal, s = 1 is dashboard-alert (the autoscale saturates past a 1 °C gap).
- Keep `data-layout-allow-*` on the saved-screen text, the machine-card foot and the pills: those
  overlaps are the app's overlay, the square's stacked cards and the chip's two stacked states, on purpose.
- Fidelity check used in the pilot: render the components at 390 CSS px, DPR 3, and diff against
  `design/renders/m1|m2/*.light.png` — card boxes matched to the pixel, mean absolute difference
  0.6–1.5 / 255 (antialiasing only; the saved screen differs by its time, see BRIEF). The square's
  375-pt layout has no app render to diff against; it is the same CSS at a real iPhone width.
