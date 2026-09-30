# Cafénista sheet clip (HyperFrames source)

The 5-second clip that plays once in Cafénista's project sheet. Built with HyperFrames 0.8.97. Spec: `docs/superpowers/specs/2026-09-30-sheet-clips.md`.

- `index.html` is the composition. `BRIEF.md` and `shot-plan.json` hold the brief and the timings.
- `assets/` holds crops of real Cafénista renders. They are cropped and scaled only, never edited.
- Rebuild the assets with `CAFENISTA_RENDERS=<path to cafenista/design/renders> python3 tools/make_assets.py`.
- Render with `npm run render`, which writes a PNG master into `renders/` (git-ignored). Then run `tools/encode-final.sh` to get `out/cafenista.{mp4,webm}`.
- Copy the results to `public/clips/`. Frame 0 goes to `public/images/cafenista.jpg`, because the screenshot must equal frame 0.
- Budgets: 1580×900, 30 fps, 5.0 s, no audio, each file ≤ 700 KB.
