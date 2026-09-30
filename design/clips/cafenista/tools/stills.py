# Stills + contact sheet from the lossless PNG master (frame 1 = t 0.000 s, frame 150 = t 4.967 s).
import os
from PIL import Image, ImageDraw, ImageFont
M = "renders/master-final/frame_%06d.png"
first = Image.open(M % 1).convert("RGB")
last = Image.open(M % 150).convert("RGB")
first.save("out/cafenista.jpg", quality=82, subsampling=0, optimize=True)
last.save("out/cafenista-end.jpg", quality=82, subsampling=0, optimize=True)

times = [0.0, 0.5, 1.5, 2.4, 3.3, 4.2, 5.0]
idx = [min(150, round(t * 30) + 1) for t in times]
TW, TH, G, LH, COLS = 790, 450, 24, 40, 4
rows = (len(times) + COLS - 1) // COLS
W = COLS * TW + (COLS + 1) * G
H = rows * (TH + LH) + (rows + 1) * G
sheet = Image.new("RGB", (W, H), (255, 255, 255))
d = ImageDraw.Draw(sheet)
font = None
for f in ("/System/Library/Fonts/SFNS.ttf", "/System/Library/Fonts/Helvetica.ttc"):
    if os.path.exists(f):
        font = ImageFont.truetype(f, 22); break
for k, (t, i) in enumerate(zip(times, idx)):
    r, c = divmod(k, COLS)
    x = G + c * (TW + G); y = G + r * (TH + LH + G)
    label = f"{t:.1f} s  ·  frame {i - 1}" + ("  (last)" if i == 150 else "")
    d.text((x, y + 6), label, fill=(60, 60, 67), font=font)
    tile = Image.open(M % i).convert("RGB").resize((TW, TH), Image.LANCZOS)
    sheet.paste(tile, (x, y + LH))
    d.rectangle([x - 1, y + LH - 1, x + TW, y + LH + TH], outline=(210, 210, 215))
sheet.save("out/contact.jpg", quality=85, optimize=True)
print("frames used:", idx)
