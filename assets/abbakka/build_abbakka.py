#!/usr/bin/env python3
"""Burn Kannada chapter titles and assemble the full-length Abbakka film."""
import os
import subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(ROOT, "frames")
os.makedirs(OUT_DIR, exist_ok=True)
W, H = 1280, 720
FONT_B = "/usr/share/fonts/truetype/noto/NotoSansKannada-Bold.ttf"
FONT_R = "/usr/share/fonts/truetype/noto/NotoSansKannada-Regular.ttf"
FONT_SERIF = "/usr/share/fonts/truetype/noto/NotoSerifKannada-Bold.ttf"

def font(path, size):
    return ImageFont.truetype(path, size)

def fit(img):
    img = img.convert("RGB")
    scale = max(W / img.width, H / img.height)
    nw, nh = int(img.width * scale + 0.5), int(img.height * scale + 0.5)
    img = img.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - W) // 2
    top = (nh - H) // 2
    return img.crop((left, top, left + W, top + H))

def bar(draw, y, h, a=180):
    overlay = Image.new("RGBA", (W, h), (0, 0, 0, a))
    return overlay, y

def draw_lower(base, kicker, title):
    img = fit(base).convert("RGBA")
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rectangle((0, 0, W, 56), fill=(8, 12, 20, 170))
    d.rectangle((0, H - 92, W, H), fill=(8, 12, 20, 200))
    d.rectangle((0, 0, 8, H), fill=(200, 16, 24, 220))
    fb, fr = font(FONT_B, 22), font(FONT_R, 18)
    d.text((28, 14), "ವೀರರಾಣಿ ಅಬ್ಬಕ್ಕ ಚೌಟ  |  ಕನ್ನಡ ವಿಶೇಷ ಪೂರ್ಣಾವಧಿ", font=fr, fill=(255, 220, 80, 255))
    d.text((28, H - 78), kicker, font=fr, fill=(0, 210, 255, 255))
    d.text((28, H - 52), title, font=fb, fill=(255, 255, 255, 255))
    out = Image.alpha_composite(img, layer).convert("RGB")
    return out

def title_card():
    bg = fit(Image.open(os.path.join(ROOT, "01_ullal_coast.jpg"))).filter(ImageFilter.GaussianBlur(6))
    bg = ImageEnhance.Brightness(bg).enhance(0.38)
    img = bg.convert("RGBA")
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rectangle((0, 0, 10, H), fill=(200, 16, 24, 255))
    d.rectangle((0, H - 10, W, H), fill=(200, 16, 24, 255))
    f1 = font(FONT_SERIF, 64)
    f2 = font(FONT_B, 36)
    f3 = font(FONT_R, 22)
    t1 = "ವೀರರಾಣಿ ಅಬ್ಬಕ್ಕ ಚೌಟ"
    t2 = "ಉಳ್ಳಾಲದ ಅಭಯರಾಣಿ"
    t3 = "ಕನ್ನಡ ವಿಶೇಷ  |  ಪೂರ್ಣಾವಧಿ ಇತಿಹಾಸ ವರದಿ"
    t4 = "ತುಳುನಾಡು  |  ಹದಿನಾರನೇ ಶತಮಾನ  |  ಪೋರ್ಚುಗೀಸ್ ವಿರೋಧ"
    def cx(text, fnt):
        box = d.textbbox((0, 0), text, font=fnt)
        return (W - (box[2] - box[0])) // 2
    d.text((cx(t1, f1), 230), t1, font=f1, fill=(255, 236, 180, 255))
    d.text((cx(t2, f2), 330), t2, font=f2, fill=(255, 255, 255, 255))
    d.text((cx(t3, f3), 420), t3, font=f3, fill=(0, 210, 255, 255))
    d.text((cx(t4, f3), 470), t4, font=f3, fill=(220, 220, 220, 255))
    return Image.alpha_composite(img, layer).convert("RGB")

