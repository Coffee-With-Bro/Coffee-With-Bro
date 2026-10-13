import os
from PIL import Image

base_dir = os.path.dirname(__file__)
public_dir = os.path.join(base_dir, "..", "milk_with_bro", "public")
assets_dir = os.path.join(base_dir, "..", "milk_with_bro", "src", "assets")

# 1. Convert og-image.png to og-image.webp
og_png = os.path.join(public_dir, "og-image.png")
if os.path.exists(og_png):
    img = Image.open(og_png)
    img.save(os.path.join(public_dir, "og-image.webp"), "WEBP", quality=90)
    print("Converted og-image.png to og-image.webp")

# 2. Convert hero.png to hero.webp
hero_png = os.path.join(assets_dir, "hero.png")
if os.path.exists(hero_png):
    img = Image.open(hero_png)
    img.save(os.path.join(assets_dir, "hero.webp"), "WEBP", quality=90)
    print("Converted hero.png to hero.webp")

print("WebP image conversions completed successfully.")
