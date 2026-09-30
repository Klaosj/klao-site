#!/usr/bin/env bash
# frameq.sh <video>  -> per-frame PSNR vs master: first, last, min
set -euo pipefail
VF="scale=out_color_matrix=bt709:out_range=tv,format=yuv420p"
log=work/psnr-$(basename "$1").log
ffmpeg -v error -i "$1" -framerate 30 -i renders/master-v2/frame_%06d.png \
  -lavfi "[1:v]${VF}[ref];[0:v][ref]psnr=stats_file=${log}" -f null -
python3 - "$log" <<'PY'
import re,sys
v=[float(re.search(r'psnr_avg:([0-9.inf]+)',l).group(1)) for l in open(sys.argv[1])]
print(' frames=%d f0=%.2f last=%.2f min=%.2f at frame %d' % (len(v), v[0], v[-1], min(v), v.index(min(v))))
PY
