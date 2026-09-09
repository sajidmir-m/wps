"""Remove paper background from Kasshit logo → transparent PNG."""
from pathlib import Path

from PIL import Image

ROOT = Path(r"c:\Users\faisa\OneDrive\Desktop\college software\public")
SRC = ROOT / "kasshit-logo.png"
BACKUP = ROOT / "kasshit-logo-original.png"
OUT = ROOT / "kasshit-logo.png"

img = Image.open(SRC).convert("RGBA")
if not BACKUP.exists():
    img.save(BACKUP)

pixels = img.load()
w, h = img.size

for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        bright = (r + g + b) / 3.0
        if bright >= 242:
            pixels[x, y] = (0, 0, 0, 0)
            continue
        # Soft edge: fade paper into transparency
        if bright > 200:
            t = (248 - bright) / 48.0
            alpha = max(0, min(255, int(t * 255)))
            pixels[x, y] = (15, 23, 42, alpha)
        else:
            # Solid ink — slight slate for certificate match
            strength = max(0.55, min(1.0, (220 - bright) / 180.0))
            alpha = int(255 * strength) if bright > 80 else 255
            pixels[x, y] = (15, 23, 42, alpha)

# Second pass: clean leftover speckles of near-white with low alpha
for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        if a < 18:
            pixels[x, y] = (0, 0, 0, 0)

bbox = img.getbbox()
if bbox:
    pad = 28
    left = max(0, bbox[0] - pad)
    top = max(0, bbox[1] - pad)
    right = min(w, bbox[2] + pad)
    bottom = min(h, bbox[3] + pad)
    img = img.crop((left, top, right, bottom))

# Upscale for sharper print
cw, ch = img.size
target_h = 1000
if ch < target_h:
    scale = target_h / ch
    img = img.resize((int(cw * scale), target_h), Image.Resampling.LANCZOS)

img.save(OUT, "PNG", optimize=True)
print(f"wrote {OUT} size={img.size} backup={BACKUP.exists()}")
