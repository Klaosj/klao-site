"""quality.py <video> <png-master-dir> [still.jpg]
Decodes every frame in order (no timestamp matching: WebM stores ms timestamps) with accurate BT.709 chroma
interpolation, close to how a browser upsamples 4:2:0, and compares with the lossless master by index.
Prints frame count, RGB PSNR for first / last / worst frame and the mean; with a still, also frame 0 vs that still."""
import math, os, subprocess, sys
import numpy as np
from PIL import Image

video, master = sys.argv[1], sys.argv[2]
still = sys.argv[3] if len(sys.argv) > 3 else None
first = Image.open(os.path.join(master, 'frame_%06d.png' % 1))
W, H = first.size

def psnr(a, b):
    m = ((a - b) ** 2).mean()
    return 99.0 if m == 0 else 10 * math.log10(255 ** 2 / m)

cmd = ['ffmpeg', '-v', 'error', '-i', video, '-fps_mode', 'passthrough', '-vf',
       'scale=in_color_matrix=bt709:in_range=tv:flags=accurate_rnd+full_chroma_int,format=rgb24', '-f', 'rawvideo', '-']
p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
vals, f0_still, i = [], None, 0
while True:
    buf = p.stdout.read(W * H * 3)
    if len(buf) < W * H * 3:
        break
    fr = np.frombuffer(buf, np.uint8).reshape(H, W, 3).astype(np.float64)
    m = np.asarray(Image.open(os.path.join(master, 'frame_%06d.png' % (i + 1))).convert('RGB')).astype(np.float64)
    vals.append(psnr(fr, m))
    if i == 0 and still:
        f0_still = psnr(fr, np.asarray(Image.open(still).convert('RGB')).astype(np.float64))
    i += 1
p.wait()
lo = min(vals)
extra = '' if f0_still is None else ' | frame 0 vs %s = %.2f dB' % (os.path.basename(still), f0_still)
print('%s frames=%d f0=%.2f last=%.2f min=%.2f@%d mean=%.2f (RGB PSNR dB vs master)%s' % (
    os.path.basename(video), len(vals), vals[0], vals[-1], lo, vals.index(lo), sum(vals) / len(vals), extra))
