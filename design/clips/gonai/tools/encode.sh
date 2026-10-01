#!/usr/bin/env bash
# encode.sh <png-dir> <out-basename> <hold-start-seconds> [crf-h264] [crf-vp9] [low-qp-frames]
# Lossless PNG master -> web files. 30 fps, no audio, BT.709 matrix + primaries, sRGB transfer, TV range.
# low-qp-frames > 0 holds x264 at QP 18 for frames 0..N-1 (the 16:9 cut's opening still must stay within
# 40 dB PSNR of public/images/<key>.jpg); a static still costs almost nothing after its first frame.
set -euo pipefail
SRC="$1/frame_%06d.png"; OUT="$2"; HOLD="$3"; C264="${4:-22}"; CVP9="${5:-32}"; LOWQ="${6:-0}"
VF="scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,setparams=color_primaries=bt709:color_trc=iec61966-2-1:colorspace=bt709:range=tv"
X264P="keyint=150"
[ "$LOWQ" -gt 0 ] && X264P="$X264P:zones=0,$((LOWQ - 1)),q=18"
ffmpeg -v error -y -framerate 30 -i "$SRC" -vf "$VF" \
  -c:v libx264 -preset veryslow -crf "$C264" -tune animation -pix_fmt yuv420p -x264-params "$X264P" \
  -g 150 -force_key_frames "0,$HOLD" -movflags +faststart -an "$OUT.mp4"
ffmpeg -v error -y -framerate 30 -i "$SRC" -vf "$VF" \
  -c:v libvpx-vp9 -b:v 0 -crf "$CVP9" -deadline good -cpu-used 0 -row-mt 1 -pix_fmt yuv420p \
  -g 150 -force_key_frames "0,$HOLD" -an "$OUT.webm"
ls -l "$OUT.mp4" "$OUT.webm" | awk '{print $5, $9}'
