"""stills.py <work-dir> <out-dir> — phone poster, end frames and 7-frame contact sheets from the PNG masters.
frame_000001 = t 0.000 s · frame_000150 = t 4.967 s (the held last frame).
The 16:9 frame 0 is the site's own still (public/images/cafenista.jpg), so no 16:9 poster is written."""
import os, sys
from PIL import Image, ImageDraw, ImageFont

work, out = sys.argv[1], sys.argv[2]
TIMES = {
    '16x9': [0.0, 0.45, 1.0, 2.1, 3.2, 3.8, 4.967],
    '1x1':  [0.0, 0.8, 1.7, 2.6, 3.3, 3.8, 4.967],
}
font = None
for f in ('/System/Library/Fonts/SFNS.ttf', '/System/Library/Fonts/Helvetica.ttc'):
    if os.path.exists(f):
        font = ImageFont.truetype(f, 20); break

for cut, times in TIMES.items():
    frame = lambda i: Image.open(os.path.join(work, cut, 'frame_%06d.png' % i)).convert('RGB')
    if cut == '1x1':   # the phone poster: exactly frame 0, JPEG q 82
        frame(1).save(os.path.join(out, 'cafenista-frame0-1x1.jpg'), quality=82, subsampling=0, optimize=True)
    frame(150).save(os.path.join(out, 'end-%s.jpg' % cut), quality=90, subsampling=0, optimize=True)
    idx = [min(150, round(t * 30) + 1) for t in times]
    W, H = frame(1).size
    TW = 560 if cut == '16x9' else 400
    TH = round(TW * H / W)
    COLS, G, LH = (4, 20, 32)
    rows = (len(idx) + COLS - 1) // COLS
    sheet = Image.new('RGB', (COLS * TW + (COLS + 1) * G, rows * (TH + LH) + (rows + 1) * G), (255, 255, 255))
    d = ImageDraw.Draw(sheet)
    for k, (t, i) in enumerate(zip(times, idx)):
        r, c = divmod(k, COLS)
        x = G + c * (TW + G); y = G + r * (TH + LH + G)
        d.text((x, y + 4), '%.2f s · frame %d%s' % ((i - 1) / 30, i - 1, ' (held)' if i == 150 else ''), fill=(60, 60, 67), font=font)
        sheet.paste(frame(i).resize((TW, TH), Image.LANCZOS), (x, y + LH))
        d.rectangle([x - 1, y + LH - 1, x + TW, y + LH + TH], outline=(210, 210, 215))
    sheet.save(os.path.join(out, 'contact-%s.jpg' % cut), quality=86, optimize=True)
    print(cut, 'contact frames', [i - 1 for i in idx])
