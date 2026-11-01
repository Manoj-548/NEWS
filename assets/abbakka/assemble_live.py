#!/usr/bin/env python3
"""HD 1920x1080 Abbakka film: live Yakshagana/sea/ships + real monuments. Slow titles."""
import os, subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(ROOT, "raw")
MON = os.path.join(ROOT, "monuments")
WORK = os.path.join(ROOT, "live_clips")
os.makedirs(WORK, exist_ok=True)
W, H = 1920, 1080
FR = "/usr/share/fonts/truetype/noto/NotoSansKannada-Regular.ttf"
FB = "/usr/share/fonts/truetype/noto/NotoSansKannada-Bold.ttf"

def font(p, s):
    return ImageFont.truetype(p, s)

def pick(*names):
    for n in names:
        p = n if os.path.isabs(n) else os.path.join(RAW, n)
        if os.path.exists(p) and os.path.getsize(p) > 1000:
            return p
    raise SystemExit("missing " + str(names))

def overlay_bar(path, kicker):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, 10, H), fill=(200, 16, 24, 230))
    d.rectangle((0, 0, W, 64), fill=(8, 12, 20, 180))
    d.text((32, 16), "ವೀರರಾಣಿ ಅಬ್ಬಕ್ಕ ಚೌಟ  |  HD  |  " + kicker, font=font(FR, 28), fill=(255, 220, 80, 255))
    img.save(path)

def crawl_strip(path, title):
    img = Image.new("RGBA", (4200, 110), (8, 12, 20, 220))
    d = ImageDraw.Draw(img)
    d.text((40, 32), title + "     •     " + title + "     •     " + title, font=font(FB, 42), fill=(255, 255, 255, 255))
    img.save(path)

def run(cmd):
    print("+", " ".join(cmd[:8]), "...")
    subprocess.check_call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

SCALE = "scale=1920:1080:force_original_aspect_ratio=increase:flags=lanczos,crop=1920:1080,unsharp=5:5:0.6:5:5:0.0"

def cut(src, ss, dur, dest, bar, crawl):
    outf = max(0.2, dur - 0.6)
    # Slow title crawl: ~28 px/s
    run([
        "ffmpeg", "-y", "-ss", str(ss), "-t", str(dur), "-i", src, "-i", bar, "-i", crawl,
        "-filter_complex",
        "[0:v]%s,fade=t=in:st=0:d=0.5,fade=t=out:st=%.2f:d=0.5[v];"
        "[v][1:v]overlay=0:0[b];"
        "[b][2:v]overlay=x='W-mod(t*28,W+4200)':y=H-128" % (SCALE, outf),
        "-an", "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "21", "-preset", "veryfast",
        dest
    ])

def monument(jpg, dur, dest, bar, crawl, axis="y"):
    if axis == "y":
        crop = "scale=1920:1080:force_original_aspect_ratio=increase:flags=lanczos,crop=1920:1080:x='(iw-ow)/2':y='(ih-oh)*t/%.2f'" % max(0.1, dur - 0.05)
    else:
        crop = "scale=1920:1080:force_original_aspect_ratio=increase:flags=lanczos,crop=1920:1080:y='(ih-oh)/2':x='(iw-ow)*t/%.2f'" % max(0.1, dur - 0.05)
    outf = max(0.2, dur - 0.6)
    run([
        "ffmpeg", "-y", "-loop", "1", "-t", str(dur), "-i", jpg, "-i", bar, "-i", crawl,
        "-filter_complex",
        "[0:v]%s,fade=t=in:st=0:d=0.5,fade=t=out:st=%.2f:d=0.5[v];"
        "[v][1:v]overlay=0:0[b];"
        "[b][2:v]overlay=x='W-mod(t*28,W+4200)':y=H-128" % (crop, outf),
        "-an", "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "21", "-preset", "veryfast",
        dest
    ])

