# frameq.py <video> [...]  -> per-frame RGB PSNR of an encode vs the lossless PNG master, plus frame 0 vs the
# project's screenshot (assets/aje.jpg). Decodes every frame in order (no timestamp matching: WebM stores ms
# timestamps) with accurate BT.709 chroma interpolation, close to how a browser upsamples 4:2:0.
import math, subprocess, sys
import numpy as np
from PIL import Image

W, H = 1580, 900
MASTER = "renders/master-final/frame_%06d.png"
STILL = np.asarray(Image.open("assets/aje.jpg").convert("RGB")).astype(np.float64)

def psnr(a, b):
    m = ((a - b) ** 2).mean()
    return 99.0 if m == 0 else 10 * math.log10(255 ** 2 / m)

def frames(path):
    cmd = ["ffmpeg", "-v", "error", "-i", path, "-fps_mode", "passthrough", "-vf",
           "scale=in_color_matrix=bt709:in_range=tv:flags=accurate_rnd+full_chroma_int,format=rgb24",
           "-f", "rawvideo", "-"]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    n = W * H * 3
    while True:
        buf = p.stdout.read(n)
        if len(buf) < n:
            break
        yield np.frombuffer(buf, np.uint8).reshape(H, W, 3).astype(np.float64)
    p.wait()

for path in sys.argv[1:]:
    vals, f0_still = [], None
    for i, fr in enumerate(frames(path)):
        m = np.asarray(Image.open(MASTER % (i + 1)).convert("RGB")).astype(np.float64)
        vals.append(psnr(fr, m))
        if i == 0:
            f0_still = psnr(fr, STILL)
    lo = min(vals)
    print(f"{path}: frames={len(vals)} frame0 vs aje.jpg={f0_still:.2f} dB | vs master: f0={vals[0]:.2f} "
          f"last={vals[-1]:.2f} mean={sum(vals)/len(vals):.2f} min={lo:.2f} (frame {vals.index(lo)})")
