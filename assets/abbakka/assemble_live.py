#!/usr/bin/env python3
"""Moving 1080p film: historic monuments + AI story stills with a real camera travel.
No beach, no Yakshagana, no burned titles."""
import os, subprocess, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
MON = os.path.join(ROOT, "monuments")
WORK = os.path.join(ROOT, "live_clips")
os.makedirs(WORK, exist_ok=True)

def run(cmd):
    print("+", " ".join(cmd[:8]), "...")
    subprocess.check_call(cmd)

def still(jpg, dur, dest, reverse=False):
    d = max(0.25, float(dur) - 0.05)
    # Scale well above 1080p so 16:9 AI stills still have room to pan/zoom.
    if reverse:
        x = "max(0,min(iw-ow,(iw-ow)*(1-t/%.3f)))" % d
        y = "max(0,min(ih-oh,(ih-oh)*(1-t/%.3f)))" % d
    else:
        x = "max(0,min(iw-ow,(iw-ow)*t/%.3f))" % d
        y = "max(0,min(ih-oh,(ih-oh)*t/%.3f))" % d
    vf = (
        "scale=2592:1458:force_original_aspect_ratio=increase:flags=lanczos,"
        "crop=2592:1458,"
        "crop=1920:1080:x='%s':y='%s',"
        "fade=t=in:st=0:d=0.35,fade=t=out:st=%.2f:d=0.35"
    ) % (x, y, max(0.4, dur - 0.4))
    run([
        "ffmpeg", "-y", "-loop", "1", "-t", str(dur), "-i", jpg,
        "-vf", vf, "-an", "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-crf", "23", "-preset", "veryfast", dest
    ])

shots = [
    (os.path.join(MON, "circle_ullal.jpg"), 9, False),
    (os.path.join(ROOT, "ai_queen_palace.jpg"), 11, True),
    (os.path.join(ROOT, "ai_court.jpg"), 10, False),
    (os.path.join(ROOT, "ai_warehouse.jpg"), 10, True),
    (os.path.join(MON, "rani_circle.jpg"), 9, False),
    (os.path.join(ROOT, "ai_ships.jpg"), 11, True),
    (os.path.join(ROOT, "ai_fort.jpg"), 9, False),
    (os.path.join(ROOT, "ai_women.jpg"), 10, True),
    (os.path.join(ROOT, "ai_corridor.jpg"), 10, False),
    (os.path.join(ROOT, "ai_night.jpg"), 9, True),
    (os.path.join(MON, "abbakka_circle.jpg"), 8, False),
    (os.path.join(MON, "stamp.jpg"), 8, True),
    (os.path.join(MON, "ullal_queen.jpg"), 8, False),
    (os.path.join(MON, "circle_ullal.jpg"), 8, True),
]

names = []
for i, (jpg, dur, rev) in enumerate(shots):
    if not os.path.exists(jpg):
        raise SystemExit("missing " + jpg)
    name = "%02d.mp4" % i
    dest = os.path.join(WORK, name)
    still(jpg, dur, dest, rev)
    names.append(name)

lst = os.path.join(WORK, "list.txt")
with open(lst, "w") as f:
    for n in names:
        f.write("file '%s'\n" % n)
tmp = os.path.join(WORK, "concat.mp4")
out = os.path.join(ROOT, "abbakka_full.mp4")
run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", tmp])
run([
    "ffmpeg", "-y", "-i", tmp, "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p",
    "-crf", "23", "-preset", "veryfast", "-s", "1920x1080", out
])
print("done", os.path.getsize(out), "bytes")
