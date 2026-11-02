#!/usr/bin/env python3
"""Bake a locked HD climate documentary: picture cuts with narration."""
import asyncio
import os
import subprocess

import edge_tts
from mutagen.mp3 import MP3

ROOT = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(ROOT, "_work")
os.makedirs(WORK, exist_ok=True)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
CLIPS = {
    "earth": "/tmp/earth_hd.mp4" if os.path.exists("/tmp/earth_hd.mp4") else os.path.join(ROOT, "earth.mp4"),
    "ocean": os.path.join(ROOT, "oceancloud.webm"),
    "storm": os.path.join(ROOT, "clouds.webm"),
    "fire": os.path.join(ROOT, "fire.webm"),
    "wind": os.path.join(ROOT, "wind.webm"),
}

SECTIONS = [
    dict(
        name="01_space",
        clip="earth",
        text=(
            "Good evening from the World Climate Desk. I am Alexander Hayes, your foreign correspondent. "
            "Nineteen of the twenty hottest years ever measured have fallen in this century. "
            "The planet's average temperature now sits about one point five degrees Celsius above the pre-industrial line. "
            "That is the very limit governments vowed to defend in Paris."
        ),
    ),
    dict(
        name="02_ice",
        clip="ocean",
        text=(
            "From space, the story is written in ice and ocean. "
            "Greenland and West Antarctica are losing mass faster each decade. "
            "Meltwater, plus the expansion of warming seas, is lifting global waterlines."
        ),
    ),
    dict(
        name="03_storm",
        clip="storm",
        text=(
            "Streets in Mumbai, Lagos, Jakarta and Miami already flood on cloudless days. "
            "A warmer sky holds more moisture, so storms strike harder."
        ),
    ),
    dict(
        name="04_fire",
        clip="fire",
        text=(
            "Dry belts burn longer. The science is not ambiguous. "
            "The main driver is carbon dioxide and methane from coal, oil, gas, and land use."
        ),
    ),
    dict(
        name="05_hope",
        clip="wind",
        text=(
            "There is a hard, practical hope. Solar and wind are now the cheapest new electricity in most of the world. "
            "Every tenth of a degree we still prevent is harvests, coastlines, and lives saved. "
            "This is Alexander Hayes, World Climate Desk. We will keep the watch."
        ),
    ),
]


def run(cmd):
    subprocess.check_call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def dur_mp3(path):
    return float(MP3(path).info.length)


async def tts(text, dest):
    comm = edge_tts.Communicate(text, "en-GB-RyanNeural", rate="-4%", pitch="-2Hz")
    await comm.save(dest)


def hd_loop(src, seconds, dest):
    vf = (
        "scale=1920:1080:force_original_aspect_ratio=increase:flags=lanczos,"
        "crop=1920:1080,setsar=1,fps=30,unsharp=5:5:0.5,format=yuv420p"
    )
    run([
        "ffmpeg", "-y", "-stream_loop", "-1", "-i", src, "-t", "%.2f" % seconds,
        "-vf", vf, "-an", "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-crf", "21", "-preset", "veryfast", dest,
    ])


def title_card(seconds, dest):
    vf = (
        "drawtext=fontfile=%s:text='WORLD CLIMATE DESK':fontcolor=0xF3D27A:fontsize=42:"
        "x=(w-text_w)/2:y=h*0.32,"
        "drawtext=fontfile=%s:text='GLOBAL WARMING':fontcolor=white:fontsize=72:"
        "x=(w-text_w)/2:y=h*0.44,"
        "drawtext=fontfile=%s:text='THE PLANETS RED LINE':fontcolor=white:fontsize=40:"
        "x=(w-text_w)/2:y=h*0.56,"
        "drawtext=fontfile=%s:text='A documentary with Alexander Hayes':fontcolor=0xCFE7FF:fontsize=28:"
        "x=(w-text_w)/2:y=h*0.70"
    ) % (FONT, FONT, FONT, FONT)
    run([
        "ffmpeg", "-y", "-f", "lavfi", "-i", "color=c=0x0B1220:s=1920x1080:d=%.2f:r=30" % seconds,
        "-vf", vf, "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
        "-preset", "veryfast", dest,
    ])


def mux(video, audio, dest, seconds):
    run([
        "ffmpeg", "-y", "-i", video, "-i", audio,
        "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest",
        "-t", "%.2f" % seconds, dest,
    ])


async def main():
    print("tts...")
    jobs = []
    for s in SECTIONS:
        p = os.path.join(WORK, s["name"] + ".mp3")
        s["mp3"] = p
        jobs.append(tts(s["text"], p))
    await asyncio.gather(*jobs)

    title = os.path.join(WORK, "00_title.mp4")
    print("title")
    title_card(5.2, title)

    pieces = [title]
    full_text = []
    for s in SECTIONS:
        d = max(6.0, dur_mp3(s["mp3"]) + 0.45)
        print(s["name"], round(d, 2))
        v = os.path.join(WORK, s["name"] + "_v.mp4")
        hd_loop(CLIPS[s["clip"]], d, v)
        m = os.path.join(WORK, s["name"] + ".mp4")
        mux(v, s["mp3"], m, d)
        pieces.append(m)
        full_text.append(s["text"])

    lst = os.path.join(WORK, "list.txt")
    with open(lst, "w") as f:
        for p in pieces:
            f.write("file '%s'\n" % p)
    concat = os.path.join(WORK, "concat.mp4")
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", concat])
    out = os.path.join(ROOT, "climate_doc.mp4")
    run([
        "ffmpeg", "-y", "-i", concat,
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "21", "-preset", "veryfast",
        "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", out,
    ])
    mp3 = os.path.join(ROOT, "climate_doc.mp3")
    run(["ffmpeg", "-y", "-i", out, "-vn", "-c:a", "libmp3lame", "-q:a", "3", mp3])
    with open(os.path.join(ROOT, "climate_script.txt"), "w", encoding="utf-8") as f:
        f.write(" ".join(full_text) + "\n")
    print("wrote", out, os.path.getsize(out), "audio", os.path.getsize(mp3))


if __name__ == "__main__":
    asyncio.run(main())
