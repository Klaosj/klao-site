# Sheet stings: rebuilt-UI clips, with a square cut for phones

Status: approved 2026-10-01. Klao wrote "เสร็จแล้วส่ง preview มาดู" on the recommendations, taken as 1A adopt stings, 2A Aje + GoNai too, and 3B ship together with frame-rhythm on this branch. Preview goes to Klao before any deploy.

## 1. What changes
1. The three sheet clips (Cafénista, Aje, GoNai) are replaced with **UI stings**: the app UI rebuilt from its own components and animated, following `design/clips/frame.md`. Each 16:9 sting starts on the project's existing screenshot (frame 0 == `public/images/<key>.jpg` == the Notion Screenshot), then zooms through into the rebuilt UI. The poster and the Notion image therefore do not change.
2. **Phones get a square cut.** On a viewport ≤ 734 px, a project whose clip has a square variant shows:
   - a square poster: bundled `/images/<key>-1x1.jpg`, which is frame 0 of the square clip;
   - the square clip, `/clips/<key>-1x1.{webm,mp4}`, in a square media box.

   Desktop is unchanged: 16:9 poster and 16:9 clip.
3. The sting sources replace the old screenshot-pan sources in `design/clips/<key>/`. The old ones stay in git history.

## 2. Rules (binding)
Everything in `docs/superpowers/specs/2026-09-30-sheet-clips.md` still holds:
- Plays once, holds the last frame, and has Replay.
- No video under reduced motion or Save-Data.
- ≤ 5 s and ≤ 700 KB per file.
- Only opacity and transform animate in CSS.

New rules:
- **Viewport choice.** The square sources are chosen at mount by `matchMedia('(max-width: 734px)')`, the site's phone breakpoint. There is no switching mid-play (YAGNI).
- **Poster and no-JS.** The square poster is delivered through `<picture><source media="(max-width: 734px)" srcset=… width="1080" height="1080">`, so phones without JS, and phones with reduced motion, see the finished square still. Desktop and no-square projects render exactly as today.
- **Clip box.** On phones with a square clip, the media box, the poster and the video share one square box. There is no layout shift inside the sheet when the video fades in.
- **Replay.** Replay stays inside the visible picture.
- **Labels.** Each clip has EN/TH accessible labels that describe the sting.
