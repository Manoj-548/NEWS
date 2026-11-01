#!/usr/bin/env python3
import os, subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(ROOT, "raw")
WORK = os.path.join(ROOT, "live_clips")
os.makedirs(WORK, exist_ok=True)
W, H = 1280, 720
FB = "/usr/share/fonts/truetype/noto/NotoSansKannada-Bold.ttf"
FR = "/usr/share/fonts/truetype/noto/NotoSansKannada-Regular.ttf"
FS = "/usr/share/fonts/truetype/noto/NotoSerifKannada-Bold.ttf"

def font(p, s):
    return ImageFont.truetype(p, s)

def overlay(path, kicker, title):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, 8, H), fill=(200, 16, 24, 230))
    d.rectangle((0, 0, W, 48), fill=(8, 12, 20, 170))
    d.rectangle((0, H - 78, W, H), fill=(8, 12, 20, 200))
    d.text((24, 12), "ವೀರರಾಣಿ ಅಬ್ಬಕ್ಕ ಚೌಟ  |  ಕನ್ನಡ ಪೂರ್ಣಾವಧಿ ವೀಡಿಯೊ", font=font(FR, 20), fill=(255, 220, 80, 255))
    d.text((24, H - 68), kicker, font=font(FR, 16), fill=(0, 210, 255, 255))
    d.text((24, H - 44), title, font=font(FB, 26), fill=(255, 255, 255, 255))
    img.save(path)

def run(cmd):
    print("+", " ".join(cmd[:6]), "...")
    subprocess.check_call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def vf():
    return "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,fade=t=in:st=0:d=0.4,fade=t=out:st={out}:d=0.45"

def cut(src, ss, dur, dest, ov):
    outf = max(0.2, dur - 0.5)
    run([
        "ffmpeg", "-y", "-ss", str(ss), "-t", str(dur), "-i", src, "-i", ov,
        "-filter_complex",
        "[0:v]" + vf().format(out=outf) + "[v];[v][1:v]overlay=0:0",
        "-an", "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23", "-preset", "veryfast",
        dest
    ])

def still(jpg, dur, dest, ov=None):
    args = ["ffmpeg", "-y", "-loop", "1", "-t", str(dur), "-i", jpg]
    filt = "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,fade=t=in:st=0:d=0.4,fade=t=out:st=%.2f:d=0.45" % (dur - 0.5)
    if ov:
        args += ["-i", ov, "-filter_complex", "[0:v]" + filt + "[v];[v][1:v]overlay=0:0"]
    else:
        args += ["-vf", filt]
    args += ["-an", "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23", "-preset", "veryfast", dest]
    run(args)

chapters = [
    ("01", "digha.webm", 2, 22, "ಚಿತ್ರ ೧ | ನೈಜ ವೀಡಿಯೊ", "ಉಳ್ಳಾಲದ ಕಡಲು | ತುಳುನಾಡು ತೀರ"),
    ("02", "waves.webm", 0, 20, "ಚಿತ್ರ ೨ | ನೈಜ ವೀಡಿಯೊ", "ಅರಬ್ಬೀ ಸಮುದ್ರ | ಅಲೆಗಳು"),
    ("03", "yak_kk.webm", 18, 32, "ಚಿತ್ರ ೩ | ಯಕ್ಷಗಾನ", "ಅಬ್ಬಕ್ಕನ ಕಥೆ ಯಕ್ಷಗಾನದಲ್ಲಿ ಜೀವಂತ"),
    ("04", "boats1898.webm", 4, 24, "ಚಿತ್ರ ೪ | ನೈಜ ವೀಡಿಯೊ", "ಬಂದರು | ನೌಕೆಗಳು | ವ್ಯಾಪಾರ"),
    ("05", "tallship.webm", 10, 28, "ಚಿತ್ರ ೫ | ನೈಜ ವೀಡಿಯೊ", "ಪೋರ್ಚುಗೀಸ್ ನೌಕೆಗಳಂತೆ ದೊಡ್ಡ ಹಡಗುಗಳು"),
    ("06", "waves.webm", 22, 18, "ಚಿತ್ರ ೬ | ನೈಜ ವೀಡಿಯೊ", "ನೌಕಾಯುದ್ಧದ ಸಮುದ್ರ | ಬಿರುಗಾಳಿ"),
    ("07", "yak_rak.webm", 12, 28, "ಚಿತ್ರ ೭ | ಯಕ್ಷಗಾನ ಯೋಧ", "ವೀರವೇಷ | ಖಡ್ಗ | ಹೋರಾಟ"),
    ("08", "yak_short.webm", 0, 22, "ಚಿತ್ರ ೮ | ಯಕ್ಷಗಾನ", "ತುಳುನಾಡಿನ ಜಾನಪದ | ಅಬ್ಬಕ್ಕ ಸ್ಮೃತಿ"),
    ("09", "sunset.webm", 0, 11, "ಚಿತ್ರ ೯ | ನೈಜ ವೀಡಿಯೊ", "ಸಂಜೆ ತೀರ | ನೆನಪು"),
]

# title / outro from existing stills only as bookends
title_jpg = os.path.join(ROOT, "frames", "00_title.jpg")
outro_jpg = os.path.join(ROOT, "frames", "10_outro.jpg")
if not os.path.exists(title_jpg):
    title_jpg = os.path.join(ROOT, "01_ullal_coast.jpg")
if not os.path.exists(outro_jpg):
    outro_jpg = os.path.join(ROOT, "09_legacy.jpg")

still(title_jpg, 8, os.path.join(WORK, "00.mp4"))
for key, src, ss, dur, kicker, title in chapters:
    ov = os.path.join(WORK, key + ".png")
    overlay(ov, kicker, title)
    cut(os.path.join(RAW, src), ss, dur, os.path.join(WORK, key + ".mp4"), ov)
still(outro_jpg, 8, os.path.join(WORK, "10.mp4"))

lst = os.path.join(WORK, "list.txt")
names = ["00.mp4"] + [c[0] + ".mp4" for c in chapters] + ["10.mp4"]
with open(lst, "w") as f:
    for n in names:
        f.write("file '%s'\n" % n)
run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", os.path.join(ROOT, "abbakka_full.mp4")])
print("done", os.path.getsize(os.path.join(ROOT, "abbakka_full.mp4")))
