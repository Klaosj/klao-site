---
workflow: motion-graphics
flow: automation
storyboard: no
message: "From BikeFix's Review, into Aje's own example: its test is reviewed, two scores move on field evidence, and the advisor says why."
destination: website
aspect: 1580x900 (desktop sheet) + 1080x1080 (phone)
language: en
audience: visitors of the klao-site portfolio, Aje project sheet
length: 5s
angle: ui-sting (rebuilt UI, no screenshots after frame 0)
---

## Intent

Round 2 of Aje's sheet clip. Round 1 slid a flat capture of Next steps beside the Review screenshot. This sting
rebuilds the real screen in HTML and lets Aje's own review moment play: the test card settles, "Evidence reviewed"
checks in, the two score chips arrive, the advisor's line resolves. Calm, Apple-minimal, never hype. Plays once, holds
the last frame, no audio.

## Story

1. Frame 0 (16:9) is `public/images/aje.jpg`, byte for byte: BikeFix Home's Review, level 2 of 9.
2. build · a calm zoom through "Open next test →" (scale 1 → 1.06, 0.6 s, move) dissolves into Aje's real Next steps
   for its built-in example idea. The header with the idea's name, "Dental LINE receptionist (example)", shows first,
   then the test "Talk to 5 clinic owners" settles in with Aje's own rise.
3. breathe · "Evidence reviewed" checks in (Aje's receipt + check draw), then "Problem F → B · +56" and
   "Customer D → C · +23", then "Reviewed".
4. resolve · "Problem and Customer moved on field evidence. Next block: no price yet — Economics stays F until you
   decide one." Then hold.

1:1 tells the same story re-composed: frame 0 is its own poster (the example's test card, readable), the window then
moves down the same card to its review section, and the same three beats play.

## Sources (read-only)

- Repo `Personal/Aje`, branch `main` (only a pre-existing untracked slide note, not used): `web/src/components/Quests.tsx`
  (`QuestCard`, `QuestResult`), `web/src/components/App.tsx` (header), `web/src/app/globals.css` + `living.css`
  (tokens, `.quest`, `.quest-receipt`, `.result`, `.qnote`, keyframes `rise` / `draw`), `web/src/lib/sample.ts`
  (the seeded example: "Talk to 5 clinic owners", the graded deltas and the advisor note), `docs/07_prototype_status.md`.
- The running app (`next dev -p 3230`, fresh browser profile): "See an example first" → Next steps → "Choose another
  test" → "Talk to 5 clinic owners". Every non-localhost request aborted, every `/api/*` answered `{}` locally:
  no model call, no database call. The DOM, the compiled stylesheet and the next/font files come from that page.
- klao-site `public/images/aje.jpg` (frame 0) and `frame.md` (copied here; the frame and motion spec).

## Constraints

- Same words, numbers, colours, radii and type as the app; nothing invented. Example data stays under its
  "(example)" header, which is on screen whenever the example's data is. The level meter is never in a crop.
- Stage #F5F6F8; one hairline + one e2 shadow per surface; no glow, particles, cursor, count-up. Overshoot: none.
- Thai ≥ 13 px at display width (the only Thai is the header's "ไทย" toggle in 16:9: 12 px × 1.42 = 17 canvas px,
  ≈ 13 px at a 1200 px sheet). Latin ≈ 12 px at display width for the smallest app text.
- Deliverables in `out/` per the common brief.

## Decisions (build run, 2026-10-01)

- Two windows, not one, in both cuts: the header strip (the page top, nothing behind it) and the test card. Aje's
  header is translucent with no blur (computed `backdrop-filter: none`), so any crop that tucks the card under the
  header shows the picker's or the card's text through the idea's name. Both windows are the same width and move as one.
- 16:9 crops stop at x 866 of the 1280 px page, before the level meter (x 899.8), as round 1 did, so the example's
  "Level 3 of 9" never reads as BikeFix's progress after BikeFix's "Level 2 of 9".
- 1:1 uses Aje's phone layout (320 px viewport) for the card: on desktop the card's lines run ~700 px and can't be
  legible in a 340 px column. Aje hides the idea name below 641 px (and truncates it below 961 px), so the name strip
  is the desktop header (1280 px), as in 16:9. Noted under "not 100% faithful".
- During the dissolve the windows show only Aje's sky: header text and card text arrive after the still has gone,
  so the two apps' text never double-exposes (round 1's lesson).
- "Reviewed" follows the two score chips (in the app it renders with the receipt, 0.18 s before them; alone in the row
  it read as stray).
- The app's chips count up from 0 when fresh; frame.md bans count-ups, so they arrive with their final numbers.
- 1:1 page change between the card top and its review uses Aje's own page-change shape (out fast, in with a 36 px rise);
  only the page moves, the sky stays fixed, as in the app.
