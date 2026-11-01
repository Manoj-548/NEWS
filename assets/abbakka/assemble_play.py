#!/usr/bin/env python3
"""Rebuild Abbakka as a playable film: real motion clips + hard cuts.
Keeps existing Kannada mix. No beach, no Yakshagana."""
import os
import subprocess

ROOT = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(ROOT, "live_clips")
MON = os.path.join(ROOT, "monuments")
os.makedirs(WORK, exist_ok=True)


def run(cmd):
    subprocess.check_call(cmd)


def motion_still(jpg, dur, dest, reverse=False):
    d = max(0.4, float(dur))
    sx = "1-sin" if reverse else "1+sin"
    sy = "1-cos" if reverse else "1+cos"
    vf = (
        "scale=2560:1440:force_original_aspect_ratio=increase:flags=lanczos,"
        "crop=2560:1440,"
        "crop=1920:1080:"
        "x='(iw-ow)/2*(%s(2*PI*t/%.3f))':"
        "y='(ih-oh)/2*(%s(2*PI*t/%.3f))',"
        "setsar=1,fps=30,format=yuv420p"
    ) % (sx, d, sy, max(1.2, d * 0.7))
    run([
        "ffmpeg", "-y", "-loop", "1", "-t", "%.2f" % d, "-i", jpg,
        "-vf", vf, "-an", "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-crf", "23", "-preset", "veryfast", dest
    ])


def hard_two(a, b, dur, dest):
    d1 = dur * 0.5
    d2 = dur - d1
    pa = os.path.join(WORK, "_pa.mp4")
    pb = os.path.join(WORK, "_pb.mp4")
    motion_still(a, d1, pa, False)
    motion_still(b, d2, pb, True)
    lst = os.path.join(WORK, "_two.txt")
    with open(lst, "w") as f:
        f.write("file '%s'\nfile '%s'\n" % (pa, pb))
    run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lst,
        "-c", "copy", dest
    ])


def real_loop(src, dur, dest):
    vf = (
        "scale=1920:1080:force_original_aspect_ratio=increase:flags=lanczos,"
        "crop=1920:1080,setsar=1,fps=30,format=yuv420p"
    )
    run([
        "ffmpeg", "-y", "-stream_loop", "-1", "-i", src, "-t", "%.2f" % dur,
        "-vf", vf, "-an", "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-crf", "23", "-preset", "veryfast", dest
    ])


def jp(*parts):
    return os.path.join(ROOT, *parts)


SCENES = [
    ("00_ullal", 10.63, "still", jp("monuments", "circle_ullal.jpg"), None),
    ("01_palace", 12.67, "two", jp("ai_queen_palace.jpg"), jp("ai_palace_b.jpg")),
    ("02_court", 14.71, "two", jp("ai_court.jpg"), jp("ai_court_b.jpg")),
    ("03_warehouse", 8.66, "two", jp("ai_warehouse.jpg"), jp("ai_warehouse_b.jpg")),
    ("04_rani", 10.27, "still", jp("monuments", "rani_circle.jpg"), None),
    ("05_ships", 12.74, "real", os.path.join(WORK, "coptic480.webm"), None),
    ("06_fort", 10.10, "two", jp("ai_fort.jpg"), jp("ai_fort_b.jpg")),
    ("07_women", 8.13, "two", jp("ai_women.jpg"), jp("ai_women_b.jpg")),
    ("08_corridor", 8.45, "real", os.path.join(WORK, "campfire.webm"), None),
    ("09_night", 12.09, "real", os.path.join(WORK, "clouds_orig.webm"), None),
    ("10_memory", 7.23, "still", jp("monuments", "abbakka_circle.jpg"), None),
    ("11_stamp", 10.51, "still", jp("monuments", "stamp.jpg"), None),
    ("12_queen", 11.25, "two", jp("monuments", "ullal_queen.jpg"), jp("monuments", "circle_ullal.jpg")),
]


def main():
    names = []
    for name, dur, kind, a, b in SCENES:
        dest = os.path.join(WORK, name + "_play.mp4")
        print("clip", name, kind, dur)
        if kind == "real":
            real_loop(a, dur, dest)
        elif kind == "two":
            hard_two(a, b, dur, dest)
        else:
            motion_still(a, dur, dest, reverse=("rani" in name or "stamp" in name))
        names.append(dest)

    lst = os.path.join(WORK, "play_list.txt")
    with open(lst, "w") as f:
        for n in names:
            f.write("file '%s'\n" % n)
    concat = os.path.join(WORK, "play_concat.mp4")
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", concat])
    out = os.path.join(ROOT, "abbakka_play.mp4")
    audio = os.path.join(ROOT, "abbakka_kn.mp3")
    run([
        "ffmpeg", "-y", "-i", concat, "-i", audio,
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23", "-preset", "veryfast",
        "-c:a", "aac", "-b:a", "128k", "-shortest",
        "-movflags", "+faststart", out
    ])
    print("wrote", out, os.path.getsize(out))


if __name__ == "__main__":
    main()
