"""verify.py — the film's deliverables against spec 2026-10-01 §3.3 (called by tools/build.sh).

  python3 verify.py poster <frame_000001.png> <out.jpg>
      writes the poster: exactly frame 0 of the lossless master, JPEG quality 82 (4:2:0), ≤ 150 KB.
  python3 verify.py all <repo> <work> <contact-dir>
      for each of the four films (16:9 / 1:1 × EN / TH):
        - ffprobe: container duration, video codec / profile / pixel format / fps / decoded frame count, audio stream;
          mp4 `moov` before `mdat` (+faststart); size against the budget (16:9 ≤ 6 MB, 1:1 ≤ 5 MB);
        - the poster: size, ≤ 150 KB, and that it is frame 0 (PSNR against the master's frame 0, and against
          frame 0 decoded from the mp4 and the webm);
        - encode quality: PSNR of every 10th decoded frame against the master;
        - a contact sheet of 12 frames (each beat's first frame and one held frame) into <contact-dir>.
      Exits 1 if anything is off budget or out of contract.
Needs Python 3 with Pillow + NumPy, and ffmpeg / ffprobe on PATH (as the stings' tools do).
"""
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

FPS = 30
FRAMES = 1200
MB = 1024 * 1024
BUDGET = {"16x9": 6 * MB, "1x1": 5 * MB}
POSTER_MAX = 150 * 1024
# (frame, label): each beat's first frame in which it is on screen, and one held frame (times from scenes.js)
CONTACT = [
    (0, "title · poster"),
    (60, "title · hold"),
    (102, "Signature · in"),
    (270, "Signature · 2026 side"),
    (317, "GoNai · in"),
    (549, "GoNai · sting held"),
    (576, "Aje · in"),
    (807, "Aje · sting held"),
    (834, "Cafénista · in"),
    (1106, "Cafénista · sting held"),
    (1121, "end · in"),
    (1199, "end · last frame"),
]


def base(cut, loc):
    return f"film-{loc}" if cut == "16x9" else f"film-{loc}-1x1"


def poster(png, jpg):
    Image.open(png).convert("RGB").save(jpg, "JPEG", quality=82, optimize=True, progressive=True)
    size = os.path.getsize(jpg)
    print(f"poster {jpg}: {size} B (frame 0, q 82)")
    if size > POSTER_MAX:
        sys.exit(f"poster over {POSTER_MAX} B")


def psnr(a, b):
    mse = np.mean((a.astype(np.float64) - b.astype(np.float64)) ** 2)
    return float("inf") if mse == 0 else 10 * np.log10(255.0**2 / mse)


def decode(path, frame, w, h):
    """one frame of a video as RGB (BT.709, TV range, as tagged)"""
    out = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-vf", f"select=eq(n\\,{frame}),scale=in_color_matrix=bt709:in_range=tv:flags=accurate_rnd+full_chroma_int,format=rgb24",
         "-frames:v", "1", "-f", "rawvideo", "-"],
        capture_output=True, check=True).stdout
    return np.frombuffer(out, np.uint8).reshape(h, w, 3)


def decode_every(path, step, w, h):
    out = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-vf", f"select=not(mod(n\\,{step})),scale=in_color_matrix=bt709:in_range=tv:flags=accurate_rnd+full_chroma_int,format=rgb24",
         "-fps_mode", "passthrough", "-f", "rawvideo", "-"],
        capture_output=True, check=True).stdout
    return np.frombuffer(out, np.uint8).reshape(-1, h, w, 3)


def master(work, cut, loc, frame):
    return np.asarray(Image.open(f"{work}/render/{cut}-{loc}/frame_{frame + 1:06d}.png").convert("RGB"))


def probe(path):
    j = json.loads(subprocess.run(
        ["ffprobe", "-v", "error", "-count_frames", "-show_entries",
         "format=duration,size:stream=index,codec_type,codec_name,profile,pix_fmt,width,height,r_frame_rate,nb_read_frames,sample_rate,channels,bit_rate,duration",
         "-of", "json", path], capture_output=True, check=True).stdout)
    return j


def audio_kbps(path, stream, seconds):
    """the audio stream's real rate: from the container if it says, else its packets' bytes over its real duration
    (WebM / Opus carry no bit rate)"""
    if stream.get("bit_rate"):
        return int(stream["bit_rate"]) / 1000
    sizes = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "packet=size", "-of", "csv=p=0", path],
                           capture_output=True, check=True, text=True).stdout.split()
    return sum(int(x.strip(",")) for x in sizes if x.strip(",")) * 8 / seconds / 1000


def faststart(path):
    """True when the mp4's moov atom comes before mdat"""
    with open(path, "rb") as f:
        data = f.read(1 << 20)
    i, order = 0, []
    while i + 8 <= len(data):
        size = int.from_bytes(data[i:i + 4], "big")
        kind = data[i + 4:i + 8].decode("latin-1")
        order.append(kind)
        if kind in ("moov", "mdat") or size < 8:
            break
        i += size
    return order and order[-1] == "moov"


