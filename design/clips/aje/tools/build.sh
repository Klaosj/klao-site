#!/usr/bin/env bash
# build.sh — check + render both cuts, then write the web deliverables.
#   run from anywhere:  bash out/source/tools/build.sh
#   masters (lossless PNG) -> work/build/<cut>/ beside out/ · deliverables -> out/ (the folder that holds source/)
# The compositions are already written (tools/compose.mjs, from a capture of the running app; see README).
set -euo pipefail
SRC="$(cd "$(dirname "$0")/.." && pwd)"          # .../source
OUT="$(cd "$SRC/.." && pwd)"                      # .../aje/out
WORK="$(cd "$OUT/.." && pwd)/work/build"; KEY=aje
HF="npx --yes hyperframes@0.8.97"
mkdir -p "$WORK" "$OUT"
for cut in 16x9 1x1; do
  $HF check "$SRC/sting-$cut"
  $HF render "$SRC/sting-$cut" --format png-sequence --fps 30 --output "$WORK/$cut"
done
# hold starts at frame 121 (4.033 s) in both cuts: the advisor's line lands at 4.02 s and nothing moves after.
# x264 zones: 16:9 frames 0-8 (the 0.3 s hold on the still) at QP 20 keep frame 0 within 40 dB of public/images/aje.jpg;
# 1:1 frame 0 (the poster's twin) at QP 16. CRFs chosen for <= 450 KB each (measured 2026-10-01, see README).
"$SRC/tools/encode.sh" "$WORK/16x9" "$OUT/$KEY-sting-16x9" 4.0333 ${CRF264_16:-26} ${CRFVP9_16:-34} 0,8,q=20
"$SRC/tools/encode.sh" "$WORK/1x1"  "$OUT/$KEY-sting-1x1"  4.0333 ${CRF264_1:-22} ${CRFVP9_1:-32} 0,0,q=16
python3 "$SRC/tools/stills.py" "$WORK" "$OUT" "$KEY"
python3 "$SRC/tools/quality.py" "$OUT/$KEY-sting-16x9.mp4"  "$WORK/16x9" "$SRC/sting-16x9/assets/aje.jpg"
python3 "$SRC/tools/quality.py" "$OUT/$KEY-sting-16x9.webm" "$WORK/16x9" "$SRC/sting-16x9/assets/aje.jpg"
python3 "$SRC/tools/quality.py" "$OUT/$KEY-sting-1x1.mp4"   "$WORK/1x1"
python3 "$SRC/tools/quality.py" "$OUT/$KEY-sting-1x1.webm"  "$WORK/1x1"