def still(jpg, dur, dest):
    filt = "scale=1920:1080:force_original_aspect_ratio=increase:flags=lanczos,crop=1920:1080,fade=t=in:st=0:d=0.5,fade=t=out:st=%.2f:d=0.5" % (dur - 0.5)
    run(["ffmpeg", "-y", "-loop", "1", "-t", str(dur), "-i", jpg, "-vf", filt,
         "-an", "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "21", "-preset", "veryfast", dest])

live = [
    ("01", pick("waves_hd.webm", "waves.webm"), 0, 18, "ನೈಜ HD ವೀಡಿಯೊ | ಸಮುದ್ರ", "ಅರಬ್ಬೀ ಸಮುದ್ರ | ಉಳ್ಳಾಲ ತೀರ"),
    ("03", pick("yak_kk.webm"), 18, 28, "ನೈಜ ವೀಡಿಯೊ | ಯಕ್ಷಗಾನ", "ಅಬ್ಬಕ್ಕನ ಕಥೆ ಯಕ್ಷಗಾನದಲ್ಲಿ"),
    ("05", pick("boats_hd.webm", "boats1898.webm"), 4, 20, "ಹಳೆಯ ನೈಜ ವೀಡಿಯೊ HD", "ಬಂದರು | ನೌಕೆಗಳು | ೧೮೯೮"),
    ("06", pick("tallship_hd.webm", "tallship.webm"), 10, 24, "ನೈಜ HD ವೀಡಿಯೊ | ಹಡಗು", "ಪೋರ್ಚುಗೀಸ್ ನೌಕೆಗಳಂತೆ ದೊಡ್ಡ ಹಡಗು"),
    ("07", pick("yak_rak_hd.webm", "yak_rak.webm"), 12, 24, "ನೈಜ HD ವೀಡಿಯೊ | ಯಕ್ಷಗಾನ ಯೋಧ", "ರಾಕ್ಷಸ ವೇಷ | ಖಡ್ಗ | ಹೋರಾಟ"),
    ("09", pick("yak_patla_hd.webm", "yak_patla.webm"), 8, 24, "ನೈಜ HD ವೀಡಿಯೊ | ಯಕ್ಷಗಾನ", "ತುಳುನಾಡು | ಅಬ್ಬಕ್ಕ ಸ್ಮೃತಿ"),
    ("10", pick("yak_short_hd.webm", "yak_short.webm"), 0, 18, "ನೈಜ HD ವೀಡಿಯೊ | ಯಕ್ಷಗಾನ", "ಜಾನಪದ | ಬಿಟ್ಟಿರುವ ದೃಶ್ಯ"),
    ("12", pick("sunset_hd.webm", "sunset.webm"), 0, 11, "ನೈಜ HD ವೀಡಿಯೊ | ಸಂಜೆ", "ತೀರದ ಸಂಜೆ | ನೆನಪು"),
]

mons = [
    ("00", pick(os.path.join(MON, "circle_ullal_hd.jpg"), os.path.join(MON, "circle_ullal.jpg")), 10, "y", "ನೈಜ ಸ್ಮಾರಕ HD", "ಉಳ್ಳಾಲ ಅಬ್ಬಕ್ಕ ವೃತ್ತ | ಪ್ರತಿಮೆ"),
    ("02", pick(os.path.join(MON, "ullal_queen.jpg")), 14, "x", "ನೈಜ ಸ್ಮಾರಕ", "ಉಳ್ಳಾಲ ರಾಣಿ ಅಬ್ಬಕ್ಕ ದೇವಿ"),
    ("04", pick(os.path.join(MON, "circle_ullal_hd.jpg"), os.path.join(MON, "circle_ullal.jpg")), 16, "y", "ನೈಜ ಸ್ಮಾರಕ HD", "ಉಳ್ಳಾಲ ವೃತ್ತ | ಅಬ್ಬಕ್ಕ ಪ್ರತಿಮೆ"),
    ("08", pick(os.path.join(MON, "rani_circle_hd.jpg"), os.path.join(MON, "rani_circle.jpg")), 14, "x", "ನೈಜ ಸ್ಮಾರಕ HD", "ರಾಣಿ ಅಬ್ಬಕ್ಕ ವೃತ್ತ"),
    ("08b", pick(os.path.join(MON, "abbakka_circle.jpg")), 12, "x", "ನೈಜ ಸ್ಮಾರಕ", "ಅಬ್ಬಕ್ಕ ಸರ್ಕಲ್ | ಮಂಗಳೂರು"),
    ("11", pick(os.path.join(MON, "stamp.jpg")), 10, "y", "ನೈಜ ಸ್ಮಾರಕ", "೨೦೨೩ ಭಾರತೀಯ ಅಂಚೆ ಚೀಟಿ"),
]

order = ["00", "01", "02", "03", "04", "05", "06", "07", "08", "08b", "09", "10", "11", "12", "13"]

for key, src, ss, dur, kicker, title in live:
    bar = os.path.join(WORK, key + "_bar.png")
    crawl = os.path.join(WORK, key + "_crawl.png")
    overlay_bar(bar, kicker)
    crawl_strip(crawl, title)
    cut(src, ss, dur, os.path.join(WORK, key + ".mp4"), bar, crawl)

for key, jpg, dur, axis, kicker, title in mons:
    bar = os.path.join(WORK, key + "_bar.png")
    crawl = os.path.join(WORK, key + "_crawl.png")
    overlay_bar(bar, kicker)
    crawl_strip(crawl, title)
    monument(jpg, dur, os.path.join(WORK, key + ".mp4"), bar, crawl, axis)

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
run(["ffmpeg", "-y", "-i", tmp, "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "22", "-preset", "veryfast", "-s", "1920x1080", out])
print("done", os.path.getsize(out), "bytes")
