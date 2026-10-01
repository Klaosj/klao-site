---
workflow: motion-graphics
flow: automation
storyboard: no
message: "The espresso machine runs cold; the owner is alerted, the bar sees the same alert, and one tap logs the taste."
destination: website
aspect: 1580x900 (desktop sheet) + 1080x1080 (phone)
language: th
audience: visitors of the klao-site portfolio, Cafénista project sheet
length: 5s
angle: ui-sting (rebuilt UI; the 16:9 opens on the site's own still, then zooms through into the rebuilt UI)
---

## Intent

Pilot to replace the screenshot-pan clip on Cafénista's project sheet if Klao approves. Instead
of panning flat renders, the sting rebuilds the real UI in HTML and animates the UI itself:
the temperature line drops, the status chip changes, an alert card arrives, a segment is
pressed, the app's own "บันทึกแล้ว" screen appears. Calm, Apple-minimal, never hype.
Plays once, holds the last frame, no audio. Frame 0 is the poster and the reduced-motion image
(16:9: the site's own still; 1:1: its own finished still, bundled as `cafenista-frame0-1x1.jpg`).

## Story

0. (16:9 only) the owner's Today screen, exactly the site's still, with its red "เครื่องชงเย็นกว่าปกติ" alert;
   at 0.3 s it zooms through into that machine's card.
1. build · owner's machine card at rest, then the reading drops below the machine's own normal
   and the chip turns ปกติ → เย็นกว่าปกติ; the owner's urgent alert arrives.
2. breathe · the same alert on the bar screen, with "ชงช็อตตรวจ" and "ชิมแล้วแตะรส บันทึกทันที".
3. resolve · the barista taps "พอดี" on เชียงใหม่ แม่แตง; the app answers "บันทึกแล้ว".

## Sources (read-only)

- Repo `Personal/cafenista`, branch `feat/m4-demo`: `apps/web` components + CSS, `packages/domain`
  copy rules, `design/design-tokens.json` 0.4.0.
- Renders: `design/renders/m1/dashboard-normal`, `m1/dashboard-alert`, `m1/bar-alert-live`,
  `m2/bar-beans`, `m2/bar-saved`, `m2/bar-result`, `m4/owner-today.desktop` (all `.light.png`).
- klao-site `../frame.md` is the frame and motion spec.

## Constraints

- Same words, numbers, colours, radii, type as the app. Invent nothing; only real states.
- Stage #F5F6F8, one hairline + one e2 shadow per surface, no glow / neon / particles / cursor.
- One overshoot, on the press only. Camera scale ≤ 1.06 (used once: the 16:9 still's push-in, 1.0 → 1.06).
- Thai legible: frame.md's 13 px Thai / 12 px Latin at the sheet's video box (measured 1 Oct 2026: 894.4 px wide
  at a 1440 viewport, 358.8 px at 390), in every frame a run is readable, stepped-back surfaces included;
  square is re-composed, not cropped.
- Deliverables in `out/`: MP4 (H.264 yuv420p +faststart) and WebM (VP9, keyframes at 0 and at
  the hold) for both cuts, ≤ 700 KB each (target ≤ 450 KB), 30 fps, 5.0 s, no audio; posters,
  end frames, 7-frame contact sheets.

## Round 2 (2026-10-01): what changed against the approved pilot

- 16:9 frame 0 is now `public/images/cafenista.jpg` itself (the owner's Today screen; the site serves the
  same file as the sheet's still and cross-fades into the clip). Master frame 0 is bit-identical to it; the
  encodes reach PSNR 40.5 / 40.4 dB (mp4 / webm), the 4:2:0 limit for this image being 40.55 dB.
- 0.3–0.9 s: zoom-through. The still pushes in to 1.06 about its red alert card (MOVE, 0.6 s) and dissolves
  (LEAVE, 0.24 s); the machine card that alert is about settles in underneath (0.96 → 1, ARRIVE, 0.5 s).
  Then the pilot's story, re-timed: dip 0.8, chip/headline 1.27, owner alert 1.55, handoff 2.45, resolve 3.6.
- Fixes the pilot's sparse poster (one small card on an empty stage). Last frame unchanged (balanced pair).
- 1:1 keeps the pilot's composition; the UI is laid out at the app's 375-pt phone width (cards 343) and
  zoomed 2.76× (was 390-pt, 2.64×) so the app's smallest text (15 px) is 13.0 px on a 340 px column (was 12.5).
- Registry checked before hand-building the transition: `zoom-through-transition` (clip-path wipe + blur,
  0.9 s) and `fade-through` (passes through a wash) don't meet the ≤ 0.6 s / scale ≤ 1.06 rule; two plain
  tweens do.

## Round 3 (2026-10-01): times agree with the still, text clears the minimum

Only times and text size changed (spec `docs/superpowers/specs/2026-10-01-film-og-design.md` §2).

- Times: the rebuilt UI used the pilot's m1 times (owner alert 08:43, reading 08:44, bar 08:44), so it disagreed
  with the still it opens on (alert 08:45, data to 08:46). Every time now follows the still: owner alert and
  bar alert "ตั้งแต่ 08:45" (one alert, one `openedAt`), "ค่าล่าสุด 08:46", bar header "บาริสต้า A · 08:46"
  (the bar device's clock), saved "เบอร์ 20 · 08:46 · บาริสต้า A" (the tap time on that screen).
- Text size: measured on the live sheet, the video box is `.sheet-clip` (= `.sheet-win`, 92 % of `.smedia` on a
  phone): 358.8 px at 390 and 894.4 px at 1440 (not `.smedia`, 390 / 1040 px). Every run already cleared the
  minimum at its largest (smallest run 13.75 px square, 14.0 px desktop), but frame.md also says never scale a
  Thai line below it, and the stepped-back machine card did: 12.4 px on the square (scale 0.9) and 12.8 px on the
  16:9 (scale 0.84, held to the last frame) for the chip "เย็นกว่าปกติ" and the card's foot. The step-backs are
  now 0.96 (square; frame.md's gentlest) and 0.86 (16:9): 13.2 / 13.1 px. The square's alert moves to keep
  covering just the card's foot (card 85, alert 541; was 98 / 526); the 16:9 pair stays centred.
- The ~10 px figure parked by the sheet-stings review is not reproduced at 390. It is consistent with the
  stepped-back caption (scale 0.9) in a 320 px phone's 294 px video box: 41.4 × 0.9 × 294.4 / 1080 = 10.2 px.

## Decisions (pilot build run, 2026-10-01; still in force)

- Fixture: the 16:9 frame 0 is the m4 Today fixture (alert since 08:45, data to 08:46). From 0.3 s the sting
  uses the pilot's m1 screens (copy, layout, the 6.6 °C reading) with the still's times (round 3; the pilot's
  m1 times were 08:43 / 08:44).
- The owner's alert and the bar's alert are the same alert and both read 08:45; they are still never on
  screen together (the square's bar screen starts once the owner stack is gone).
- "ชงช็อตตรวจ" is shown but not pressed: in the app it opens the keypad log view, so a press
  followed by a bean-card tap is not a real sequence. The press is on the "พอดี" segment.
- Saved screen prints "เบอร์ 20 · 08:46 · บาริสต้า A"; the render reads 14:04 because its fixture
  clock differs. The app prints the tap time, which on this bar screen is 08:46.
- 16:9: camera follows the tap down the phone so the saved body lands centred. 1:1: bar shown as
  windows onto the phone screen (home crop, then the saved layer's crop, centred on the 812-tall screen).
- Encodes: x264 veryslow `-tune animation`, VP9 `-cpu-used 0`; BT.709 matrix, sRGB transfer tag, TV range.
  16:9: x264 CRF 24 with frames 0–14 at QP 18 (x264 zones), VP9 CRF 33. 1:1: x264 CRF 22, VP9 CRF 32.
