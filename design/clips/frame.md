---
name: klao-site frame
version: 0.1 (2026-10-01)
source: klao-site src/app/globals.css (White Edition tokens), spec 2026-09-25 §5.5, sheet-clips spec 2026-09-30
colors:
  stage: "#F5F6F8"          # --mist, light. Every clip sits on this.
  stage-dark: "#141518"     # --mist, dark variant renders
  paper: "#FFFFFF"          # --canvas, window/card surfaces we draw ourselves
  ink: "#1A1C20"            # --ink-1
  ink-2: "#666970"          # --ink-2
  accent: "#26314A"         # --kram, the ONLY accent we add. App UIs keep their own colours inside their frames.
  line: "rgba(20,26,44,.10)"
  gonai: "#1C7A57"          # only ever inside GoNai's own UI
typography:
  display: "ui-serif (New York) 600 — film titles and end cards only (Klao 4A, 2026-10-01)"
  text: "system-ui (SF Pro) 400/600"
  thai: "Anuphan 500/600 for Thai we set ourselves; app UIs keep their own fonts"
  min-size-at-display: "13 px Thai / 12 px Latin once scaled to the site's display width"
spacing:
  gutter: 64
  frame-gap: 40
radius:
  window: 18
  phone: 36
  card: 14
shadow:
  surface: "0 0 0 1px rgba(20,26,44,.05), 0 2px 4px rgba(20,26,44,.04), 0 12px 28px -8px rgba(20,26,44,.12)"   # --e2, one per surface
motion:
  arrive: "cubic-bezier(.32,.72,0,1) 420–600 ms"     # --ease-settle
  move: "cubic-bezier(.28,.11,.32,1) 600–1200 ms"    # --ease-drift
  leave: "cubic-bezier(.4,0,1,1) 200–320 ms"         # --ease-exit, exits faster than entrances
  press: "cubic-bezier(.34,1.56,.64,1) 200 ms"       # --ease-tick, the ONE allowed overshoot, only on a press
  camera-scale-max: 1.06
formats:
  sting-desktop: "1580x900, 30 fps, 5.0 s, no audio, <=700 KB, frame 0 == poster, holds last frame"
  sting-mobile: "1080x1080, same rules, re-composed (bigger UI), not cropped"
  film: "1920x1080, 30 fps, 30-45 s, light music allowed, user-started only (poster + Play)"
---

## Overview
Every clip on klao-site is **proof, not decoration**. A stranger should understand what the app does in one 5-second look, with no sound and no caption, and nothing on screen may be untrue today.

## The frame
- **The stage is quiet:** `stage` colour, no gradients, no glow, no texture.
- **The app is the only colour.** It sits inside our frames (window, phone, card), each with one hairline and one `shadow.surface`.
- **We add one accent at most:** `accent`, used for our own end card or a single focus ring.

## Composition rules
- **One idea per beat.** A 5-second sting has 3 beats at most: build → breathe → resolve.
- **Rebuild UI from the real app.** Same words, numbers, colours, radii and type hierarchy. Nothing invented. Sample or simulated data stays labelled the way the app labels it.
- **Lead the eye.** One surface is the hero of each beat and everything else steps back (scale ≤0.96, opacity ≥0.55). No identical card grids and no everything-centred compositions.
- **Frame 0 is a finished still** (poster, reduced-motion image, iOS Low Power Mode). The last frame is a finished still too.
- **Thai must read.** Check glyph clipping. Never scale a Thai line below `min-size-at-display`.

## Motion
- **Build / breathe / resolve for 5 s:** build 0.2–1.6 s (first move never at t=0) · breathe 1.6–3.6 s (one ambient move only) · resolve 3.6–4.4 s, then hold.
- **Vary on purpose.** Arrivals use `arrive`, moves use `move`, leavers use `leave`. No more than two tweens in a beat share an ease. Entrances come from different axes (y, scale, opacity-only). The slowest move is about 3× the fastest.
- **Order is hierarchy.** What matters most moves first. Total stagger stays under 500 ms.
- **Stillness after motion.** Nothing loops and nothing breathes in the final hold.

## Do / Don't
- **Do:** real UI, one accent, hairlines, calm springs, generous margins, and the same stage for all three apps.
- **Don't:**
  - glow, neon, particles, confetti, glitch, gradient text, count-ups, cursors, marquee, whip-pans or shader transitions;
  - left-edge accent stripes;
  - pure black stages;
  - more than one overshoot per clip.
