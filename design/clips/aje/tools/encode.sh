#!/usr/bin/env bash
# encode.sh <png-dir> <out-basename> <hold-start-seconds> <crf-h264> <crf-vp9> [x264-zone, e.g. 0,8,q=20]
# Lossless PNG master -> web files. 30 fps, no audio, BT.709 matrix, sRGB transfer, TV range (the pilot's pipeline).
#   mp4 : H.264 veryslow, yuv420p, +faststart, -tune animation. A zone gives the opening frames a constant low QP
#         (as the GoNai tools' zones=0,14,q=16): frame 0 must stay within 40 dB PSNR of the still the site crossfades from.
#   webm: VP9, keyframes only at 0 and at the hold (-g 150), so no keyframe pops inside the held end.
set -euo pipefail
SRC="$1/frame_%06d.png"; OUT="$2"; HOLD="$3"; C264="$4"; CVP9="$5"; ZONE="${6:-}"
VF="scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,setparams=color_primaries=bt709:color_trc=iec61966-2-1:colorspace=bt709:range=tv"
X264P="keyint=150"; [ -n "$ZONE" ] && X264P="$X264P:zones=$ZONE"
ffmpeg -v error -y -framerate 30 -i "$SRC" -vf "$VF" \
  -c:v libx264 -preset veryslow -crf "$C264" -tune animation -x264-params "$X264P" -pix_fmt yuv420p \
  -force_key_frames "0,$HOLD" -movflags +faststart -an "$OUT.mp4"
ffmpeg -v error -y -framerate 30 -i "$SRC" -vf "$VF" \
  -c:v libvpx-vp9 -b:v 0 -crf "$CVP9" -deadline good -cpu-used 0 -row-mt 1 -pix_fmt yuv420p \
  -g 150 -force_key_frames "0,$HOLD" -an "$OUT.webm"
ls -l "$OUT.mp4" "$OUT.webm" | awk '{print $5, $9}'
