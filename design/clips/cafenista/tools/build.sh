#!/usr/bin/env bash
# build.sh — check + render both cuts, then write the web deliverables.
#   run from anywhere:  bash design/clips/cafenista/tools/build.sh
#   masters (lossless PNG, overwritten each run) -> design/clips/work/build/<cut>/ (git-ignored; the film reads them)
#   deliverables -> design/clips/out/ (git-ignored); the site serves its own copies from public/clips/ + public/images/
set -euo pipefail
SRC="$(cd "$(dirname "$0")/.." && pwd)"          # design/clips/cafenista (this sting's source folder)
ROOT="$(cd "$SRC/.." && pwd)"                     # design/clips (the parent of the three clip folders)
WORK="$ROOT/work/build"; OUT="$ROOT/out"
HF="npx --yes hyperframes@0.8.97"
mkdir -p "$WORK" "$OUT"
for cut in 16x9 1x1; do
  $HF check "$SRC/sting-$cut"
  $HF render "$SRC/sting-$cut" --format png-sequence --fps 30 --output "$WORK/$cut"
done
# hold starts: 16x9 frame 133 (4.433 s, camera settles) · 1x1 frame 131 (4.367 s, check drawn).
# Times sit a hair below the frame time so ffmpeg keys that frame, not the next one.
# 16x9: frames 0-14 (first 0.5 s, the site's still + the start of the push) at x264 QP 18, then CRF 24.
"$SRC/tools/encode.sh" "$WORK/16x9" "$OUT/cafenista-sting-16x9" 4.4333 24 33 18
"$SRC/tools/encode.sh" "$WORK/1x1"  "$OUT/cafenista-sting-1x1"  4.3666 22 32
python3 "$SRC/tools/stills.py" "$WORK" "$OUT"
for f in "$OUT"/cafenista-sting-*.mp4 "$OUT"/cafenista-sting-*.webm; do
  python3 "$SRC/tools/quality.py" "$f" "$WORK/$(basename "$f" | sed -E 's/cafenista-sting-([0-9x]+)\..*/\1/')"
done
# frame 0 of the 16:9 files against the site's still (target >= 40 dB; 4:2:0 limit for this image = 40.55 dB)
python3 "$SRC/tools/psnr_still.py" "$WORK/16x9/frame_000001.png" "$SRC/sting-16x9/assets/cafenista.jpg"
for f in "$OUT"/cafenista-sting-16x9.mp4 "$OUT"/cafenista-sting-16x9.webm; do
  python3 "$SRC/tools/psnr_still.py" "$f" "$SRC/sting-16x9/assets/cafenista.jpg"
done
