#!/usr/bin/env python3
"""HD film: real Abbakka monuments + AI story stills. No beach, no Yakshagana, no burned titles."""
import os, subprocess

ROOT = os.path.dirname(os.path.abspath(__file__))
MON = os.path.join(ROOT, "monuments")
WORK = os.path.join(ROOT, "live_clips")
os.makedirs(WORK, exist_ok=True)

def run(cmd):
    print("+", " ".join(cmd[:6]), "...")
    subprocess.check_call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def still(jpg, dur, dest, axis="x"):
    n = max(60, int(dur * 30))
    if axis == "y":
        vf = "scale=1920:1080:force_original_aspect_ratio=increase:flags=lanczos,crop=1920:1080:x='(iw-ow)/2':y='max(0,min(ih-oh,(ih-oh)*t/%.2f))'" % max(0.2, dur - 0.05)
    else:
        vf = "scale=1920:1080:force_original_aspect_ratio=increase:flags=lanczos,crop=1920:1080:y='(ih-oh)/2':x='max(0,min(iw-ow,(iw-ow)*t/%.2f))'" % max(0.2, dur - 0.05)
    run([
        "ffmpeg", "-y", "-loop", "1", "-t", str(dur), "-i", jpg,
        "-vf", vf + ",fade=t=in:st=0:d=0.4,fade=t=out:st=%.2f:d=0.4" % (dur - 0.5),
        "-an", "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "22", "-preset", "ultrafast",
        dest
    ])

shots = [
    (os.path.join(MON, "circle_ullal.jpg"), 16, "y"),
    (os.path.join(ROOT, "ai_queen_palace.jpg"), 20, "x"),
    (os.path.join(ROOT, "ai_court.jpg"), 18, "x"),
    (os.path.join(MON, "rani_circle.jpg"), 16, "x"),
    (os.path.join(ROOT, "ai_ships.jpg"), 18, "x"),
    (os.path.join(ROOT, "ai_fort.jpg"), 16, "y"),
    (os.path.join(ROOT, "ai_women.jpg"), 18, "x"),
    (os.path.join(ROOT, "ai_night.jpg"), 16, "x"),
    (os.path.join(MON, "abbakka_circle.jpg"), 14, "x"),
    (os.path.join(MON, "stamp.jpg"), 12, "y"),
    (os.path.join(MON, "ullal_queen.jpg"), 12, "x"),
    (os.path.join(MON, "circle_ullal.jpg"), 14, "y"),
]

names = []
for i, (jpg, dur, axis) in enumerate(shots):
    if not os.path.exists(jpg):
        raise SystemExit("missing " + jpg)
    name = "%02d.mp4" % i
    still(jpg, dur, os.path.join(WORK, name), axis)
    names.append(name)

lst = os.path.join(WORK, "list.txt")
with open(lst, "w") as f:
    for n in names:
        f.write("file '%s'\n" % n)
tmp = os.path.join(WORK, "concat.mp4")
out = os.path.join(ROOT, "abbakka_full.mp4")
run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", tmp])
run(["ffmpeg", "-y", "-i", tmp, "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23", "-preset", "veryfast", "-s", "1920x1080", out])
print("done", os.path.getsize(out), "bytes")
