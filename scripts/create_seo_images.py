import os
from PIL import Image, ImageDraw, ImageFont

public_dir = os.path.join(os.path.dirname(__file__), "..", "milk_with_bro", "public")
os.makedirs(public_dir, exist_ok=True)

# 1. Generate Favicon PNG (64x64)
fav = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
draw_fav = ImageDraw.Draw(fav)
# Draw rounded background
draw_fav.rounded_rectangle([2, 2, 62, 62], radius=16, fill=(49, 13, 32, 255), outline=(229, 149, 0, 255), width=2)
# Draw lightning / sign emblem
points = [
    (34, 10), (18, 30), (30, 30), (22, 54), (46, 26), (32, 26)
]
draw_fav.polygon(points, fill=(229, 149, 0, 255))
fav.save(os.path.join(public_dir, "favicon.png"))
print("Saved favicon.png")

# 2. Generate Apple Touch Icon (180x180)
apple = Image.new("RGBA", (180, 180), (49, 13, 32, 255))
draw_apple = ImageDraw.Draw(apple)
draw_apple.rounded_rectangle([8, 8, 172, 172], radius=40, outline=(229, 149, 0, 255), width=4)
# Scale up emblem
apple_points = [
    (96, 28), (52, 85), (86, 85), (64, 152), (130, 74), (92, 74)
]
draw_apple.polygon(apple_points, fill=(229, 149, 0, 255))
apple.save(os.path.join(public_dir, "apple-touch-icon.png"))
print("Saved apple-touch-icon.png")

# 3. Generate Open Graph Image (1200x630)
og = Image.new("RGB", (1200, 630), (49, 13, 32))
draw_og = ImageDraw.Draw(og)

# Background subtle grid / gradient lines
for y in range(0, 630, 30):
    draw_og.line([(0, y), (1200, y)], fill=(60, 20, 42), width=1)
for x in range(0, 1200, 30):
    draw_og.line([(x, 0), (x, 630)], fill=(60, 20, 42), width=1)

# Outer decorative border
draw_og.rounded_rectangle([30, 30, 1170, 600], radius=24, outline=(229, 149, 0), width=3)

# Glowing inner panel
draw_og.rounded_rectangle([60, 60, 1140, 570], radius=18, fill=(35, 10, 24), outline=(97, 33, 15), width=2)

# Try loading standard system fonts
def get_font(size):
    candidates = [
        "C:\\Windows\\Fonts\\segoeui.ttf",
        "C:\\Windows\\Fonts\\arial.ttf",
        "C:\\Windows\\Fonts\\consola.ttf",
    ]
    for c in candidates:
        if os.path.exists(c):
            try:
                return ImageFont.truetype(c, size)
            except Exception:
                pass
    return ImageFont.load_default()

font_title = get_font(56)
font_sub = get_font(28)
font_tag = get_font(20)
font_pill = get_font(18)

# Tag / Eyebrow
draw_og.text((100, 95), "COFFEE WITH BRO · UCS503 SOFTWARE ENGINEERING", font=font_tag, fill=(229, 149, 0))

# Title
draw_og.text((100, 145), "American Sign Language to Text", font=font_title, fill=(242, 247, 242))
draw_og.text((100, 215), "100% Offline & Private System", font=font_title, fill=(229, 149, 0))

# Subtitle / Leve description
desc_line1 = "Real-time webcam ASL recognition powered by local DeepLearning4j CNN & React."
desc_line2 = "Zero cloud APIs · Zero data leaving your machine · Low-latency WebSocket stream."
draw_og.text((100, 310), desc_line1, font=font_sub, fill=(190, 192, 198))
draw_og.text((100, 355), desc_line2, font=font_sub, fill=(190, 192, 198))

# Badges pills
pills = [
    ("⚡ Real-Time WebSocket", 100, 430),
    ("🔒 100% On-Device", 350, 430),
    ("🎯 36 ASL Classes (A-Z, 0-9)", 570, 430),
    ("🎓 Thapar Institute", 860, 430),
]
for text, px, py in pills:
    bbox = font_pill.getbbox(text)
    pw = bbox[2] - bbox[0] + 28
    ph = 36
    draw_og.rounded_rectangle([px, py, px + pw, py + ph], radius=8, fill=(49, 13, 32), outline=(229, 149, 0), width=1)
    draw_og.text((px + 14, py + 8), text, font=font_pill, fill=(242, 247, 242))

# Footer watermark
draw_og.text((100, 520), "Thapar Institute of Engineering and Technology · Patiala, Punjab", font=font_tag, fill=(130, 132, 137))
draw_og.text((950, 520), "v1.0 Production", font=font_tag, fill=(229, 149, 0))

# Save OG image
og.save(os.path.join(public_dir, "og-image.png"))
print("Saved og-image.png")
