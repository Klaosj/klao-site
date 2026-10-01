"""quality.py <video> <png-master-dir> [frame0-reference.jpg]
Decodes every frame as a browser would (BT.709, TV range -> RGB), compares with the lossless master
by index and prints frame count, RGB PSNR for first / last / worst frame and the mean. With a third
argument, also prints frame 0 against that still (the 16:9 cut must start on public/images/<key>.jpg)."""
import math, os, subprocess, sys, tempfile
import numpy as np
from PIL import Image

video, master = sys.argv[1], sys.argv[2]
ref = sys.argv[3] if len(sys.argv) > 3 else None
rgb = lambda p: np.asarray(Image.open(p).convert("RGB"), dtype=np.float64)
psnr = lambda a, b: (lambda m: 99.0 if m == 0 else 10 * math.log10(255 ** 2 / m))(np.mean((a - b) ** 2))
with tempfile.TemporaryDirectory() as tmp:
    subprocess.run(["ffmpeg", "-v", "error", "-i", video, "-fps_mode", "passthrough", "-vf",
                    "scale=in_color_matrix=bt709:in_range=tv:out_range=pc,format=rgb24",
                    os.path.join(tmp, "d_%04d.png")], check=True)
    n = len(os.listdir(tmp))
    vals = [psnr(rgb(os.path.join(tmp, "d_%04d.png" % (i + 1))), rgb(os.path.join(master, "frame_%06d.png" % (i + 1)))) for i in range(n)]
    f0 = psnr(rgb(os.path.join(tmp, "d_0001.png")), rgb(ref)) if ref else None
print("%s frames=%d f0=%.2f last=%.2f min=%.2f@%d mean=%.2f (RGB PSNR dB vs master)%s" % (
    os.path.basename(video), n, vals[0], vals[-1], min(vals), vals.index(min(vals)), sum(vals) / len(vals),
    "" if f0 is None else " · frame 0 vs %s: %.2f dB" % (os.path.basename(ref), f0)))
