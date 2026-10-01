"""fidelity.py <captures dir> <fidelity dir>
Crops every card from the app capture (tools/capture.mjs) and from the rebuilt render
(tools/fidelity.mjs), both at DPR 3, and prints the mean / 99th-percentile absolute difference
per card (RGB, 0-255) plus a side-by-side sheet: app | rebuilt | difference x4."""
import json, os, sys
import numpy as np
from PIL import Image

cap, fid = sys.argv[1], sys.argv[2]
DPR = 3
rows = []
for name in ("plan-512", "plan-412", "share-390"):
    a_img = Image.open(os.path.join(cap, name + ".png")).convert("RGB")
    b_img = Image.open(os.path.join(fid, name + ".png")).convert("RGB")
    a_boxes = json.load(open(os.path.join(cap, name + ".boxes.json")))["cards"]
    b_boxes = json.load(open(os.path.join(fid, name + ".boxes.json")))
    for a, b in zip(a_boxes, b_boxes):
        assert abs(a["w"] - b["w"]) < 0.01 and abs(a["h"] - b["h"]) < 0.01, (name, a, b)
        crop = lambda im, bx: im.crop((int(bx["x"] * DPR), int(bx["y"] * DPR),
                                       int(bx["x"] * DPR) + int(bx["w"] * DPR), int(bx["y"] * DPR) + int(bx["h"] * DPR)))
        ca, cb = crop(a_img, a), crop(b_img, b)
        d = np.abs(np.asarray(ca, dtype=np.int16) - np.asarray(cb, dtype=np.int16))
        print("%-10s %-6s %5.1fx%6.2f css  mean %.2f  p99 %3d  max %3d" % (
            name, b["id"], b["w"], b["h"], d.mean(), np.percentile(d, 99), d.max()))
        diff = Image.fromarray(np.clip(d * 4, 0, 255).astype(np.uint8))
        row = Image.new("RGB", (ca.width * 3 + 40, ca.height), (255, 255, 255))
        row.paste(ca, (0, 0)); row.paste(cb, (ca.width + 20, 0)); row.paste(diff, (ca.width * 2 + 40, 0))
        rows.append(row)
W = max(r.width for r in rows); H = sum(r.height + 20 for r in rows)
sheet = Image.new("RGB", (W, H), (235, 235, 240)); y = 0
for r in rows:
    sheet.paste(r, (0, y)); y += r.height + 20
sheet = sheet.resize((W // 2, H // 2), Image.LANCZOS)
sheet.save(os.path.join(fid, "fidelity-sheet.jpg"), quality=85)
print("sheet", os.path.join(fid, "fidelity-sheet.jpg"))
