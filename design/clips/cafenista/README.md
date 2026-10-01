# Cafénista UI sting (round 3)

Two HyperFrames 0.8.97 compositions that rebuild Cafénista's real UI in HTML and animate it.
The 16:9 opens on the site's own still and zooms through into the rebuilt UI.

Brand truth: [../frame.md](../frame.md) — every clip follows it.

```
design/clips/cafenista/
  sting-16x9/   index.html · ui.css · ui.js · assets/cafenista.jpg   1580×900, desktop project sheet
  sting-1x1/    index.html · ui.css · ui.js                          1080×1080, phone (re-composed, bigger UI)
  tools/        build.sh · encode.sh · stills.py · quality.py · psnr_still.py · text-audit.mjs
  BRIEF.md  DESIGN-NOTE.md (this sting's design note)  README.md
```

`assets/cafenista.jpg` is a byte-identical copy of klao-site `public/images/cafenista.jpg` (sha1 7c851576…).
`ui.css` / `ui.js` are identical in both folders: the app's CSS (tokens 0.4.0 theme A) and the
component markup, with class names mirroring `apps/web/components/*` so they can be checked line
by line. `index.html` holds the stage, layout and the one paused GSAP timeline.

## Re-render

Needs Node 22+, ffmpeg with libx264 + libvpx, Python 3 with Pillow + NumPy, and macOS (Thai uses
the system's Sukhumvit Set through `local()`, as the app does; elsewhere it falls back to
system Thai and line breaks may move).

Paths below are relative to this folder, `design/clips/cafenista/`.

```bash
bash tools/build.sh
```

The script finds its folders from its own path, so it runs from any directory. It runs `hyperframes check`
on both cuts, renders lossless PNG masters to `design/clips/work/build/<cut>/`, then writes `design/clips/out/`
(neither is committed; the site serves its own copies from `public/clips/` and `public/images/`):

- `cafenista-sting-16x9.mp4|webm`, `cafenista-sting-1x1.mp4|webm` — 30 fps, 150 frames, no audio,
  keyframes at 0 and at the hold (16:9 4.433 s, 1:1 4.367 s); x264 may add a scene-cut I-frame.
  16:9: x264 veryslow CRF 24 with frames 0–14 at QP 18 (+faststart), VP9 CRF 33.
  1:1: x264 CRF 22, VP9 CRF 32.
- `cafenista-frame0-1x1.jpg` (exact frame 0 = phone poster, q 82), `end-*.jpg` (held last frame),
  `contact-*.jpg` (7 frames each).
- a PSNR line per file against the master, then frame 0 of the 16:9 master and files against the
  site's still (the master is bit-identical; ~40.5 dB after 4:2:0, whose limit for this image is 40.55 dB).

Preview while editing: `cd sting-16x9 && npx hyperframes@0.8.97 preview --background`.

## Editing

- Timing lives in the `ZOOM-THROUGH / BUILD / BREATHE / RESOLVE` blocks of each `index.html`; eases are
  the frame.md curves solved as real cubic-béziers (don't swap in GSAP's named eases).
- 16:9 frame 0 must stay the still: keep `#shot` on top at scale 1 / opacity 1 until 0.3 s, and don't
  add `will-change` to it (a composited layer can resample the image).
- The chart is driven by `CF.geometry(s)`, a port of the app's `sparkGeometry`: s = 0 is
  dashboard-normal, s = 1 is dashboard-alert (the autoscale saturates past a 1 °C gap).
- Clock times follow the 16:9's still (alert since 08:45, data to 08:46); keep them in step if the still changes.
  The machine card's last-reading time has two stacked states (08:44 normal, 08:46 alert) that flip with the chip.
- Minimum text: frame.md's 13 px Thai / 12 px Latin in the sheet's video box (`.sheet-clip`, 358.8 px at a 390
  phone, 894.4 px at 1440), including stepped-back surfaces. That is why the machine card steps back only to
  0.86 (16:9) / 0.96 (1:1); below 0.851 / 0.946 its 15 px text drops under 13 px. Check with
  `node tools/text-audit.mjs sting-1x1 358.8` and `node tools/text-audit.mjs sting-16x9 894.39` (exits 1 if
  any readable run is under the minimum); re-measure the widths if `.sheet-win` sizing changes.
- Keep `data-layout-allow-*` on the saved-screen text, the machine-card foot and the pills: those
  overlaps are the app's overlay, the square's stacked cards and the chip's two stacked states, on purpose.
- Fidelity check used in the pilot: render the components at 390 CSS px, DPR 3, and diff against
  `design/renders/m1|m2/*.light.png` — card boxes matched to the pixel, mean absolute difference
  0.6–1.5 / 255 (antialiasing only; the saved screen differs by its time, see BRIEF). The square's
  375-pt layout has no app render to diff against; it is the same CSS at a real iPhone width.
