# Build the clip's assets from real Aje pixels. Crop + uniform scale only; no content changes.
#   KLAO_SITE  path to the klao-site repo (default: ../../..  i.e. run from design/clips/aje/)
#   RAW_DIR    where tools/capture.mjs wrote its screenshot (default: work/raw)
import os, shutil
from PIL import Image

KLAO_SITE = os.environ.get("KLAO_SITE", "../../..")
RAW = os.environ.get("RAW_DIR", "work/raw")
os.makedirs("assets", exist_ok=True)

# 1. Frame 0 = the project's screenshot, byte for byte (public/images/aje.jpg, 1580x900).
shutil.copyfile(os.path.join(KLAO_SITE, "public/images/aje.jpg"), "assets/aje.jpg")

# 2. Next steps, reviewed test, example idea: 1280x900 CSS viewport at 2x. Crop CSS x 0-880 (stops before the
#    header's level meter at x 899), y 0-810 (the blank band between the review note, y 804, and the
#    "Add more evidence" button, y 818, which the floating dock half covers). Exact 2:1 downscale -> 1 px per CSS px.
raw = Image.open(os.path.join(RAW, "next-steps-graded.png")).convert("RGB")
assert raw.size == (2560, 1800), raw.size
crop = raw.crop((0, 0, 1760, 1620))
crop.resize((880, 810), Image.LANCZOS).save("assets/next-steps-test.png", optimize=True)
print("aje.jpg", Image.open("assets/aje.jpg").size, "next-steps-test.png", (880, 810))
