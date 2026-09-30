# GoNai sheet clip (HyperFrames source)

The 5-second clip that plays once in GoNai's project sheet. Built with HyperFrames 0.8.97. Spec: `docs/superpowers/specs/2026-09-30-sheet-clips.md`.

Brand truth: [../frame.md](../frame.md) — every clip follows it.

- `index.html` is the composition. `BRIEF.md` and `shot-plan.json` hold the brief and the timings.
- `assets/landing.jpg` is `public/images/gonai.jpg` byte for byte: frame 0 is the sheet's existing screenshot, so the still-to-video crossfade does not jump.
- `assets/plan.png` and `assets/share.png` are real GoNai screens (branch `fix/p0-truth-keepalive`), cropped and scaled only, never edited. They were captured from a local GoNai dev server on the JSON store; nothing was written to the production database. `tools/capture.mjs` refuses to run unless `/api/health` reports `"store":"json"` on localhost.
- Rebuild the assets: run `tools/capture.mjs` (see its header), then `python3 tools/make_assets.py`.
- Render with `npx hyperframes@0.8.97 render . --format png-sequence -o renders/master-final` (git-ignored), then `tools/encode-final.sh` for `out/gonai.{mp4,webm}`, `python3 tools/stills.py` for the end still and contact sheet, and `python3 tools/verify.py out/gonai.mp4` to check frame 0 against the screenshot (PSNR ≥ 40 dB) and the held last frame.
- Copy the results to `public/clips/`. Do not replace `public/images/gonai.jpg`; the clip starts on it.
- Budgets: 1580×900, 30 fps, 5.0 s, no audio, each file ≤ 700 KB.
