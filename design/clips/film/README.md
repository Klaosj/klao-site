# The film (40 s, 16:9 + 1:1, EN + TH)

The 40-second film of the work that the site plays only when a visitor chooses "Film · 0:40"
(spec `docs/superpowers/specs/2026-10-01-film-og-design.md` §3). Two HyperFrames 0.8.97 compositions, one per cut,
each rendered in both locales from a `locale` variable.

Brand truth: [../frame.md](../frame.md) (`film` and `film-mobile` formats). Every word on screen is verbatim from
spec §3.1.

```
design/clips/film/
  film-16x9/     index.html (geometry + type sizes) · scenes.js · scenes.css · hyperframes.json · meta.json · package.json
  film-1x1/      the same, re-composed for 1080×1080 (not cropped)
  assets/        bed.m4a (the music bed) · fonts/anuphan-500.woff2, anuphan-600.woff2, OFL.txt
  tools/         build.sh · bed.sh · film-audit.mjs · verify.py
  work/          (git-ignored) sting masters, the Thai check copies, the lossless film masters
```

- `scenes.js` holds the words (spec §3.1, EN and TH), the scene layout and the one paused GSAP timeline;
  `scenes.css` holds the frame. Both are byte-identical in the two cut folders (`tools/build.sh` refuses to
  render if they differ). Each `index.html` sets `window.CUT` (geometry) and its type sizes, and registers the
  timeline on `window.__timelines['main']`.
- Each cut's `media/` folder is git-ignored and filled by `tools/build.sh stage`: the three sting intermediates,
  the bed and the faces. Preview, check and render need it.

## Re-render

Needs macOS (New York ships with it), Node 22+, ffmpeg with libx264 + libvpx + libopus, and Python 3 with Pillow +
NumPy. Paths are relative to this folder.

```bash
bash tools/build.sh                 # stage → check → render → encode → verify (about 9 min)
bash tools/build.sh stage           # only media/ (enough for `npx hyperframes@0.8.97 preview film-16x9`)
bash tools/build.sh check render encode verify   # any subset, in that order
bash tools/bed.sh                   # only if the music changes (rewrites assets/bed.m4a)
```

- **stage** renders each sting's lossless PNG master from its own source (`../gonai`, `../aje`, `../cafenista`,
  each cut) into its own folder, `work/stings/<key>-<cut>/`. The stings' own build scripts share one masters
  folder, so the film never reads theirs, and it never uses the web files in `public/clips/`. Each master becomes
  `film-<cut>/media/<key>.mp4`: 6 frames of the sting's frame 0 (held while its window rises), its 150 frames, then
  30 frames of its last frame. It is Lanczos-scaled to the window's exact size and encoded as lossless RGB
  (libx264rgb, QP 0). HyperFrames turns video into PNG frames with ffmpeg, and from a YUV source that came out
  2–3 levels darker at the square's 996 px width. From RGB it is a copy: a film frame's window is bit-identical to
  the scaled master (checked 2026-10-01, film frame 526 = GoNai sting frame 100). Chrome cannot play lossless RGB, so
  preview and check use HyperFrames' own proxy (`media.autoProxy`).
- **check** runs `hyperframes check` on both cuts and both locales. `check` has no `--variables` flag, so the Thai
  run checks a copy in `work/check/` whose `locale` default is `th`.
- **render** writes 4 × 1200 lossless PNG frames to `work/render/<cut>-<locale>/`
  (`--video-frame-format png --strict-variables`).
- **encode** writes `public/film/film-<locale>[-1x1].{mp4,webm}` and the posters
  `public/images/film-<locale>[-1x1].jpg`.
  - mp4: H.264 High, yuv420p, x264 veryslow CRF 20, `-tune animation`, frames 0–14 at QP 16. The audio is the bed's
    own AAC stream, copied (128 kb/s, 48 kHz). `+faststart`.
  - webm: VP9 CRF 32, `-cpu-used 1`, with Opus at 96 kb/s (constrained VBR; libopus's default VBR ran this pad at
    130 kb/s).
  - Both: BT.709 tagged, TV range, a keyframe at every beat (0, 3.1, 10.04, 18.68, 27.28, 37.26 s), 40.0 s.
  - Posters: the lossless frame 0 as JPEG quality 82.
  - Budgets: 16:9 ≤ 6 MB per file, 1:1 ≤ 5 MB, poster ≤ 150 KB.
  - Encodes are not byte-reproducible (x264 and libvpx thread scheduling moves a few hundred bytes between runs;
    quality and every contract stay the same). Re-encode and commit `public/film/` only when the film's content
    changes.