def contact(work, cut, loc, out):
    ims = [(f, lab, Image.open(f"{work}/render/{cut}-{loc}/frame_{f + 1:06d}.png").convert("RGB")) for f, lab in CONTACT]
    w = 600 if cut == "16x9" else 400
    h = round(ims[0][2].height * w / ims[0][2].width)
    cols, lab_h, pad = 4, 30, 10
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * w + (cols + 1) * pad, rows * (h + lab_h) + (rows + 1) * pad + 40), (38, 38, 40))
    d = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/SFNS.ttf", 18)
        big = ImageFont.truetype("/System/Library/Fonts/SFNS.ttf", 22)
    except OSError:
        font = big = None
    d.text((pad, 10), f"{base(cut, loc)} · {cut} · {loc.upper()} · 12 frames: each beat's first frame and one held frame", fill=(240, 240, 240), font=big)
    for i, (f, lab, im) in enumerate(ims):
        x = pad + (i % cols) * (w + pad)
        y = 40 + pad + (i // cols) * (h + lab_h + pad)
        d.text((x, y + 4), f"{f / FPS:5.2f} s · frame {f} · {lab}", fill=(225, 225, 225), font=font)
        sheet.paste(im.resize((w, h), Image.LANCZOS), (x, y + lab_h))
    sheet.save(out, quality=90)
    print(f"contact sheet {out}")


def all_(repo, work, contact_dir):
    os.makedirs(contact_dir, exist_ok=True)
    bad = []
    for cut in ("16x9", "1x1"):
        w, h = (1920, 1080) if cut == "16x9" else (1080, 1080)
        for loc in ("en", "th"):
            name = base(cut, loc)
            print(f"\n== {name} ({cut}, {loc})")
            m0 = master(work, cut, loc, 0)
            first = {}
            for ext in ("mp4", "webm"):
                path = f"{repo}/public/film/{name}.{ext}"
                j = probe(path)
                v = next(s for s in j["streams"] if s["codec_type"] == "video")
                a = [s for s in j["streams"] if s["codec_type"] == "audio"]
                dur = float(j["format"]["duration"])
                size = int(j["format"]["size"])
                n = int(v.get("nb_read_frames", 0))
                fps = v["r_frame_rate"]
                line = (f"{ext}: {size} B ({size / MB:.2f} MB of {BUDGET[cut] / MB:.0f}) · {dur:.3f} s · {v['codec_name']}"
                        f"{' ' + v['profile'] if v.get('profile') else ''} {v['pix_fmt']} {v['width']}x{v['height']} {fps} fps · {n} frames · "
                        + (f"audio {a[0]['codec_name']} {a[0]['sample_rate']} Hz {a[0]['channels']} ch {audio_kbps(path, a[0], float(a[0].get('duration') or dur)):.1f} kb/s" if a else "NO AUDIO"))
                if ext == "mp4":
                    line += f" · faststart {'yes' if faststart(path) else 'NO'}"
                print("  " + line)
                if size > BUDGET[cut]:
                    bad.append(f"{name}.{ext} over budget")
                if abs(dur - 40.0) > 1 / FPS + 1e-6:
                    bad.append(f"{name}.{ext} duration {dur}")
                if fps != "30/1" or n != FRAMES:
                    bad.append(f"{name}.{ext} {fps} fps, {n} frames")
                if not a:
                    bad.append(f"{name}.{ext} has no audio")
                if (v["width"], v["height"]) != (w, h):
                    bad.append(f"{name}.{ext} size {v['width']}x{v['height']}")
                if ext == "mp4" and (v["codec_name"] != "h264" or v.get("profile") != "High" or v["pix_fmt"] != "yuv420p" or a[0]["codec_name"] != "aac" or not faststart(path)):
                    bad.append(f"{name}.mp4 not H.264 High yuv420p + AAC + faststart")
                if ext == "webm" and (v["codec_name"] != "vp9" or a[0]["codec_name"] != "opus"):
                    bad.append(f"{name}.webm not VP9 + Opus")
                f0 = decode(path, 0, w, h)
                every = decode_every(path, 10, w, h)
                ps = [psnr(master(work, cut, loc, i * 10), every[i]) for i in range(len(every))]
                print(f"  {ext}: frame 0 vs master {psnr(m0, f0):.2f} dB · every 10th frame vs master: mean {np.mean(ps):.2f} dB, lowest {min(ps):.2f} dB @frame {10 * int(np.argmin(ps))}")
                first[ext] = f0
            jpg = f"{repo}/public/images/{name}.jpg"
            p = np.asarray(Image.open(jpg).convert("RGB"))
            size = os.path.getsize(jpg)
            print(f"  poster {name}.jpg: {size} B, {p.shape[1]}x{p.shape[0]} · vs master frame 0 {psnr(m0, p):.2f} dB"
                  f" · vs mp4 frame 0 {psnr(first['mp4'], p):.2f} dB · vs webm frame 0 {psnr(first['webm'], p):.2f} dB")
            # frame 0 == the poster: the poster is written from the master's frame 0 (q 82); the master's frames 0 and 1
            # are identical (nothing moves before 3.42 s), so the video opens on exactly that picture
            if (p.shape[1], p.shape[0]) != (w, h) or size > POSTER_MAX or psnr(m0, p) < 38:
                bad.append(f"{name}.jpg is not frame 0 within budget")
            if psnr(m0, master(work, cut, loc, 1)) != float("inf"):
                bad.append(f"{name}: master frames 0 and 1 differ")
            contact(work, cut, loc, f"{contact_dir}/contact-{cut}-{loc}.jpg")
    print()
    if bad:
        print("FAIL:\n  " + "\n  ".join(bad))
        sys.exit(1)
    print("all deliverables within contract")


if __name__ == "__main__":
    if sys.argv[1] == "poster":
        poster(sys.argv[2], sys.argv[3])
    elif sys.argv[1] == "all":
        all_(sys.argv[2], sys.argv[3], sys.argv[4])
    else:
        sys.exit(__doc__)
