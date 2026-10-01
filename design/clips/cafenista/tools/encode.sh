#!/usr/bin/env bash
# encode.sh <png-dir> <out-basename> <hold-start-seconds> [crf-h264] [crf-vp9] [x264-first-frames-qp]
# Lossless PNG master -> web files. 30 fps, 150 frames, no audio, BT.709 matrix, sRGB transfer, TV range.
# With the 6th argument, x264 codes frames 0-14 (the first 0.5 s) at that constant QP (x264 zones), so
# frame 0 stays within PSNR 40 dB of the site's still it cross-fades from (16:9 only).
set -euo pipefail
SRC="$1/frame_%06d.png"; OUT="$2"; HOLD="$3"; C264="${4:-22}"; CVP9="${5:-32}"; ZQP="${6:-}"
VF="scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,setparams=color_primaries=bt709:color_trc=iec61966-2-1:colorspace=bt709:range=tv"
X264P="colorprim=bt709:transfer=iec61966-2-1:colormatrix=bt709"
[ -n "$ZQP" ] && X264P="$X264P:zones=0,14,q=$ZQP"
ffmpeg -nostdin -v error -y -framerate 30 -i "$SRC" -vf "$VF" \
  -c:v libx264 -preset veryslow -crf "$C264" -tune animation -pix_fmt yuv420p -x264-params "$X264P" \
  -g 150 -force_key_frames "0,$HOLD" -movflags +faststart -an "$OUT.mp4"
ffmpeg -nostdin -v error -y -framerate 30 -i "$SRC" -vf "$VF" \
  -c:v libvpx-vp9 -b:v 0 -crf "$CVP9" -deadline good -cpu-used 0 -row-mt 1 -pix_fmt yuv420p \
  -g 150 -force_key_frames "0,$HOLD" -an "$OUT.webm"
ls -l "$OUT.mp4" "$OUT.webm" | awk '{print $5, $9}'
