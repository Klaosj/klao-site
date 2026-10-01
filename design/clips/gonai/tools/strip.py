"""strip.py <master dir> <out.jpg> <t0> <t1> <step_frames> — grid of master frames for motion review."""
import os, sys
from PIL import Image, ImageDraw, ImageFont
M, out, t0, t1, step = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), int(sys.argv[5])
idx = list(range(round(t0 * 30) + 1, min(150, round(t1 * 30) + 1) + 1, step))
first = Image.open(os.path.join(M, "frame_%06d.png" % idx[0]))
TW = 395; TH = round(TW * first.height / first.width); COLS, LH = 4, 22
rows = (len(idx) + COLS - 1) // COLS
sheet = Image.new("RGB", (COLS * (TW + 8) + 8, rows * (TH + LH + 8) + 8), (255, 255, 255))
d = ImageDraw.Draw(sheet)
font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 14)
for k, i in enumerate(idx):
    r, c = divmod(k, COLS)
    x, y = 8 + c * (TW + 8), 8 + r * (TH + LH + 8)
    d.text((x, y + 3), "frame %d  t=%.2fs" % (i - 1, (i - 1) / 30), fill=(60, 60, 67), font=font)
    sheet.paste(Image.open(os.path.join(M, "frame_%06d.png" % i)).convert("RGB").resize((TW, TH), Image.LANCZOS), (x, y + LH))
sheet.save(out, quality=85)
print(len(idx), "frames ->", out)
