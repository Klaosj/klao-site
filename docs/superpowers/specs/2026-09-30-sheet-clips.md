# Sheet clips: a product clip that plays once in the project sheet (2026-09-30)

Status: built on `feat/motion-cafenista`. First user: Cafénista (HyperFrames source in `design/clips/cafenista/`).
Code: `src/lib/project-clips.ts` (registry), `src/components/SheetClip.tsx` (player),
`src/components/ProjectSheet.tsx` (`SheetMedia`, `sheetSettled`), `src/components/project-sheet.css` (`.sheet-clip`, `.sheet-replay`).
Tests: `tests/sheet-clip.test.tsx`.

## 1. Why

The page already moves in eight places: the hero tour, the Signature scroll scene, the headline
reveals, the sheet's open/close morph, the Career detent, the segmented-control thumbs, the FAQ
height and the copy → check. None of that shows a project *working*: every project is a still.
A few seconds of the real screens doing their job says more than the screenshot, and the sheet is
the one place a visitor has asked to see a project.

## 2. What it does

| Moment | Markup | What the visitor sees |
|---|---|---|
| Server render, first client render, no JavaScript | exactly the sheet's screenshot, as before: `<img>` in the `.win` box | the still |
| After mount, motion allowed, Save-Data off | `<video class="sheet-clip" muted playsinline preload="none" disablepictureinpicture>` with `<source type="video/webm">` then `<source type="video/mp4">`, absolutely positioned over the `<img>` in the same `.win` box | still the still: the video is `opacity: 0` |
| Sheet open animation finished (`ENTER_MS` 500 ms, and the A07 View Transition's `finished` when the open ran one) | JS calls `play()` | the video fades in on its `playing` event (opacity only, 320 ms); frame 0 is the screenshot, so nothing jumps and no blank or black frame shows |
| `ended` | a real `<button class="btn ctl sheet-replay">` fades in: Replay / เล่นอีกครั้ง | the last frame holds |
| Replay | `currentTime = 0`, `play()` | plays once more; the button stays (removing a button a keyboard user just pressed would drop their focus) |
| Tab hidden / visible again | `pause()` / `play()` (only if it was mid-clip) | — |
| Sheet closes / unmounts | `pause()`, then `load()` to drop what was buffered | — |
| Reduced motion or Save-Data | no `<video>` at all | the still |

Rules it keeps (White Edition global constraints):

- Only opacity animates (the fade-in and the Replay entrance keyframe); transitions sit inside
  `@media (prefers-reduced-motion: no-preference)`. All CSS is in `@layer components`.
- Never `loop`, `controls` or `autoplay` attributes: playback starts from JS, once.
- Content is never hidden: the video is only ever added over a visible screenshot, and only with JS.
- The `<video>` carries `aria-label` = the registry label for the locale; the `<img>` keeps its alt.
- Dark mode: the video gets `filter: var(--shot-dim)`, the same dim as `.win img`.
- The Replay button reuses `.btn` (pill) on the existing `.ctl` control surface, the one the tour's
  Replay and the sheet's close button already use. No new glass. Focus shows the site's own
  `:focus-visible` ring.
- No new dependency. The sheet is not in the LCP path and still isn't: nothing is fetched until
  the sheet opens and `play()` is called (`preload="none"`), and the home page gains about 1 kB
  of JS (`next build`, 30 Sep: the `/[locale]` route 16.9 → 18 kB, First Load 158 → 159 kB).

## 3. Accessibility: WCAG 2.2.2 Pause, Stop, Hide

2.2.2 applies to moving content that starts automatically, **lasts more than five seconds**, and
is shown alongside other content. A sheet clip is at most 5 s and plays once, so it is outside
2.2.2; no pause control is required. Replay is user-initiated. It still goes further than the
criterion: nothing plays under `prefers-reduced-motion: reduce`, a hidden tab pauses it, and the
still under it carries the same information as a text alternative (alt + the video's label).

## 4. Budgets

| | Budget | Checked by |
|---|---|---|
| Length | ≤ 5 s (`durationMs` ≤ 5000) | `tests/sheet-clip.test.tsx` |
| Size | ≤ 700 KB per file (webm and mp4 each) | `tests/sheet-clip.test.tsx` |
| Frame | 1580 × 900, the screenshot's own box; frame 0 = the screenshot | by eye; the CSS lays the video on the `<img>`'s exact box |
| Audio | none (no audio track) | encode flags below |

## 5. Why the files are bundled, not in Notion

Screenshots come from Notion through `/api/img`, but that proxy serves images only and caps a
file at 4 MB, so it cannot serve a video. Clips are static files in `public/clips/`, and the
registry is code (`src/lib/project-clips.ts`). Changing a clip therefore needs a commit and a
deploy, unlike a screenshot. Keep the project's Notion `Screenshot` in step with the clip's
frame 0, or the swap from still to video shows a jump.

## 6. How to add a clip

1. Source: a HyperFrames composition in `design/clips/<key>/`, where `<key>` is the project's
   sheet key (`projectKey`: its Slug, else `slugKey(Name)`, e.g. `Cafénista` → `cafenista`).
   Render at 1580 × 900, ≤ 5 s, starting on the exact frame of the project's screenshot.
2. Encode both formats, no audio:

       ffmpeg -i render.mp4 -an -c:v libvpx-vp9 -b:v 0 -crf 36 -row-mt 1 -pix_fmt yuv420p public/clips/<key>.webm
       ffmpeg -i render.mp4 -an -c:v libx264 -crf 24 -preset slow -pix_fmt yuv420p -movflags +faststart public/clips/<key>.mp4

   Raise the CRF if a file is over 700 KB.
3. Export frame 0 as the screenshot (`public/images/<key>.jpg`, 1580 × 900, ≤ 250 KB) and upload
   the same file to the project's Notion `Screenshot`.
4. Add the entry to `PROJECT_CLIPS`: `{ webm, mp4, durationMs, label: { en, th } }`. The label
   says what happens in the clip, starting with its length ("Clip, 5 seconds: …").
5. `npm test`: the registry test checks the key matches a project, both files exist and each
   is within budget.

A project whose Slug is set later keeps its clip: `clipFor` also tries `slugKey(Name)`.
