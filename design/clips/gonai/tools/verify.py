# verify.py <video> [master dir]: frame-0 PSNR vs the site screenshot (RGB, decoded as a browser
# would: BT.709, TV range), last-frame PSNR vs the master's last frame, and that the tail holds.
import sys, subprocess, math, os, tempfile
import numpy as np
from PIL import Image
video = sys.argv[1]
master = sys.argv[2] if len(sys.argv) > 2 else "renders/master-final"
tmp = tempfile.mkdtemp()
subprocess.run(["ffmpeg", "-v", "error", "-i", video, "-vf",
                "scale=in_color_matrix=bt709:in_range=tv:out_range=pc,format=rgb24",
                os.path.join(tmp, "f_%04d.png")], check=True)
frames = sorted(os.listdir(tmp))
rd = lambda p: np.asarray(Image.open(p).convert("RGB")).astype(float)
def psnr(a, b):
    m = ((a - b) ** 2).mean()
    return float("inf") if m == 0 else 10 * math.log10(255 ** 2 / m)
f0 = rd(os.path.join(tmp, frames[0]))
last = rd(os.path.join(tmp, frames[-1]))
print(f"{video}: {len(frames)} frames")
print("  frame 0 vs assets/landing.jpg (= public/images/gonai.jpg): PSNR %.2f dB" % psnr(f0, rd("assets/landing.jpg")))
print("  last frame vs master last: PSNR %.2f dB" % psnr(last, rd(os.path.join(master, "frame_000150.png"))))
tail = [psnr(rd(os.path.join(tmp, f)), last) for f in frames[126:-1]]
print("  frames 126..148 vs last: min PSNR %.2f dB (static hold)" % min(tail))