def outro_card():
    bg = fit(Image.open(os.path.join(ROOT, "09_legacy.jpg"))).filter(ImageFilter.GaussianBlur(5))
    bg = ImageEnhance.Brightness(bg).enhance(0.42)
    img = bg.convert("RGBA")
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    f1 = font(FONT_SERIF, 48)
    f2 = font(FONT_R, 24)
    t1 = "ಅಭಯರಾಣಿ ಅಬ್ಬಕ್ಕ"
    t2 = "ಕರ್ನಾಟಕದ ಮೊದಲ ಮಹಿಳಾ ಸ್ವಾತಂತ್ರ್ಯ ಹೋರಾಟಗಾರ್ತಿ"
    t3 = "ಉಳ್ಳಾಲ  |  ತುಳುನಾಡು  |  ನೆನಪಿನಲ್ಲಿ ಶಾಶ್ವತ"
    def cx(text, fnt):
        box = d.textbbox((0, 0), text, font=fnt)
        return (W - (box[2] - box[0])) // 2
    d.text((cx(t1, f1), 280), t1, font=f1, fill=(255, 236, 180, 255))
    d.text((cx(t2, f2), 360), t2, font=f2, fill=(255, 255, 255, 255))
    d.text((cx(t3, f2), 420), t3, font=f2, fill=(0, 210, 255, 255))
    return Image.alpha_composite(img, layer).convert("RGB")

chapters = [
    ("00_title.jpg", None, None),
    ("01_ullal_coast.jpg", "ಚಿತ್ರ ೧", "ಉಳ್ಳಾಲ | ಅರಬ್ಬೀ ಸಮುದ್ರತೀರ | ತುಳುನಾಡು"),
    ("02_queen.jpg", "ಚಿತ್ರ ೨", "ರಾಣಿ ಅಬ್ಬಕ್ಕ ಚೌಟ | ಅಭಯರಾಣಿ"),
    ("03_court.jpg", "ಚಿತ್ರ ೩", "ಚೌಟ ಅರಮನೆ | ಎಲ್ಲಾ ಸಮುದಾಯಗಳ ಆಡಳಿತ"),
    ("04_port.jpg", "ಚಿತ್ರ ೪", "ಮಸಾಲೆ ಬಂದರು | ಪೋರ್ಚುಗೀಸರ ಆಸೆ"),
    ("05_ships.jpg", "ಚಿತ್ರ ೫", "ಪೋರ್ಚುಗೀಸ್ ನೌಕೆಗಳು | ಕಪ್ಪು ಸಮುದ್ರ"),
    ("06_battle.jpg", "ಚಿತ್ರ ೬", "ನೌಕಾಯುದ್ಧ | ಅಗ್ನಿಬಾಣ | ಉಳ್ಳಾಲ ರಕ್ಷಣೆ"),
    ("07_women.jpg", "ಚಿತ್ರ ೭", "ಮಹಿಳಾ ಸೇನೆ | ಖಡ್ಗಾಭ್ಯಾಸ"),
    ("08_night.jpg", "ಚಿತ್ರ ೮", "ರಾತ್ರಿ ಮರುದಾಳಿ | ಪೈಕ್ಸೊಟೊ ಪತನ"),
    ("09_legacy.jpg", "ಚಿತ್ರ ೯", "ಸ್ಮೃತಿ | ಯಕ್ಷಗಾನ | ತುಳುನಾಡಿನ ಹೆಮ್ಮೆ"),
    ("10_outro.jpg", None, None),
]

title_card().save(os.path.join(OUT_DIR, "00_title.jpg"), quality=92)
for src, kicker, title in chapters[1:-1]:
    im = Image.open(os.path.join(ROOT, src))
    draw_lower(im, kicker, title).save(os.path.join(OUT_DIR, src), quality=92)
outro_card().save(os.path.join(OUT_DIR, "10_outro.jpg"), quality=92)
print("frames ready", len(os.listdir(OUT_DIR)))
