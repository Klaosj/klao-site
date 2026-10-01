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
  `film-<cut>/media/<key>.mp4`: 12 frames of the sting's frame 0 (held while its window rises), its 150 frames, then
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
  - Both: BT.709 tagged, TV range, a keyframe at every beat (0, 4, 12, 20, 28, 36 s), 40.0 s.
  - Posters: the lossless frame 0 as JPEG quality 82.
  - Budgets: 16:9 ≤ 6 MB per file, 1:1 ≤ 5 MB, poster ≤ 150 KB.
- **verify** runs `tools/verify.py`, then `tools/film-audit.mjs` for each cut and locale (see Checks). verify.py
  checks ffprobe facts, budgets, and that each poster is frame 0, and it writes contact sheets (each beat's first
  frame and one held frame) to `work/contact/`, or to `CONTACT_DIR=`.

## Faces

- **New York** (EN title card, Signature title and end card): Apple's font, so it is **never committed** (the repo is
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
- The chords: Fmaj9 → Am7 → B♭maj7 → C6/9 → Fmaj7, changing on the film's beats (12, 20, 28, 36 s) with 2 s
  cross-fades.
- Sine roots plus triangle-ish upper voices, each doubled by a ±0.15 % detuned copy. The root is never detuned, so
  a phone speaker's mono sum does not cancel it.
- Then a 60 Hz high-pass, a 2.2 kHz low-pass, a short multi-tap echo, a 1 s fade in and a 2 s fade out to 40.0 s,
  and two-pass linear loudnorm.

Measured on `assets/bed.m4a` (ffmpeg ebur128, 2026-10-01): −19.8 LUFS integrated, LRA 2.6 LU, true peak −9.7 dBFS.
The composition plays it from 0 to 40 s at volume 1 (`<audio id="bed">`). HyperFrames' own mix of the composition
measured the same (−19.9 LUFS, −9.7 dBFS), so encode copies the bed's stream rather than re-encoding a mix.

## Beats

| Time (s) | Beat | What happens |
|---|---|---|
| 0–3.42 | title | Frame 0 is the finished card and the poster. It holds. |
| 3.42–3.70 | | The title leaves. |
| 3.72–4.16 | Signature: build | Head, then the 2022 card, then the five grey app tiles (map, calendar, wallet, transit, chat). |
| 7.10–8.21 | breathe | The tiles gather into one pile, map first. The card steps back (0.96, opacity 0.55). |
| 8.20–9.10 | resolve | The top tile turns into GoNai's pin, the pile under it goes, and the 2026 side arrives. |
| 11.22–11.50 | | The Signature leaves. |
| B − 0.50 | each app (B = 12, 20, 28) | The kicker arrives (fully in by B − 0.02); the question arrives at B − 0.36. |
| B + 1.5 (Cafénista B + 2.3) | | The question leaves. The kicker rises into the band. The window rises 0.3 s later. |
| window + 0.4 | | The sting plays once (5.0 s), then holds its last frame. |
| 19.22 · 27.22 · 36.00 | | Each app beat leaves. Cafénista leaves inside the end beat, so its label covers all of 28–36. |
| 36.30–37.02 | end | Name, the one accent mark, the URL. Final hold to 40.0. |

Eases are frame.md's: arrive (kicker, question, head, tiles, pin, 2026 side, name, URL), move (card, tile gather,
kicker rise, window, mark) and leave (every exit, 0.28 s). No beat uses one ease more than twice in its build,
breathe or resolve.

## Sizes

- **Stings are never shown smaller than in their project sheet.**
  - 16:9: the window is 1664 × 948, 1.053× the 1580 × 900 master. The floor is 1.045× (≥ 1651 × 941), because the
    film sheet shows the 16:9 film ≥ 1040 px wide at 1440 × 900.
  - 1:1: 996 × 996, 0.922× the 1080 × 1080 master. The floor is 0.92× (≥ 994 × 994), because the film sheet shows the
    square film edge to edge on a 390 px phone.
  - Both windows dock to the frame's bottom edge, as the site's sheet window runs past its media box. The band above
    holds only the kicker while a sting plays.
- **Text the film sets**, frame.md's 13 px Thai / 12 px Latin at the display scale:
  - 16:9: ≥ 24 / 23 px. Smallest: 24.96 px, the 2022 card's 26 px label stepped back to 0.96.
  - 1:1: ≥ 36 / 34 px. Smallest: 39.36 px (41 px × 0.96).
  - The 1:1 also clears the stricter stand-in, the project sheet's square video box, 358.8 px at a 390 px viewport,
    which needs ≥ 39.13 / 36.12 px.
- **Thai**: a line breaks only at a space (the site's ThaiText display rule). Display titles break where `CUT`
  says, and the words are checked against §3.1.

## Checks

- `node tools/film-audit.mjs film-16x9 en` (also `film-1x1` and `th`) seeks all 1200 frames and checks:
  - text sizes;
  - that every block is a run of §3.1;
  - that "simulated data" / "ข้อมูลจำลอง" is fully opaque on frames 840–1079 and never fainter than any other
    Cafénista element;
  - window sizes, and that each video's intrinsic size equals its window;
  - text distance from the frame edges, and that no text sits inside a clipping box.
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
