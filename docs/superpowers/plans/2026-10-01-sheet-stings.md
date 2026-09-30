# Sheet Stings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the three sheet clips a square phone variant (poster + clip) and swap in the new UI-sting files.

**Architecture:**
- `ProjectClip` gains an optional `square` block.
- `SheetMedia` wraps the still in a `<picture>` with a phone `<source>`, and marks the box `data-square`.
- `SheetClip` picks the square sources at mount on phones.
- CSS makes the phone box square only when `data-square` is present.
- Task 5 then swaps in the real files and labels, and replaces the clip sources in `design/clips/`.

**Tech Stack:** Next.js 15 / React 19, plain CSS in `@layer components`, Vitest + Testing Library, Playwright via `scripts/qa-lib.mjs` `loadChromium()` for visual checks.

**Spec:** `docs/superpowers/specs/2026-10-01-sheet-stings-design.md` (with `docs/superpowers/specs/2026-09-30-sheet-clips.md`).

## Global Constraints
- **Phone breakpoint:** `(max-width: 734px)`, the site's existing phone breakpoint.
- **Clip files:** ≤ 5 s and ≤ 700 KB each. Posters ≤ 250 KB.
- **Clip behaviour:** plays once, holds the last frame, has Replay. No video under reduced motion or Save-Data.
- **Animation:** only `transform` and `opacity` animate. All component CSS stays in `@layer components`. No new runtime dependencies.
- **Server and first client render:** no `<video>`. Desktop markup for a project without `square` stays byte-for-byte what it is today, apart from the new wrapper, which only projects WITH `square` get.
- **Before every commit:** `npm test`, `npx tsc --noEmit`, `npm run lint` and `npm run build` are all green.
- **Commits:** conventional, with the trailer `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.

## Review Focus
1. **Phone without JS or with reduced motion:** sees the square poster, not a cropped 16:9 (test: SSR markup contains the phone `<source>`).
2. **Phone with motion:** the video is the square cut, and the box does not jump when the video fades in (browser check at 390 px: poster box height == video box height).
3. **GoNai (`win` media with an address bar) on a phone:** the square picture sits under the bar and Replay stays inside the visible picture (browser check).
4. **Desktop:** unchanged, with the 16:9 poster and the 16:9 clip (test and browser check at 1440).
5. **Project without `square`:** unchanged markup (test).

---

### Task 4: square phone variant for sheet clips

**Files:**
- Modify: `src/lib/project-clips.ts`
- Modify: `src/components/ProjectSheet.tsx` (SheetMedia img/win branch, lines ~420–442)
- Modify: `src/components/SheetClip.tsx`
- Modify: `src/components/project-sheet.css`
- Add placeholder files: `public/clips/{cafenista,aje,gonai}-1x1.{webm,mp4}`, `public/images/{cafenista,aje,gonai}-1x1.jpg`
- Test: `tests/sheet-clip.test.tsx`, `tests/project-sheet.test.tsx` (or the file that covers SheetMedia's markup), and the clip-registry test

**Interfaces:**
- Produces:
  ```ts
  export interface ProjectClip {
    webm: string; mp4: string; durationMs: number; label: Localized;
    /** Phones (max-width: 734px): a square cut with its own poster (frame 0). */
    square?: { webm: string; mp4: string; poster: string };
  }
  export const PHONE_QUERY = '(max-width: 734px)';
  ```
- Registry entries for `cafenista`, `aje` and `gonai` get `square: { webm: '/clips/<key>-1x1.webm', mp4: '/clips/<key>-1x1.mp4', poster: '/images/<key>-1x1.jpg' }`.

- [ ] **Step 1: Write the failing tests.**
  - Registry test: every `square` file exists in `public/`. Clips are ≤ 700 KB and posters ≤ 250 KB.
  - SheetMedia SSR test: for a project whose clip has `square`, the markup contains:
    - `<picture>`;
    - `<source media="(max-width: 734px)" srcSet="/images/<key>-1x1.jpg" width="1080" height="1080"/>` (attribute order may vary; assert via DOM);
    - the existing `<img>` with width 1580 and height 900;
    - `data-square` on `.smedia`.

    For a project without a clip, or with a clip but no square, there is no `<picture>` and no `data-square`.
  - SheetClip test: stub `matchMedia` so both the motion query and `PHONE_QUERY` match. The `<video>`'s sources are then `/clips/<key>-1x1.webm` and `.mp4`, in that order. When `PHONE_QUERY` doesn't match, they are the 16:9 files. When a phone gets a clip with no `square`, they are the 16:9 files.
  - CSS test: under `@media (max-width: 734px)`, `.smedia[data-square] .sheet-clip` has `aspect-ratio: 1 / 1`.
- [ ] **Step 2: Run them and see them fail.** `npx vitest run tests/sheet-clip.test.tsx <the SheetMedia test file> <the registry test file>`
- [ ] **Step 3: Implement.**
  - `project-clips.ts`: the interface plus `PHONE_QUERY`. Add `square` to the three entries.
  - Placeholders: `ffmpeg -loop 1 -i public/images/<key>.jpg -vf "crop=900:900,scale=1080:1080" -t 5 -r 30 -pix_fmt yuv420p -an …`. Make the mp4 and webm, and a square JPEG poster ≤ 250 KB. Say "placeholder" in the commit message; the real files arrive in Task 5.
  - `SheetMedia`: when `clip?.square`, wrap the `<img>` in `<picture><source media={PHONE_QUERY} srcSet={clip.square.poster} width={1080} height={1080} />…</picture>` and add `data-square=""` to `.smedia`. Leave everything else unchanged.
  - `SheetClip`: at mount, `const phone = typeof matchMedia === 'function' && matchMedia(PHONE_QUERY).matches;` then `const src = phone && clip.square ? clip.square : clip;` and render the sources from `src`. Keep every other behaviour, including the Replay button, visibility pause, unmount release and labels.
  - CSS, ≤ 734 px only: for `.smedia[data-square]`, make the media box, the poster `img` and `.sheet-clip` one square box.
    - Set `aspect-ratio: 1 / 1` on the clip.
    - Make the box's own aspect-ratio fit a square picture inside `.sheet-win` (92 % width + the win bar, if any). The simplest safe way is `aspect-ratio: auto` on the phone square box, with padding that keeps the current margins.
    - Recompute the Replay button's `bottom` for the square picture so it stays inside it. The current rule uses a 16:9-derived `50.25cqw`.
    - Desktop rules are untouched.
- [ ] **Step 4: Run the tests and see them pass.**
- [ ] **Step 5: Browser check.**
  - Run `npm run build && npx next start -p 3104`.
  - With Playwright (`loadChromium()`), open `/en#work/cafenista` and `/en#work/gonai` at 390×844, with motion and with reduced motion, and at 1440×900.
  - Screenshot each into `.superpowers/sdd/2026-10-01-sheet-stings/shots/`.
  - Assert at 390, with motion, after 6 s: the video's box height equals the poster's box height (±1 px), and `.sheet-replay`'s rect sits within the picture's rect.
  - Stop the server afterwards.
