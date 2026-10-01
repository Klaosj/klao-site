#!/usr/bin/env bash
# build.sh — check + render both cuts, then write the web deliverables.
#   run from anywhere:  bash <deliverables>/source/tools/build.sh
#   deliverables -> the folder that holds source/ · masters (lossless PNG) -> $WORK (default ../work/build/<cut>/)
set -euo pipefail
SRC="$(cd "$(dirname "$0")/.." && pwd)"          # .../source
OUT="$(cd "$SRC/.." && pwd)"                      # .../out (holds source/ and the deliverables)
WORK="${WORK:-$OUT/../work/build}"; KEY=gonai
HF="npx --yes hyperframes@0.8.97"
mkdir -p "$WORK" "$OUT"
for cut in 16x9 1x1; do
  $HF check "$SRC/sting-$cut"
  $HF render "$SRC/sting-$cut" --format png-sequence --fps 30 --output "$WORK/$cut"
done
# hold starts: 16x9 frame 132 (4.400 s, the share card settles) · 1x1 frame 132 (4.400 s, the bar is full).
# Times sit a hair below the frame time so ffmpeg keys that frame, not the next one.
# The 16:9 cut opens on public/images/gonai.jpg: x264 holds QP 18 over its first 15 frames (0.5 s).
"$SRC/tools/encode.sh" "$WORK/16x9" "$OUT/$KEY-sting-16x9" 4.39 26 36 15
"$SRC/tools/encode.sh" "$WORK/1x1"  "$OUT/$KEY-sting-1x1"  4.39 22 32 0
python3 "$SRC/tools/stills.py" "$WORK" "$OUT" "$KEY"
python3 "$SRC/tools/quality.py" "$OUT/$KEY-sting-16x9.mp4"  "$WORK/16x9" "$SRC/sting-16x9/assets/landing.jpg"
python3 "$SRC/tools/quality.py" "$OUT/$KEY-sting-16x9.webm" "$WORK/16x9" "$SRC/sting-16x9/assets/landing.jpg"
python3 "$SRC/tools/quality.py" "$OUT/$KEY-sting-1x1.mp4"   "$WORK/1x1" "$OUT/$KEY-frame0-1x1.jpg"
python3 "$SRC/tools/quality.py" "$OUT/$KEY-sting-1x1.webm"  "$WORK/1x1" "$OUT/$KEY-frame0-1x1.jpg"
