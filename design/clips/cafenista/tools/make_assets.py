# Crop / uniformly scale the real Cafénista renders into project assets.
# Crop + uniform scale only — no content changes.
import os, sys
from PIL import Image
# The Cafénista repo's design/renders/ folder (a sibling project, not in this repo).
BASE = os.path.join(os.environ.get("CAFENISTA_RENDERS", "../../../../cafenista/design/renders"), "")
PHONE_W = int(sys.argv[1]) if len(sys.argv) > 1 else 360

owner = Image.open(BASE + "m4/owner-today.desktop.light.png").convert("RGB")
owner.crop((240, 0, 1040, owner.size[1])).save("assets/owner-today.png", optimize=True)

bar = Image.open(BASE + "m1/bar-alert-live.light.png").convert("RGB")
h = round(bar.size[1] * PHONE_W / bar.size[0])
bar.resize((PHONE_W, h), Image.LANCZOS).save("assets/bar-alert-live.png", optimize=True)
print("owner", (800, owner.size[1]), "bar", (PHONE_W, h))
