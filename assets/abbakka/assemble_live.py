#!/usr/bin/env python3
"""Abbakka film: live Yakshagana/sea/ships + real Ullal monuments. No beach crowds."""
import os, subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(ROOT, "raw")
MON = os.path.join(ROOT, "monuments")
WORK = os.path.join(ROOT, "live_clips")
os.makedirs(WORK, exist_ok=True)
W, H = 1280, 720
FR = "/usr/share/fonts/truetype/noto/NotoSansKannada-Regular.ttf"
FB = "/usr/share/fonts/truetype/noto/NotoSansKannada-Bold.ttf"

def font(p, s):
    return ImageFont.truetype(p, s)

def overlay(path, kicker, title):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, 8, H), fill=(200, 16, 24, 230))
    d.rectangle((0, 0, W, 48), fill=(8, 12, 20, 170))
    d.rectangle((0, H - 78, W, H), fill=(8, 12, 20, 200))
    d.text((24, 12), "ವೀರರಾಣಿ ಅಬ್ಬಕ್ಕ ಚೌಟ  |  ನೈಜ ಸ್ಮಾರಕ + ಯಕ್ಷಗಾನ", font=font(FR, 20), fill=(255, 220, 80, 255))
    d.text((24, H - 68), kicker, font=font(FR, 16), fill=(0, 210, 255, 255))
    d.text((24, H - 44), title, font=font(FB, 26), fill=(255, 255, 255, 255))
    img.save(path)

def run(cmd):
    print("+", " ".join(cmd[:8]), "...")
    subprocess.check_call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def cut(src, ss, dur, dest, ov):
    outf = max(0.2, dur - 0.5)
    run([
        "ffmpeg", "-y", "-ss", str(ss), "-t", str(dur), "-i", src, "-i", ov,
        "-filter_complex",
        "[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,fade=t=in:st=0:d=0.4,fade=t=out:st=%.2f:d=0.45[v];[v][1:v]overlay=0:0" % outf,
        "-an", "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23", "-preset", "veryfast",
        dest
    ])

def monument(jpg, dur, dest, ov, axis="y"):
    """Slow pan across a real photograph (statue / circle / stamp)."""
    n = max(30, int(dur * 30))
    if axis == "y":
        crop = "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720:x='(iw-ow)/2':y='(ih-oh)*t/%.2f'" % max(0.1, dur - 0.05)
    else:
        crop = "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720:y='(ih-oh)/2':x='(iw-ow)*t/%.2f'" % max(0.1, dur - 0.05)
    outf = max(0.2, dur - 0.5)
    run([
        "ffmpeg", "-y", "-loop", "1", "-t", str(dur), "-i", jpg, "-i", ov,
        "-filter_complex",
        "[0:v]%s,fade=t=in:st=0:d=0.4,fade=t=out:st=%.2f:d=0.45[v];[v][1:v]overlay=0:0" % (crop, outf),
        "-an", "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23", "-preset", "veryfast",
        dest
    ])

def still(jpg, dur, dest):
    filt = "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,fade=t=in:st=0:d=0.4,fade=t=out:st=%.2f:d=0.45" % (dur - 0.5)
    run(["ffmpeg", "-y", "-loop", "1", "-t", str(dur), "-i", jpg, "-vf", filt,
         "-an", "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23", "-preset", "veryfast", dest])