- [ ] **Step 6: Full check, then commit.** Run `npm test && npx tsc --noEmit && npm run lint && npm run build`, then commit `feat(sheet): a square clip and poster for phones` (trailer).

---

### Task 5: swap in the UI stings (files, labels, sources)

**Files:**
- Replace:
  - `public/clips/{cafenista,aje,gonai}.{webm,mp4}` (the 16:9 stings)
  - `public/clips/{cafenista,aje,gonai}-1x1.{webm,mp4}`
  - `public/images/{cafenista,aje,gonai}-1x1.jpg`
- Modify: `src/lib/project-clips.ts` (labels)
- Replace: `design/clips/{cafenista,aje,gonai}/` (the sting `source/` folders, each README keeping the `Brand truth: [../frame.md](../frame.md) — every clip follows it.` line)
- Test: the existing registry, clip and frame tests

**Interfaces:**
- Consumes: Task 4's `square` fields and file names. The deliverables come from `/private/tmp/claude-501/-Users-suvichakjarunopratamp/f2cc162a-edee-431e-93cb-9223ef2c36a3/scratchpad/stings/<key>/out/`:
  - `<key>-sting-16x9.{mp4,webm}` → `public/clips/<key>.{mp4,webm}`
  - `<key>-sting-1x1.{mp4,webm}` → `public/clips/<key>-1x1.{mp4,webm}`
  - `<key>-frame0-1x1.jpg` → `public/images/<key>-1x1.jpg`
  - `source/` → `design/clips/<key>/`, replacing the old folder

- [ ] **Step 1:** Copy the files as mapped above. Check sizes against the limits, then check frame 0 of each 16:9 mp4 against `public/images/<key>.jpg` (ffmpeg PSNR ≥ 40 dB). Record the PSNR in the report.
- [ ] **Step 2:** Update the EN and TH labels in `PROJECT_CLIPS` to the labels in each sting's report. They are provided in the dispatch.
- [ ] **Step 3:** Run the tests (registry, frame-spec, sheet-clip) and the full check.
- [ ] **Step 4:** Commit `content(clips): UI stings for Cafénista, Aje and GoNai (16:9 + square)` (trailer).
