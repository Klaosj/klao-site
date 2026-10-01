#!/usr/bin/env bash
# bed.sh — the film's music bed, generated with ffmpeg only (spec 2026-10-01 §3.4).
#   run from anywhere:  bash design/clips/film/tools/bed.sh
#   writes design/clips/film/assets/bed.m4a (committed: AAC-LC 128 kb/s, 48 kHz stereo, 40.0 s)
#   and the uncompressed pass to design/clips/film/work/bed/ (git-ignored), then prints ebur128.
#
# A slow, soft chord pad. Each chord is a set of partials: a sine root (plus a quiet octave) and four
# triangle-ish upper voices (fundamental, 1/9 third harmonic, 1/25 fifth harmonic), each voice doubled by a
# copy detuned +0.15 % on the left and −0.15 % on the right for width.
# The chords cross-fade over 2 s, centred on the film's beat changes (10.04, 18.68, 27.28, 37.26 s; spec §3.2):
#   title + Signature Fmaj9 · GoNai Am7 · Aje B♭maj7 · Cafénista C6/9 · end Fmaj7
# Then: high-pass 60 Hz, low-pass 2.2 kHz, a short multi-tap echo as a gentle room, 1 s fade in,
# 2 s fade out ending at 40.0 s, and two-pass loudnorm (linear) to −20 LUFS integrated, true peak ≤ −1.5 dBTP
# before AAC (the encoded file must stay ≤ −1 dBTP). No samples, no third-party audio, no randomness.
set -euo pipefail
FILM="$(cd "$(dirname "$0")/.." && pwd)"          # design/clips/film
WORK="$FILM/work/bed"; OUT="$FILM/assets/bed.m4a"
mkdir -p "$WORK"
DUR=40; X=2.0          # length (s) · cross-fade between chords (s)

# chord table: start end root "upper notes" (Hz, equal temperament, A4 = 440)
CHORDS=(
  "0     10.04 87.307 130.813 220.000 329.628 391.995"
  "10.04 18.68 110.000 164.814 195.998 261.626 329.628"
  "18.68 27.28 116.541 174.614 220.000 293.665 349.228"
  "27.28 37.26 130.813 195.998 220.000 293.665 329.628"
  "37.26 40    87.307 130.813 220.000 329.628 349.228"
)

# smoothstep cross-fade envelope for a chord held from $1 to $2 (edges at 0 and 40 stay open: the fades do that)
env() {
  local s="$1" e="$2" up down
  if [ "$s" = 0 ]; then up="1"; else up="st(1,clip((t-($s-$X/2))/$X,0,1));ld(1)*ld(1)*(3-2*ld(1))"; fi
  if [ "$e" = "$DUR" ]; then down="1"; else down="st(2,clip((($e+$X/2)-t)/$X,0,1));ld(2)*ld(2)*(3-2*ld(2))"; fi
  printf '(%s)*(%s)' "$up" "$down"
}
# a triangle-ish voice (fundamental, 1/9 third harmonic, 1/25 fifth) at frequency $1 × factor $2
tri() { printf '(sin(2*PI*%s*%s*t)-sin(6*PI*%s*%s*t)/9+sin(10*PI*%s*%s*t)/25)' "$1" "$2" "$1" "$2" "$1" "$2"; }
# One channel of a chord. The root is a plain sine plus a quiet octave, identical in both channels, so a
# phone speaker's mono sum never cancels it. Each upper voice is a dry copy plus a copy detuned by $1 (a
# different factor per channel): a slow chorus that moves between the speakers but never fully cancels in mono.
chord() {   # $1 = detune factor for this channel; $2 = root; rest = upper notes
  local d="$1"; shift
  local root="$1"; shift
  local expr="0.30*sin(2*PI*$root*t)+0.10*sin(4*PI*$root*t)" w=0.36
  for f in "$@"; do
    expr="$expr+$w*(0.6*$(tri "$f" 1)+0.4*$(tri "$f" "$d"))"
    w=$(awk -v w="$w" 'BEGIN{printf "%.3f", w*0.84}')
  done
  printf '%s' "$expr"
}

INPUTS=(); LABELS=""; i=0
for row in "${CHORDS[@]}"; do
  read -r s e root n1 n2 n3 n4 <<<"$row"
  E=$(env "$s" "$e")
  L="$E*($(chord 1.0015 "$root" "$n1" "$n2" "$n3" "$n4"))"
  R="$E*($(chord 0.9985 "$root" "$n1" "$n2" "$n3" "$n4"))"
  INPUTS+=(-f lavfi -i "aevalsrc=exprs='$L|$R':s=48000:d=$DUR")
  LABELS="$LABELS[$i:a]"; i=$((i + 1))
done

CHAIN="${LABELS}amix=inputs=$i:normalize=0,volume=0.12,highpass=f=60,lowpass=f=2200,"
CHAIN="${CHAIN}aecho=in_gain=0.8:out_gain=0.8:delays=67|113|181|257:decays=0.32|0.24|0.17|0.11,"
CHAIN="${CHAIN}atrim=0:$DUR,afade=t=in:st=0:d=1,afade=t=out:st=$((DUR - 2)):d=2"

ffmpeg -v error -y "${INPUTS[@]}" -filter_complex "$CHAIN" -c:a pcm_f32le "$WORK/bed-raw.wav"

# two-pass loudnorm, linear (one constant gain, so the fades and the pad's own dynamics stay as written)
TARGET="I=-20:TP=-1.5:LRA=11"
STATS=$(ffmpeg -hide_banner -nostats -i "$WORK/bed-raw.wav" -af "loudnorm=$TARGET:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
val() { printf '%s' "$STATS" | sed -n "s/.*\"$1\" : \"\\([^\"]*\\)\".*/\\1/p"; }
ffmpeg -v error -y -i "$WORK/bed-raw.wav" \
  -af "loudnorm=$TARGET:linear=true:measured_I=$(val input_i):measured_TP=$(val input_tp):measured_LRA=$(val input_lra):measured_thresh=$(val input_thresh):offset=$(val target_offset),aresample=48000,atrim=0:$DUR" \
  -c:a pcm_f32le "$WORK/bed.wav"
ffmpeg -v error -y -i "$WORK/bed.wav" -c:a aac -b:a 128k -ar 48000 -ac 2 -movflags +faststart "$OUT"

echo "== $OUT"
ffprobe -v error -show_entries format=duration:stream=codec_name,sample_rate,channels,bit_rate -of default=nw=1 "$OUT"
echo "== ebur128 (encoded file)"
ffmpeg -hide_banner -nostats -i "$OUT" -af ebur128=peak=true -f null - 2>&1 | sed -n '/Summary:/,$p'
