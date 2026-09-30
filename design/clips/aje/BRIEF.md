---
workflow: motion-graphics
flow: automation
storyboard: no
message: "Aje reviews an idea and names its next test; the next screen is one useful test, whose evidence moved the scores."
destination: website
aspect: 1580x900
language: en
audience: visitors of the klao-site portfolio (project sheet, 16:9 media box)
length: 5s
angle: webpage
---

## Intent

One 5.0 s unnarrated product clip for the Aje project sheet on klao-site. It plays once and holds its
last frame. Frame 0 is the project's existing screenshot, `public/images/aje.jpg`, pixel for pixel, because
the sheet crossfades from that still to the video. Tone: the site's "White Edition": Apple-minimal, calm,
understated. The owner dislikes hype.

Story (30 fps, 1580x900, no audio). It follows Aje's own path strip, Describe → Review → Test → Learn:

1. 0.0–0.5 s hold: the still. Aje's Review screen for BikeFix Home: the idea, its biggest uncertainty,
   "Your next test", three ways it could fail. Level 2 of 9.
2. 0.5–2.4 s: the screen eases back into a framed window on the left (scale 1 → 0.76); its rounded frame and
   shadow fade in while it moves.
3. 1.8–3.9 s: a second real window slides in from the right and settles in front: Next steps for Aje's
   built-in example idea, "Dental LINE receptionist (example)". Its test "Talk to 5 clinic owners"
   (what to do, what you want to learn, a useful result) shows "Evidence reviewed" and the two scores it moved:
   Problem F → B · +56, Customer D → C · +23.
4. 3.9–5.0 s: hold on the two-window composition (frames from 4.0 s on are identical).

## Assets

- `assets/aje.jpg`: `klao-site/public/images/aje.jpg`, byte for byte (1580x900). Frame 0, shown 1:1.
- `assets/next-steps-test.png`: a Playwright capture of the running Aje prototype (`Aje/web`, `next dev` on
  port 3210): fresh browser profile → "See an example first" → Next steps → "Choose another test" →
  "Talk to 5 clinic owners" → top of page. Viewport 1280x900 at 2x DPR. Cropped to CSS x 0–880, y 0–810
  and downscaled exactly 2:1 (Lanczos) to 880x810, i.e. 1 px per CSS px. No model call was made
  (the example idea is Aje's own seeded data; the capture logged zero API calls other than `/api/status`).

## Customizations

- Eases: klao-site tokens drift `cubic-bezier(.28,.11,.32,1)` and settle `cubic-bezier(.32,.72,0,1)`,
  implemented as deterministic cubic-bezier ease functions (same code as the Cafénista clip).

## Notes

- Visuals: only real Aje UI. Never invent UI, text or numbers; never retouch capture content.
  Crop / scale / frame / move only. The one thing hidden during capture is Next.js's dev-tools badge
  (`nextjs-portal`), which is dev-server chrome, not Aje.
- Two ideas are on screen, on purpose and labelled by the UI itself. BikeFix Home's own data lives only in the
  browser where it was reviewed (Aje stores ideas in localStorage), so the second screen uses Aje's example
  idea. The test window keeps its header, so "Dental LINE receptionist (example)" is always readable, and its
  crop stops before the header's level meter, so the frame never reads as BikeFix going from Level 2 to 3.
- Canvas #F5F6F8. Frames: radius 16 px, 1 px hairline rgba(0,0,0,.08), one soft shadow
  (0 12px 32px rgba(0,0,0,.08)). No glow, gradients, device chrome.
- Motion: translate / scale / opacity only (the review window only scales down; nothing scales up). No bounce
  or overshoot, cursor, callouts, captions, logos, overlays, count-ups. No added text.
- Crisp: the test window is shown at exactly its asset size; the review window is only ever downscaled.
- Deliverables in `out/`: aje.mp4 (H.264 yuv420p +faststart, no audio), aje.webm (VP9), each ≤450 KB target /
  700 KB cap; aje-end.jpg (exact last frame); contact.jpg (7 proof frames). No frame-0 still is exported:
  frame 0 is `public/images/aje.jpg` itself.
- Source repos (Aje, klao-site) are read-only.

## Decisions (build run, 2026-09-30 → 10-01)

- Review window: transform-origin top-left, final `translate(44px, 108px) scale(0.76)` → 1201x684, vertically
  centred. Frame values are authored at 1/0.76 (radius 21 px, hairline 1.32 px, shadow 0 15.8px 42px) so they
  settle at 16 px / 1 px / the standard shadow. An unframed copy sits on top at frame 0 and fades out 0.5–0.9 s
  (opacity only), which is how the rounded frame appears without animating the radius.
- Test window: 880x810 at (656, 45), 1:1. It enters from x +640 (left edge 1296, clear of the review window,
  whose right edge is at 1272 at 1.8 s), drift ease over 2.1 s (peak ~20 px/frame), opacity 0 → 1 over 0.45 s.
  It is ~90 % opaque before the two windows overlap by more than a few px, so their text never double-exposes.
- Iterations: v1 faded the test window in place while it rose 28 px (0.9 s fade): the two screens'
  text double-exposed for ~20 frames. v2 shortened the fade to 0.5 s: still visible ghosting. v3 slid it in
  from the right with the settle ease: clean, but ~50 px/frame at its fastest, too quick for this site.
  v4 (final) uses drift for the slide: a slow start, ~20 px/frame peak, a long soft landing.
- Master = lossless PNG sequence (`renders/master-final`, `npm run render`). Frame 1 of the master vs
  `public/images/aje.jpg`: PSNR 56.9 dB (max channel difference 1/255, JPEG decoder rounding).
- Encodes (`tools/encode-final.sh`): same codecs / preset / pixel format / colour tags as Cafénista, higher
  CRFs to meet the size target. x264 veryslow CRF 28 with frame 0 given 2x the bits (`zones=0,0,b=2`);
  VP9 CRF 42 with keyframes only at 0 s and 4 s (libvpx's default keyframe at frame 128 fell inside the held
  end and showed as a small sharpening step).
