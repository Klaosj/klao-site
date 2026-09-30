# Aje sheet clip (HyperFrames source)

The 5-second clip that plays once in Aje's project sheet. Built with HyperFrames 0.8.97. Spec: `docs/superpowers/specs/2026-09-30-sheet-clips.md`.

- `index.html` is the composition. `BRIEF.md` and `shot-plan.json` hold the brief, the story and the timings.
- `assets/aje.jpg` is `public/images/aje.jpg` byte for byte: frame 0 is the project's screenshot, shown 1:1, so the sheet's still-to-video crossfade shows no jump. If that screenshot ever changes, rebuild the clip.
- `assets/next-steps-test.png` is a real capture of the Aje prototype (its built-in example idea), cropped and downscaled 2:1. Never edited.
- Recapture it: start Aje's dev server (`cd <Aje repo>/web && npx next dev -p 3210`), then `AJE_URL=http://localhost:3210 node tools/capture.mjs` (set `PLAYWRIGHT_MODULE` to a `playwright/index.mjs` if `playwright` doesn't resolve here; needs Google Chrome), then `python3 tools/make_assets.py` (`KLAO_SITE` defaults to `../../..`, the repo root). No model call is involved.
- Render with `npm run render`, which writes a lossless PNG master into `renders/master-final/` (git-ignored). Then `tools/encode-final.sh` → `out/aje.{mp4,webm}`, `python3 tools/stills.py` → `out/aje-end.jpg` + `out/contact.jpg`, and `python3 tools/frameq.py out/aje.mp4 out/aje.webm` for per-frame PSNR, including frame 0 against `aje.jpg`.
- Copy `out/aje.mp4` and `out/aje.webm` to `public/clips/`. Do not replace `public/images/aje.jpg`: it already is frame 0.
- Budgets: 1580×900, 30 fps, 5.0 s, no audio, each file ≤ 700 KB (target ≤ 450 KB).
