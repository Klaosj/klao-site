"""quality.py <video> <png-master-dir>
Decodes every frame (passthrough, no resync), compares with the lossless master by index.
Prints frame count, RGB PSNR for first / last / worst frame, and the mean."""
import subprocess, sys, tempfile, os
import numpy as np
from PIL import Image

video, master = sys.argv[1], sys.argv[2]
with tempfile.TemporaryDirectory() as tmp:
    subprocess.run(['ffmpeg', '-v', 'error', '-i', video, '-fps_mode', 'passthrough', os.path.join(tmp, 'd_%04d.png')], check=True)
    n = len(os.listdir(tmp))
    vals = []
    for i in range(n):
        d = np.asarray(Image.open(os.path.join(tmp, 'd_%04d.png' % (i + 1))).convert('RGB'), dtype=np.float64)
        m = np.asarray(Image.open(os.path.join(master, 'frame_%06d.png' % (i + 1))).convert('RGB'), dtype=np.float64)
        mse = np.mean((d - m) ** 2)
        vals.append(99.0 if mse == 0 else 10 * np.log10(255 ** 2 / mse))
print('%s frames=%d f0=%.2f last=%.2f min=%.2f@%d mean=%.2f (RGB PSNR dB vs master)' % (
    os.path.basename(video), n, vals[0], vals[-1], min(vals), vals.index(min(vals)), sum(vals) / len(vals)))
