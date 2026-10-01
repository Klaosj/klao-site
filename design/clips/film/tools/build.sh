#!/usr/bin/env bash
# build.sh — the 40-second film (spec 2026-10-01 §3): stage → check → render → encode → verify.
#   run from anywhere:  bash design/clips/film/tools/build.sh            (every step)
#                       bash design/clips/film/tools/build.sh stage      (only what preview / check need)
#                       bash design/clips/film/tools/build.sh check render encode verify   (any subset, in order)
#
#   stage   1. renders each sting's lossless PNG master from its own source (design/clips/<key>/sting-<cut>/)
#              into a sting-specific folder, work/stings/<key>-<cut>/, so no app's frames can stand in for
#              another's (the stings' own build scripts share one masters folder). Never public/clips/*.
#           2. encodes each master into the film's intermediate, film-<cut>/media/<key>.mp4: 6 frames of its
#              frame 0 first (held while the window rises), the 150 frames, 30 frames of its last frame after;
#              Lanczos-scaled to the window's exact size (CUT.win in index.html), so the film shows it 1:1; lossless
#              RGB (libx264rgb, QP 0). Lossless RGB because HyperFrames turns video into PNG frames with ffmpeg,
#              and a YUV source came out 2–3 levels darker at the square's 996 px width (swscale's fast path);
#              from RGB the extraction is a copy. Chrome cannot play it, so preview/check use HyperFrames' proxy.
#           3. copies the faces and the bed into film-<cut>/media/: Anuphan + OFL from assets/fonts/, New York
#              from /System/Library/Fonts/NewYork.ttf (Apple's font: build-time copy only, never committed),
#              assets/bed.m4a.
#   check   `hyperframes check` on both cuts with both locales (check has no --variables flag, so the Thai run
#           checks a copy in work/check/ whose `locale` default is "th").
#   render  2 cuts × 2 locales → lossless PNG masters in work/render/<cut>-<locale>/ (1200 frames each).
#   encode  → public/film/film-<locale>[-1x1].{mp4,webm} (+ the bed) and the posters, exactly frame 0:
#           public/images/film-<locale>[-1x1].jpg.
#   verify  tools/verify.py (ffprobe, budgets, poster = frame 0, contact sheets) + tools/film-audit.mjs
#           (text sizes, "simulated data" on every Cafénista frame, sting display size).
# Everything under film/work/ and film-<cut>/media/ is git-ignored.
set -euo pipefail
FILM="$(cd "$(dirname "$0")/.." && pwd)"          # design/clips/film
CLIPS="$(cd "$FILM/.." && pwd)"                   # design/clips
REPO="$(cd "$CLIPS/../.." && pwd)"
WORK="$FILM/work"
HF="npx --yes hyperframes@0.8.97"
NEWYORK="${NEWYORK:-/System/Library/Fonts/NewYork.ttf}"
CUTS="16x9 1x1"; LOCALES="en th"; KEYS="gonai aje cafenista"
PRE=6; POST=30           # frames held before / after each sting (scenes.js PRE = 6 / 30)
STEPS="${*:-stage check render encode verify}"

# the deliverable's base name: film-en, film-th, film-en-1x1, film-th-1x1
base() { if [ "$1" = 16x9 ]; then echo "film-$2"; else echo "film-$2-1x1"; fi; }
# the window size the sting is shown at, read from the cut's own CUT (one source of truth)
winsize() { sed -n 's/.*win: { w: \([0-9]*\), h: \([0-9]*\) }.*/\1x\2/p' "$FILM/film-$1/index.html"; }

stage() {
  for f in scenes.js scenes.css; do
    cmp -s "$FILM/film-16x9/$f" "$FILM/film-1x1/$f" || { echo "film-16x9/$f and film-1x1/$f differ: they must be byte-identical" >&2; exit 1; }
  done
  [ -f "$NEWYORK" ] || { echo "New York not found at $NEWYORK (macOS ships it; set NEWYORK=)" >&2; exit 1; }
  for key in $KEYS; do
    for cut in $CUTS; do
      local master="$WORK/stings/$key-$cut"
      if [ "${SKIP_STINGS:-0}" != 1 ] || [ ! -f "$master/frame_000150.png" ]; then
        $HF check "$CLIPS/$key/sting-$cut"
        $HF render "$CLIPS/$key/sting-$cut" --format png-sequence --fps 30 --output "$master"
      fi
      [ "$(ls "$master" | grep -c '^frame_.*\.png$')" = 150 ] || { echo "$master: expected 150 frames" >&2; exit 1; }
      local size; size="$(winsize "$cut")"
      [ -n "$size" ] || { echo "film-$cut/index.html: no CUT.win" >&2; exit 1; }
      mkdir -p "$FILM/film-$cut/media"
      ffmpeg -v error -y -framerate 30 -i "$master/frame_%06d.png" \
        -vf "tpad=start=$PRE:start_mode=clone:stop=$POST:stop_mode=clone,scale=${size/x/:}:flags=lanczos+accurate_rnd+full_chroma_int,format=rgb24" \
        -c:v libx264rgb -qp 0 -preset slow -g 30 -movflags +faststart -an "$FILM/film-$cut/media/$key.mp4"
      echo "staged film-$cut/media/$key.mp4 ($size, $((PRE + 150 + POST)) frames) from work/stings/$key-$cut/"
    done
  done
  for cut in $CUTS; do
    mkdir -p "$FILM/film-$cut/media/fonts"
    cp "$FILM/assets/fonts/anuphan-500.woff2" "$FILM/assets/fonts/anuphan-600.woff2" "$FILM/assets/fonts/OFL.txt" "$FILM/film-$cut/media/fonts/"
    cp "$NEWYORK" "$FILM/film-$cut/media/fonts/NewYork.ttf"
    cp "$FILM/assets/bed.m4a" "$FILM/film-$cut/media/bed.m4a"
  done
}

