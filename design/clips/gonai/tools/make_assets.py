# Build the clip's assets from real GoNai screens. Crop + uniform scale only — no content changes.
#   landing.jpg  = klao-site public/images/gonai.jpg, copied byte for byte (frame 0 must equal it)
#   plan.png     = work/captures/plan-880.png (880x780 viewport, 2x), top 766 CSS px kept
#                  (the cut sits in the page's own padding above the footer), scaled to 1x
#   share.png    = work/captures/share-390.png (390x844 phone, 2x), scaled to the 360 px phone
#                  width, top 766 px kept (blank page below the content)
import os, shutil
from PIL import Image

SITE_IMAGES = os.environ.get("KLAO_SITE_IMAGES", "../../../public/images")
CAP = "work/captures"
FRAME_H = 766
os.makedirs("assets", exist_ok=True)

shutil.copyfile(os.path.join(SITE_IMAGES, "gonai.jpg"), "assets/landing.jpg")

plan = Image.open(f"{CAP}/plan-880.png").convert("RGB")
plan = plan.crop((0, 0, plan.width, FRAME_H * 2)).resize((880, FRAME_H), Image.LANCZOS)
plan.save("assets/plan.png", optimize=True)

share = Image.open(f"{CAP}/share-390.png").convert("RGB")
w = 360
h = round(share.height * w / share.width)
share = share.resize((w, h), Image.LANCZOS).crop((0, 0, w, FRAME_H))
share.save("assets/share.png", optimize=True)
print("plan", plan.size, "share", share.size)
