#!/usr/bin/env bash
# music.sh — the film's music: 40 s of "Ambient Product Background_Ascent" by ummbrella (Pixabay, Pixabay Content
# License: free to use, no attribution required, no standalone redistribution). Chosen 2026-10-01.
#   run from anywhere:  bash design/clips/film/tools/music.sh            (then:  bash tools/build.sh encode)
#   needs design/clips/film/assets/music/ascent.mp3 — download it from
#   https://pixabay.com/music/upbeat-ambient-product-background-ascent-303688/  (1:36, MP3 256 kb/s)
#   writes design/clips/film/assets/bed.m4a (AAC-LC 128 kb/s, 48 kHz) and work/bed/bed.wav (lossless, for the webm).
#
# The track and the cut are NEVER committed: the repo is public and the licence forbids redistributing the music
# on its own. Only the films (music inside a video) are committed. Both paths are git-ignored.
#
# The cut: track 50.47 s → 90.47 s. Measured 2026-10-01: the track is ~110 BPM (a bar = 2.18 s, downbeats at
# 0.49 + k·2.18 s); from 50.47 s the end card (film 37.3 s) lands on a downbeat (track 87.77 s) where the track's
# own fade begins, and the beat changes at 10.0 / 18.7 s sit on beats (≤ 0.05 s), 3.1 / 27.3 s within 0.18 s.
# Then a 0.6 s fade in (the cut enters mid-phrase), a 0.5 s fade out ending at 40.0 s, and two-pass loudnorm
# (linear) to −18 LUFS integrated, true peak ≤ −1.5 dBTP before AAC.
set -euo pipefail
FILM="$(cd "$(dirname "$0")/.." && pwd)"          # design/clips/film
SRC="$FILM/assets/music/ascent.mp3"; WORK="$FILM/work/bed"; OUT="$FILM/assets/bed.m4a"
START=50.47; DUR=40; LUFS=-18; TP=-1.5
[ -f "$SRC" ] || { echo "missing $SRC — download the track from the Pixabay URL in this script's header" >&2; exit 1; }
mkdir -p "$WORK"

CUT="atrim=start=$START:duration=$DUR,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.6,afade=t=out:st=$(echo "$DUR - 0.5" | bc):d=0.5"
# pass 1: measure
J=$(ffmpeg -hide_banner -nostats -i "$SRC" -af "$CUT,loudnorm=I=$LUFS:TP=$TP:LRA=11:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
g() { echo "$J" | python3 -c "import json,sys;print(json.load(sys.stdin)['$1'])"; }
# pass 2: linear normalisation to the measured values, 48 kHz stereo
ffmpeg -v error -y -i "$SRC" -af "$CUT,loudnorm=I=$LUFS:TP=$TP:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true,aresample=48000" \
  -ac 2 -c:a pcm_s16le "$WORK/bed.wav"
ffmpeg -v error -y -i "$WORK/bed.wav" -c:a aac -b:a 128k -ar 48000 "$OUT"
echo "wrote ${OUT#"$FILM"/} and work/bed/bed.wav"
ffmpeg -hide_banner -nostats -i "$OUT" -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|LRA|Peak):" | sed 's/^ */  /'
