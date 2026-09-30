#!/usr/bin/env bash
# Encode the lossless PNG master into the web deliverables (no audio).
# Frames 0-14 (the 0.5 s hold on the screenshot) get a low constant QP in x264 so frame 0 stays
# within PSNR 40 dB of public/images/gonai.jpg; the static hold costs almost nothing after that.
set -euo pipefail
SRC=${SRC:-renders/master-final/frame_%06d.png}
X264_CRF=${X264_CRF:-23}
VP9_CRF=${VP9_CRF:-36}
VF="scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,setparams=color_primaries=bt709:color_trc=iec61966-2-1:colorspace=bt709:range=tv"
mkdir -p out
ffmpeg -v error -y -framerate 30 -i "$SRC" -vf "$VF" \
  -c:v libx264 -crf "$X264_CRF" -preset veryslow -x264-params "zones=0,14,q=16" \
  -pix_fmt yuv420p -movflags +faststart -an out/gonai.mp4
ffmpeg -v error -y -framerate 30 -i "$SRC" -vf "$VF" \
  -c:v libvpx-vp9 -b:v 0 -crf "$VP9_CRF" -row-mt 1 -pix_fmt yuv420p -an out/gonai.webm
ls -l out/gonai.mp4 out/gonai.webm