check() {
  for cut in $CUTS; do
    echo "== check film-$cut · en"
    $HF check "$FILM/film-$cut"
    echo "== check film-$cut · th"
    local th="$WORK/check/film-$cut-th"
    mkdir -p "$th"
    cp "$FILM/film-$cut"/{index.html,scenes.js,scenes.css,hyperframes.json,meta.json,package.json} "$th/"
    cp -R "$FILM/film-$cut/media" "$th/"
    sed -i.bak 's/"default":"en"/"default":"th"/' "$th/index.html" && rm -f "$th/index.html.bak"
    grep -q '"default":"th"' "$th/index.html" || { echo "could not switch the locale default" >&2; exit 1; }
    $HF check "$th"
  done
}

render() {
  for cut in $CUTS; do
    for loc in $LOCALES; do
      $HF render "$FILM/film-$cut" --variables "{\"locale\":\"$loc\"}" --strict-variables \
        --format png-sequence --fps 30 --video-frame-format png --output "$WORK/render/$cut-$loc"
      [ "$(ls "$WORK/render/$cut-$loc" | grep -c '^frame_.*\.png$')" = 1200 ] || { echo "$cut-$loc: expected 1200 frames" >&2; exit 1; }
    done
  done
}

encode() {
  mkdir -p "$REPO/public/film" "$REPO/public/images"
  local VF="scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv420p,setparams=color_primaries=bt709:color_trc=iec61966-2-1:colorspace=bt709:range=tv"
  local KEYS_AT="0,3.1,10.04,18.68,27.28,37.26"     # a keyframe at every beat (spec §3.2; seeking in the sheet's player)
  for cut in $CUTS; do
    # CRFs measured 2026-10-01 to land under budget (16:9 ≤ 6 MB, 1:1 ≤ 5 MB per file); see README
    if [ "$cut" = 16x9 ]; then C264="${CRF264_16:-20}"; CVP9="${CRFVP9_16:-32}"; else C264="${CRF264_1:-20}"; CVP9="${CRFVP9_1:-32}"; fi
    for loc in $LOCALES; do
      local src="$WORK/render/$cut-$loc/frame_%06d.png" out; out="$REPO/public/film/$(base "$cut" "$loc")"
      # mp4: H.264 High, yuv420p, the bed's AAC stream as is (128 kb/s), +faststart. Frames 0–14 (the title
      # card's first half second) at QP 16 so frame 0 stays as sharp as the poster.
      ffmpeg -v error -y -framerate 30 -i "$src" -i "$FILM/assets/bed.m4a" -map 0:v -map 1:a -vf "$VF" \
        -c:v libx264 -preset veryslow -crf "$C264" -tune animation -profile:v high -pix_fmt yuv420p \
        -x264-params "keyint=120:zones=0,14,q=16" -force_key_frames "$KEYS_AT" \
        -c:a copy -t 40 -movflags +faststart "$out.mp4"
      # webm: VP9 + Opus 96 kb/s (constrained VBR: libopus's default VBR ran this pad at 130 kb/s)
      local bed_webm="$FILM/assets/bed.m4a"; [ -f "$WORK/bed/bed.wav" ] && bed_webm="$WORK/bed/bed.wav"
      ffmpeg -v error -y -framerate 30 -i "$src" -i "$bed_webm" -map 0:v -map 1:a -vf "$VF" \
        -c:v libvpx-vp9 -b:v 0 -crf "$CVP9" -deadline good -cpu-used 1 -row-mt 1 -pix_fmt yuv420p \
        -g 120 -force_key_frames "$KEYS_AT" -c:a libopus -b:a 96k -vbr constrained -t 40 "$out.webm"
      # poster: exactly frame 0, JPEG q 82
      python3 "$FILM/tools/verify.py" poster "$WORK/render/$cut-$loc/frame_000001.png" "$REPO/public/images/$(base "$cut" "$loc").jpg"
      for f in "$out.mp4" "$out.webm"; do echo "$(wc -c <"$f" | tr -d ' ') B  ${f#"$REPO"/}"; done
    done
  done
}

verify() {
  python3 "$FILM/tools/verify.py" all "$REPO" "$WORK" "${CONTACT_DIR:-$WORK/contact}"
  for cut in $CUTS; do
    for loc in $LOCALES; do node "$FILM/tools/film-audit.mjs" "film-$cut" "$loc"; done
  done
}

for step in $STEPS; do
  case "$step" in
    stage | check | render | encode | verify) echo "──── $step"; "$step" ;;
    *) echo "unknown step: $step (stage | check | render | encode | verify)" >&2; exit 2 ;;
  esac
done
