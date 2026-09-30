#!/usr/bin/env bash
# Encode the lossless PNG master into the web deliverables. Same codecs, preset, pixel format and colour tags
# as the Cafénista clip; higher CRFs, because this clip is denser (two text-heavy screens and a full-frame
# scale-down): at the Cafénista CRFs (26 / 32) it lands at ~510 KB (mp4) and ~980 KB (webm).
#   mp4 : x264 veryslow CRF 28; frame 0 (the still the site crossfades from) gets 2x the bits (zones=0,0,b=2).
#   webm: VP9 CRF 42, one GOP with keyframes only at 0 s and 4 s (-g 150 -force_key_frames 0,4). libvpx's
#         default puts a keyframe at frame 128, in the middle of the held end, where it shows as a small
#         sharpening step; at 4 s it lands on the first still frame instead.
# Measured 2026-10-01 (tools/frameq.py): mp4 444 KB, webm 449 KB; frame 0 vs public/images/aje.jpg 43.8 / 42.3 dB.
set -euo pipefail
SRC=renders/master-final/frame_%06d.png
VF="scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,setparams=color_primaries=bt709:color_trc=iec61966-2-1:colorspace=bt709:range=tv"
mkdir -p out
ffmpeg -v error -y -framerate 30 -i "$SRC" -vf "$VF" \
  -c:v libx264 -crf "${X264_CRF:-28}" -preset veryslow -x264-params "zones=0,0,b=2" \
  -pix_fmt yuv420p -movflags +faststart -an out/aje.mp4
ffmpeg -v error -y -framerate 30 -i "$SRC" -vf "$VF" \
  -c:v libvpx-vp9 -b:v 0 -crf "${VP9_CRF:-42}" -g 150 -force_key_frames 0,4 -row-mt 1 -pix_fmt yuv420p -an out/aje.webm
ls -l out/aje.mp4 out/aje.webm
