#!/usr/bin/env bash
# enc.sh <codec:x264|vp9> <crf> <out> [extra args...]
set -euo pipefail
codec=$1; crf=$2; out=$3; shift 3
VF="scale=out_color_matrix=bt709:out_range=tv,format=yuv420p"
TAGS=(-color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv)
if [ "$codec" = x264 ]; then
  ffmpeg -v error -y -framerate 30 -i renders/master-v2/frame_%06d.png -vf "$VF" \
    -c:v libx264 -crf "$crf" -preset slow "$@" -pix_fmt yuv420p "${TAGS[@]}" -movflags +faststart -an "$out"
else
  ffmpeg -v error -y -framerate 30 -i renders/master-v2/frame_%06d.png -vf "$VF" \
    -c:v libvpx-vp9 -b:v 0 -crf "$crf" -row-mt 1 "$@" -pix_fmt yuv420p "${TAGS[@]}" -an "$out"
fi
ssim=$(ffmpeg -i "$out" -framerate 30 -i renders/master-v2/frame_%06d.png \
  -lavfi "[1:v]$VF[ref];[0:v][ref]ssim" -f null - 2>&1 | grep -o "All:[0-9.]*" || true)
psnr=$(ffmpeg -i "$out" -framerate 30 -i renders/master-v2/frame_%06d.png \
  -lavfi "[1:v]$VF[ref];[0:v][ref]psnr" -f null - 2>&1 | grep -o "average:[0-9.inf]*" || true)
echo "$out $(stat -f %z "$out") $ssim $psnr"
