#!/usr/bin/env bash
# Encode the lossless PNG master into the web deliverables.
set -euo pipefail
SRC=renders/master-final/frame_%06d.png
VF="scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,setparams=color_primaries=bt709:color_trc=iec61966-2-1:colorspace=bt709:range=tv"
mkdir -p out
ffmpeg -v error -y -framerate 30 -i "$SRC" -vf "$VF" \
  -c:v libx264 -crf 26 -preset veryslow -pix_fmt yuv420p -movflags +faststart -an out/cafenista.mp4
ffmpeg -v error -y -framerate 30 -i "$SRC" -vf "$VF" \
  -c:v libvpx-vp9 -b:v 0 -crf 32 -g 150 -force_key_frames 0,4.2 -row-mt 1 -pix_fmt yuv420p -an out/cafenista.webm
ls -l out/cafenista.mp4 out/cafenista.webm