- **verify** runs `tools/verify.py`, then `tools/film-audit.mjs` for each cut and locale (see Checks). verify.py
  checks ffprobe facts, budgets, and that each poster is frame 0, and it writes contact sheets (each beat's first
  frame and one held frame) to `work/contact/`, or to `CONTACT_DIR=`.

## Faces

- **New York** (the EN title card and Signature title, and the end card's name in both locales: it is Latin in both):
  Apple's font, so it is **never committed** (the repo is
  public). `tools/build.sh stage` copies `/System/Library/Fonts/NewYork.ttf` into the git-ignored `media/fonts/`,
  and `scenes.css` names it "Film Display" (`font-weight: 400 1000`, so 600 comes from the font's own weight axis).
  `local()` was tried first and does not resolve in the HyperFrames renderer: it fell back to Times (one-frame
  render, 2026-10-01).
- **Anuphan** 500 / 600 (Thai we set): the static Thai-subset woff2 files Google Fonts serves, with the family's OFL
  (`assets/fonts/OFL.txt`). The unicode-range is Thai only, as on the site, so Latin inside a Thai line stays on
  the system font (SF).
- Everything else: `system-ui` (SF).

## Music

`tools/bed.sh` writes an original pad with ffmpeg only: no samples, no third-party track.
- The chords: Fmaj9 → Am7 → B♭maj7 → C6/9 → Fmaj7, changing on the film's beats (10.04, 18.68, 27.28, 37.26 s)
  with 2 s cross-fades.
- Sine roots plus triangle-ish upper voices, each doubled by a ±0.15 % detuned copy. The root is never detuned, so
  a phone speaker's mono sum does not cancel it.
- Then a 60 Hz high-pass, a 2.2 kHz low-pass, a short multi-tap echo, a 1 s fade in and a 2 s fade out to 40.0 s,
  and two-pass linear loudnorm.

Measured on `assets/bed.m4a` (ffmpeg ebur128, 2026-10-01): −19.8 LUFS integrated, LRA 2.1 LU, true peak −10.1 dBFS.
The composition plays it from 0 to 40 s at volume 1 (`<audio id="bed">`). HyperFrames' own mix of the composition
measured the same (−19.8 LUFS, −10.2 dBFS), so encode copies the bed's stream rather than re-encoding a mix. The webm's Opus track is encoded from `work/bed/bed.wav` (the lossless bed `tools/bed.sh` writes) when it exists, and from `assets/bed.m4a` otherwise, so a rebuilt webm is not lossy-to-lossy; the committed films were not re-encoded.

## Beats

Spec §3.2's boundaries: title 0–3.1 · Signature 3.1–10.0 · GoNai 10.0–18.7 · Aje 18.7–27.3 · Cafénista
27.3–37.3 · end 37.3–40.0. The details (s):

| Time | Beat | What happens |
|---|---|---|
| 0–2.80 | title | Frame 0 is the finished card and the poster. It holds. |
| 2.80–3.08 | | The title leaves. |
| 3.10–3.54 | Signature: build | Head, then the 2022 card, then the five grey app tiles (map, calendar, wallet, transit, chat). |
| 6.48–7.59 | breathe | The tiles gather into one pile, map first. The card steps back (0.96, opacity 0.55). |
| 7.58–8.56 | resolve | The top tile turns into GoNai's pin, the pile under it goes, and the 2026 side arrives. It holds 1.2 s. |
| 9.76–10.04 | | The Signature leaves. |
| B − 0.50 | each app (B = 10.54, 19.18, 27.78) | Kicker and question arrive in one tween: the kicker is fully in at B, the question at B + 0.14. |
| B + qe (qe = 2.36, 2.32, 3.72) | | The question leaves (0.20 s). The kicker rises into the band. On the 16:9 it settles to 0.8 there, and the question comes back small under it at qe + 0.58, for the rest of the beat. |
| 13.0 · 21.6 · 31.6 | | The window rises (qe + 0.1), holding the sting's frame 0 for 0.2 s. |
| 13.2 · 21.8 · 31.8 | | The sting plays once (5.0 s). Its finished last frame then shows for 0.8 / 1.17 / 0.77–0.9 s (its own end hold plus the film's). |
| 18.40 · 27.00 · 36.98 | | Each app beat leaves (0.28 s). The next beat starts as it has gone. |
| 37.28–38.00 | end | Name, the one accent mark, the URL. Final hold 38.0–40.0. |

Reading time, frames with the question at opacity ≥ 0.5 (`film-audit`): GoNai 2.77 s, Aje 2.70 s, Cafénista
4.10 s for the big question on both cuts. On the 16:9 the question then stays in the band, about 5 s more per beat.

Eases are frame.md's: arrive (kicker + question, band question, head, tiles, pin, 2026 side, name, URL), move (card,
tile gather, kicker rise, window, mark) and leave (every exit: 0.28 s, the question's 0.20 s). No beat uses one ease
more than twice in its build, breathe or resolve, and each app beat uses each ease twice.

## Sizes

- **Stings are never shown smaller than in their project sheet.**
  - 16:9: the window is 1664 × 948, 1.053× the 1580 × 900 master. The floor is 1.045× (≥ 1651 × 941), because the
    film sheet shows the 16:9 film ≥ 1040 px wide at 1440 × 900.
  - 1:1: 996 × 996, 0.922× the 1080 × 1080 master. The floor is 0.92× (≥ 994 × 994), because the film sheet shows the
    square film edge to edge on a 390 px phone.
  - Both windows dock to the frame's bottom edge, as the site's sheet window runs past its media box.
  - The band above the window holds the kicker while a sting plays. On the 16:9 (132 px) it also holds the question,
    one line at 30 px under the kicker at 0.8 (24 px); 28 px is the fallback if any app's question would not fit
    the 1600 px text width (Cafénista's EN is 1189 px, so none is used). The square's band (84 px) holds only the
    kicker, and the film player must not cover it.
- **Text the film sets**, frame.md's 13 px Thai / 12 px Latin at the display scale:
  - 16:9: ≥ 24 / 23 px. Smallest: 24.00 px, the band kicker (30 px at 0.8); then 24.96 px, the 2022 card's 26 px
    label stepped back to 0.96.
  - 1:1: ≥ 36 / 34 px. Smallest: 39.36 px (41 px × 0.96).
  - The 1:1 also clears the stricter stand-in, the project sheet's square video box, 358.8 px at a 390 px viewport,
    which needs ≥ 39.13 / 36.12 px.
- **Thai**: a line breaks only at a space (the site's ThaiText display rule). Display titles break where `CUT`
  says, and the words are checked against §3.1.

## Checks

- `node tools/film-audit.mjs film-16x9 en` (also `film-1x1` and `th`) seeks all 1200 frames and checks:
  - text sizes;
  - that every block is a run of §3.1;
  - that "simulated data" / "ข้อมูลจำลอง" is fully opaque from Cafénista's start until it leaves (frames 834–1109,
    from `APP_BEATS`) and never fainter than any other Cafénista element;
  - each app beat's question reading time;
  - window sizes, and that each video's intrinsic size equals its window;
  - text distance from the frame edges, and that no text sits inside a clipping box. The edge floor is 12 px, on
    purpose: the square's 84 px band puts its kicker's box 14–18 px from the top (ink 15 px for Thai marks, 28 px
    for Latin), and nothing tighter than 12 px should ever pass.
- `python3 tools/verify.py all <repo> work <dir>` covers ffprobe, budgets, poster = frame 0, encode PSNR and contact
  sheets.

## Not 100 % the site's Signature scene

The scene is rebuilt from `src/components/SignatureScene.tsx`, `signature.css`, `sketches.tsx` and
`src/lib/signature.ts`. It uses the same five icons in the same order, the same grey, GoNai's green only on its own
tile, and the site's pile offsets. The differences:
- **No year chip.** Its 2023–2025 steps are numbers that are not in §3.1.
- **Dropped:** caption A ("Four years…"), the lead line, "Open app", the GoNai wash and the screenshot frame. None of
  them is in §3.1, and frame.md keeps one stage colour for the whole film.
- **Paper card.** The 2022 card is paper on the stage (one hairline, one surface shadow), not mist on white, because
  the film's stage is the site's mist.
- **Left to right on 16:9.** The 2022 card is on the left, the five apps loose beside it, and the 2026 column on the
  right. The tiles gather into GoNai's tile on the right.
- **A row on 1:1.** The tiles sit in a loose row under the card and gather at the row's left end, where GoNai's tile
  heads the 2026 side.