live = [
    ("01", "waves.webm", 0, 18, "ನೈಜ ವೀಡಿಯೊ | ಸಮುದ್ರ", "ಅರಬ್ಬೀ ಸಮುದ್ರ | ಉಳ್ಳಾಲ ತೀರ"),
    ("03", "yak_kk.webm", 18, 28, "ನೈಜ ವೀಡಿಯೊ | ಯಕ್ಷಗಾನ", "ಅಬ್ಬಕ್ಕನ ಕಥೆ ಯಕ್ಷಗಾನದಲ್ಲಿ"),
    ("05", "boats1898.webm", 4, 20, "ಹಳೆಯ ನೈಜ ವೀಡಿಯೊ", "ಬಂದರು | ನೌಕೆಗಳು | ೧೮೯೮"),
    ("06", "tallship.webm", 10, 24, "ನೈಜ ವೀಡಿಯೊ | ಹಡಗು", "ಪೋರ್ಚುಗೀಸ್ ನೌಕೆಗಳಂತೆ ದೊಡ್ಡ ಹಡಗು"),
    ("07", "yak_rak.webm", 12, 24, "ನೈಜ ವೀಡಿಯೊ | ಯಕ್ಷಗಾನ ಯೋಧ", "ರಾಕ್ಷಸ ವೇಷ | ಖಡ್ಗ | ಹೋರಾಟ"),
    ("09", "yak_patla.webm", 8, 24, "ನೈಜ ವೀಡಿಯೊ | ಯಕ್ಷಗಾನ", "ತುಳುನಾಡು | ಅಬ್ಬಕ್ಕ ಸ್ಮೃತಿ"),
    ("10", "yak_short.webm", 0, 18, "ನೈಜ ವೀಡಿಯೊ | ಯಕ್ಷಗಾನ", "ಜಾನಪದ | ಬಿಟ್ಟಿರುವ ದೃಶ್ಯ"),
    ("12", "sunset.webm", 0, 11, "ನೈಜ ವೀಡಿಯೊ | ಸಂಜೆ", "ತೀರದ ಸಂಜೆ | ನೆನಪು"),
]

mons = [
    ("00", os.path.join(MON, "circle_ullal.jpg"), 10, "y", "ನೈಜ ಸ್ಮಾರಕ", "ಉಳ್ಳಾಲ ಅಬ್ಬಕ್ಕ ವೃತ್ತ | ಪ್ರತಿಮೆ"),
    ("02", os.path.join(MON, "ullal_queen.jpg"), 14, "x", "ನೈಜ ಸ್ಮಾರಕ", "ಉಳ್ಳಾಲ ರಾಣಿ ಅಬ್ಬಕ್ಕ ದೇವಿ"),
    ("04", os.path.join(MON, "circle_ullal.jpg"), 16, "y", "ನೈಜ ಸ್ಮಾರಕ", "ಉಳ್ಳಾಲ ವೃತ್ತ | ಅಬ್ಬಕ್ಕ ಪ್ರತಿಮೆ"),
    ("08", os.path.join(MON, "rani_circle.jpg"), 14, "x", "ನೈಜ ಸ್ಮಾರಕ", "ರಾಣಿ ಅಬ್ಬಕ್ಕ ವೃತ್ತ"),
    ("08b", os.path.join(MON, "abbakka_circle.jpg"), 12, "x", "ನೈಜ ಸ್ಮಾರಕ", "ಅಬ್ಬಕ್ಕ ಸರ್ಕಲ್ | ಮಂಗಳೂರು"),
    ("11", os.path.join(MON, "stamp.jpg"), 10, "y", "ನೈಜ ಸ್ಮಾರಕ", "೨೦೨೩ ಭಾರತೀಯ ಅಂಚೆ ಚೀಟಿ"),
]

order = ["00", "01", "02", "03", "04", "05", "06", "07", "08", "08b", "09", "10", "11", "12", "13"]

for key, src, ss, dur, kicker, title in live:
    ov = os.path.join(WORK, key + ".png")
    overlay(ov, kicker, title)
    cut(os.path.join(RAW, src), ss, dur, os.path.join(WORK, key + ".mp4"), ov)

for key, jpg, dur, axis, kicker, title in mons:
    ov = os.path.join(WORK, key + ".png")
    overlay(ov, kicker, title)
    monument(jpg, dur, os.path.join(WORK, key + ".mp4"), ov, axis)

legacy = os.path.join(ROOT, "09_legacy.jpg")
if not os.path.exists(legacy):
    legacy = os.path.join(MON, "stamp.jpg")
still(legacy, 8, os.path.join(WORK, "13.mp4"))

lst = os.path.join(WORK, "list.txt")
with open(lst, "w") as f:
    for n in order:
        f.write("file '%s.mp4'\n" % n)

tmp = os.path.join(WORK, "concat.mp4")
out = os.path.join(ROOT, "abbakka_full.mp4")
run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", tmp])
run(["ffmpeg", "-y", "-i", tmp, "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "28", "-preset", "veryfast", out])
print("done", os.path.getsize(out), "bytes")
