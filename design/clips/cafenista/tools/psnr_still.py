"""psnr_still.py <png-or-video> <reference.jpg> — RGB PSNR of frame 0 against the site's still.
A video is decoded the way a browser shows it (BT.709, TV range -> full-range RGB)."""
import sys, subprocess, tempfile, os, math
import numpy as np
from PIL import Image
src, ref = sys.argv[1], sys.argv[2]
if src.lower().endswith('.png'):
    a = np.asarray(Image.open(src).convert('RGB'), dtype=np.float64)
else:
    with tempfile.TemporaryDirectory() as tmp:
        p = os.path.join(tmp, 'f0.png')
        subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-frames:v', '1', '-vf',
                        'scale=in_color_matrix=bt709:in_range=tv:out_range=pc,format=rgb24', p], check=True)
        a = np.asarray(Image.open(p).convert('RGB'), dtype=np.float64)
b = np.asarray(Image.open(ref).convert('RGB'), dtype=np.float64)
mse = np.mean((a - b) ** 2)
print('%s frame 0 vs %s: RGB PSNR %s dB · max abs diff %d' % (os.path.basename(src), os.path.basename(ref),
      'inf' if mse == 0 else '%.2f' % (10 * math.log10(255 ** 2 / mse)), int(np.abs(a - b).max())))
