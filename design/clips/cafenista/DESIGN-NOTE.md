# Cafénista UI sting · design note

Pilot, round 2 and round 3, 2026-10-01. Follows klao-site `../frame.md`. This note records
what this sting uses and where it deliberately departs.

## Surfaces and tokens

| Layer | Value | From |
|---|---|---|
| Stage | `#F5F6F8`, painted on a full-bleed `#bg` so it survives transparent PNG capture | frame.md `stage` |
| Surface frame | one e2 stack per surface: `0 0 0 1px rgba(20,26,44,.05), 0 2px 4px rgba(20,26,44,.04), 0 12px 28px -8px rgba(20,26,44,.12)` (its first layer is the hairline) | frame.md `shadow.surface` |
| Owner cards | the app component is the surface; radius = app 14 px × scale | `telemetry.module.css` |
| Bar phone / windows | our phone frame, radius 36 px, app `--bg` `#F2F2F7` inside | frame.md `radius.phone` |
| App colours | theme A light: surface `#FFFFFF`, bg `#F2F2F7`, surface-2 `#E9E9EE`, ink `#1C1C1E`, ink-2 `#636366`, accent `#6F4E37`, crit `#D03B3B` / text `#9E2222` / soft `#F7DDDD`, good-text `#0B5F0B` / soft `#E2F3E2`, series `#2A78D6 #EB6834 #1BAF7A`, seg shadow `0 1px 3px rgba(0,0,0,.12)` | `apps/web/app/globals.css` (= `design-tokens.json` 0.4.0 `themeA`) |
| Type | `'Cafenista Thai'` = Sukhumvit Set via `local()` for U+0E00–0E7F, then `-apple-system` / system-ui; sizes 34 / 30 / 22 / 19 / 17 / 15 px, weights 400–700, line-height ≥ 1.3 on Thai headings | `globals.css`, component CSS |
| Our accent | none added | frame.md allows one; not needed |

UI scale: 16:9 owner cards 1.8×, bar phone 1.65× (390-pt layout); square everything 2.76× on the 375-pt layout
(cards 343 wide, screen 375 × 812; one surface at a time). Step-backs: the machine card goes to 0.86 (16:9) and
0.96 (square), so its 15 px text stays at or above frame.md's 13 px Thai in the sheet's video box (round 3;
below 0.851 / 0.946 it would not).
The UI is laid out at its real CSS size and enlarged with CSS `zoom`, so Thai stays crisp and
line breaks match the app (checked by diffing against the 3× renders; see README).

## Eases

| Name | Curve | Used for |
|---|---|---|
| ARRIVE | `cubic-bezier(.32,.72,0,1)` | surfaces arriving, new headline, saved layer |
| MOVE | `cubic-bezier(.28,.11,.32,1)` | the chart falling, card drift / step-back, camera follow, check stroke |
| LEAVE | `cubic-bezier(.4,0,1,1)` | owner alert leaving, old headline |
| PRESS | `cubic-bezier(.34,1.56,.64,1)` | release of the "พอดี" press · the only overshoot |
| APP | `cubic-bezier(.2,.7,.3,1)` | in-app state changes: press-down, chip + line tone flip, selected segment (Cafénista's own `--motion`) |

Per beat no ease carries more than two tweens (frame.md rule). The stricter "no two share" is
not met: MOVE, ARRIVE and APP each carry two in some beats.

## Beats (30 fps) · round 2 timing, round 3 scales

16:9 · 1580×900

| t (s) | beat | what moves |
|---|---|---|
| 0–0.30 | poster | the site's still `cafenista.jpg` (owner's Today screen), untouched: frames 0–9 are bit-identical to it |
| 0.30–0.90 | zoom-through | still pushes 1.00 → 1.06 about its alert card (MOVE 0.6 s) and dissolves 0.34–0.58 (LEAVE); machine card settles 0.96 → 1 underneath, 0.52–1.02 (ARRIVE) |
| 0.80–1.35 | build | reading falls away from the dashed normal line (the real autoscale) |
| 1.15–1.57 | build | headline → "ต่ำกว่าค่าปกติของเครื่องนี้ 6.6 °C"; chip → เย็นกว่าปกติ; line → crit red |
| 1.35–2.15 | build | card drifts left, owner alert follows it in from the right (matched vectors) |
| 2.15–2.45 | breathe | read the alert (readable ~1.8–2.5) |
| 2.45–3.40 | breathe | alert leaves (gone at 2.70); card steps back (0.86×, 70 %; was 0.84×); bar phone scales in from 0.94 at 2.72 |
| 3.30–3.60 | breathe | read the bar alert + "ชงช็อตตรวจ" + "ชิมแล้วแตะรส บันทึกทันที" |
| 3.60–4.42 | resolve | press "พอดี" (0.97, release overshoot), chip selected, camera follows, "บันทึกแล้ว" layer, check draws |
| 4.43–5.00 | hold | nothing moves (keyframe at 4.433) |

1:1 · 1080×1080 — the pilot's timing: poster card (0–0.2), dip 0.2–0.8, chip/headline 0.6–1.03,
the alert rises over the card from the lower edge (1.05–1.75) while the card steps back to 0.96× / 60 %
(round 3; was 0.9×), the owner stack leaves upward (2.05–2.30),
then the bar screen rises in (2.30–2.90), same resolve without the camera move; static from 4.30,
keyframe at 4.367. Round 2 re-lays it out at the 375-pt phone width and 2.76× (smallest Thai 13.0 px at
340 px, round 2's estimate of the column; round 3 measured the video box at 358.8 px: 13.75 px), and starts the bar screen at 2.30 instead of 2.25: the pilot showed its two alert cards faintly
together for two frames.

## Rules held

- Frame 0 and the last frame are finished stills; first move at 0.30 s (16:9) / 0.20 s (1:1); nothing moves in the hold.
- Every clock time agrees with the still (round 3): alert since 08:45 on the owner's card and the bar's,
  bar clock 08:46, saved at 08:46. The machine card's ค่าล่าสุด reads 08:44 while normal and turns 08:46 with
  the chip (stacked states, flipped in the chip's tween: 0.733 s square, 1.267 s 16:9). The two alert cards
  are still never on screen together.
- Minimum text (round 3): measured in the sheet's video box (`.sheet-clip`: 358.8 px at a 390 phone, 894.4 px
  at 1440), every run is ≥ 13.2 px (square) / 13.1 px (16:9) in every frame it is readable, stepped-back
  surfaces included; at its largest every run is ≥ 13.75 / 14.0 px.
- Headroom over the minimum is about 1 %: re-run `node tools/text-audit.mjs sting-1x1 <w>` and
  `… sting-16x9 <w>` (w = `.sheet-clip` width at 390 / 1440) whenever `.sheet-win` sizing in
  `src/components/project-sheet.css` changes.
- Entrances vary by axis: card scale (zoom-through), alert x (16:9) / y (1:1), phone scale, saved layer opacity only.
- No glow, gradient, particles, cursor, count-up or text we wrote. Every word is the app's.
