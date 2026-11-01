#!/usr/bin/env python3
"""Short scene videos + Kannada presenter + character voices + atmosphere.
Historic monuments stay real photos (moving). Story beats are 2-shot AI clips.
No beach crowds, no Yakshagana."""
import asyncio, os, subprocess, sys
from mutagen.mp3 import MP3

ROOT = os.path.dirname(os.path.abspath(__file__))
MON = os.path.join(ROOT, "monuments")
WORK = os.path.join(ROOT, "live_clips")
VOICE = os.path.join(ROOT, "voice")
SFX = os.path.join(ROOT, "sfx")
os.makedirs(WORK, exist_ok=True)
os.makedirs(VOICE, exist_ok=True)

def run(cmd, quiet=True):
    kw = {"stdout": subprocess.DEVNULL, "stderr": subprocess.DEVNULL} if quiet else {}
    subprocess.check_call(cmd, **kw)

def dur_of(path):
    try:
        return float(MP3(path).info.length)
    except Exception:
        out = subprocess.check_output([
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=nw=1:nk=1", path
        ], text=True).strip()
        return float(out or 0)

async def tts(text, dest, voice, rate="-8%", pitch="+0Hz"):
    import edge_tts
    comm = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
    await comm.save(dest)

def pan_clip(jpg, dur, dest, reverse=False):
    d = max(0.3, float(dur) - 0.05)
    if reverse:
        x = "max(0,min(iw-ow,(iw-ow)*(1-t/%.3f)))" % d
        y = "max(0,min(ih-oh,(ih-oh)*(1-t/%.3f)))" % d
    else:
        x = "max(0,min(iw-ow,(iw-ow)*t/%.3f))" % d
        y = "max(0,min(ih-oh,(ih-oh)*t/%.3f))" % d
    vf = (
        "scale=2592:1458:force_original_aspect_ratio=increase:flags=lanczos,"
        "crop=2592:1458,crop=1920:1080:x='%s':y='%s',"
        "fade=t=in:st=0:d=0.25,fade=t=out:st=%.2f:d=0.25"
    ) % (x, y, max(0.3, dur - 0.3))
    run([
        "ffmpeg", "-y", "-loop", "1", "-t", "%.2f" % dur, "-i", jpg,
        "-vf", vf, "-an", "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-crf", "23", "-preset", "veryfast", dest
    ])

def two_shot(img_a, img_b, dur, dest):
    d1 = max(2.4, dur * 0.56)
    d2 = max(2.4, dur * 0.56)
    a = os.path.join(WORK, "_a.mp4")
    b = os.path.join(WORK, "_b.mp4")
    pan_clip(img_a, d1, a, False)
    pan_clip(img_b, d2, b, True)
    fade = 0.7
    off = max(0.4, d1 - fade)
    run([
        "ffmpeg", "-y", "-i", a, "-i", b,
        "-filter_complex",
        "[0:v][1:v]xfade=transition=fade:duration=%.2f:offset=%.2f,format=yuv420p" % (fade, off),
        "-an", "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-crf", "23", "-preset", "veryfast", dest
    ])

def one_shot(img, dur, dest, reverse=False):
    pan_clip(img, dur, dest, reverse)

def make_wind(dest, seconds):
    run([
        "ffmpeg", "-y", "-f", "lavfi",
        "-i", "anoisesrc=color=brown:r=44100:d=%.2f" % seconds,
        "-af", "highpass=f=180,lowpass=f=1400,volume=0.22",
        dest
    ])

def make_murmur(dest, seconds):
    run([
        "ffmpeg", "-y", "-f", "lavfi",
        "-i", "anoisesrc=color=pink:r=44100:d=%.2f" % seconds,
        "-af", "lowpass=f=500,volume=0.16",
        dest
    ])

def mix_audio(priya, char, sfx, seconds, dest):
    inputs = ["-i", priya]
    filters = ["[0:a]volume=0.80,adelay=250|250,apad=whole_dur=%.2f[n]" % seconds]
    n = 1
    labels = ["[n]"]
    if char and os.path.exists(char):
        inputs += ["-i", char]
        filters.append("[%d:a]volume=0.30,adelay=1100|1100[c]" % n)
        labels.append("[c]")
        n += 1
    if sfx and os.path.exists(sfx):
        inputs += ["-stream_loop", "-1", "-t", "%.2f" % seconds, "-i", sfx]
        filters.append("[%d:a]volume=0.14,afade=t=in:d=0.4,afade=t=out:st=%.2f:d=0.4[s]" % (n, max(0.5, seconds - 0.45)))
        labels.append("[s]")
        n += 1
    fc = ";".join(filters) + ";" + "".join(labels) + "amix=inputs=%d:duration=longest:dropout_transition=2,alimiter=limit=0.95[a]" % len(labels)
    run(["ffmpeg", "-y"] + inputs + ["-filter_complex", fc, "-map", "[a]", "-t", "%.2f" % seconds, dest])

def mux(video, audio, dest):
    run([
        "ffmpeg", "-y", "-i", video, "-i", audio,
        "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-shortest", dest
    ])

SCENES = [
    dict(
        name="00_ullal",
        images=["monuments/circle_ullal.jpg"],
        priya="ನಮಸ್ಕಾರ. ಕನ್ನಡಿಗರೇ, ಇದು ವಿಶೇಷ ಇತಿಹಾಸ ವಾರ್ತಾ ಪ್ರಸಾರ. ತೆರೆಯ ಮೇಲೆ ದಕ್ಷಿಣ ಕನ್ನಡದ ಉಳ್ಳಾಲ.",
        rate="-6%", char=None, sfx="murmur",
    ),
    dict(
        name="01_palace",
        images=["ai_queen_palace.jpg", "ai_palace_b.jpg"],
        priya="ಈ ನೆಲದಿಂದ ಹದಿನಾರನೇ ಶತಮಾನದಲ್ಲಿ ರಾಣಿ ಅಬ್ಬಕ್ಕ ಚೌಟ ಪೋರ್ಚುಗೀಸ್ ಸಾಮ್ರಾಜ್ಯವನ್ನು ನಾಲ್ಕು ದಶಕ ಎದುರಿಸಿದಳು. ಜನ ಅವಳನ್ನು ಅಭಯರಾಣಿ ಎಂದು ಕರೆದರು.",
        rate="-8%", char=None, sfx="fire",
    ),
    dict(
        name="02_court",
        images=["ai_court.jpg", "ai_court_b.jpg"],
        priya="ಚೌಟ ವಂಶ ಅಳಿಯಸಂತಾನ. ಮಾವ ತಿರುಮಲ ರಾಯ ಖಡ್ಗ ಮತ್ತು ಯುದ್ಧತಂತ್ರ ಕಲಿಸಿ ಸಿಂಹಾಸನ ಕಟ್ಟಿದರು. ಜೈನ, ಹಿಂದೂ, ಬ್ಯಾರಿ ಮುಸ್ಲಿಂ ಸಮುದಾಯ ಆಡಳಿತದಲ್ಲಿದ್ದರು.",
        rate="-8%",
        char=("kn-IN-GaganNeural", "ರಾಣಿಯವರೇ, ಮಂತ್ರಿಗಳು ಕಾಯುತ್ತಿದ್ದಾರೆ. ನ್ಯಾಯ ಕೇಳಲು ಜನ ಬಂದಿದ್ದಾರೆ."),
        sfx="murmur",
    ),
    dict(
        name="03_warehouse",
        images=["ai_warehouse.jpg", "ai_warehouse_b.jpg"],
        priya="ಉಳ್ಳಾಲ ಮೆಣಸು ವ್ಯಾಪಾರದ ಕೇಂದ್ರ. ಪೋರ್ಚುಗೀಸರು ತೆರಿಗೆ ಕೇಳಿದರು. ರಾಣಿ ನಿರಾಕರಿಸಿದಳು.",
        rate="-7%",
        char=("kn-IN-GaganNeural", "ತೆರಿಗೆ ಕೊಡುವುದಿಲ್ಲ. ಇದು ನಮ್ಮ ಉಳ್ಳಾಲ."),
        sfx="murmur",
    ),
    dict(
        name="04_rani",
        images=["monuments/rani_circle.jpg"],
        priya="ಈಗ ಕಾಣುವವಳು ಉಳ್ಳಾಲದ ರಾಣಿ. ಆಕೆ ಸಾಮಾನ್ಯರಂತೆ ಉಡುಪು ಧರಿಸಿ ರಾತ್ರಿ ತಡವಾಗಿ ನ್ಯಾಯ ನೀಡುತ್ತಿದ್ದಳು.",
        rate="-8%", char=None, sfx="murmur",
    ),
    dict(
        name="05_ships",
        images=["ai_ships.jpg", "ai_ships_b.jpg"],
        priya="ಕಪ್ಪು ಮೋಡದಡಿ ಪೋರ್ಚುಗೀಸ್ ಹಡಗುಗಳು. ಒಂದು ಸಾವಿರ ಐನೂರು ಐವತ್ತೈದರಲ್ಲಿ ಅಡ್ಮಿರಲ್ ಡಾನ್ ಅಲ್ವಾರೊ ದಾಳಿ ಮಾಡಿದ. ಅಬ್ಬಕ್ಕ ಅವರನ್ನು ಹಿಮ್ಮೆಟ್ಟಿಸಿದಳು.",
        rate="-5%",
        char=("kn-IN-GaganNeural", "ಹಡಗು ಬರುತ್ತಿದೆ! ಎಲ್ಲರೂ ಸಿದ್ಧರಾಗಿ!"),
        sfx="wind",
    ),
    dict(
        name="06_fort",
        images=["ai_fort.jpg", "ai_fort_b.jpg"],
        priya="ಮೊಗವೀರ ಮೀನುಗಾರರು ಮತ್ತು ಬ್ಯಾರಿ ನಾವಿಕರು ರಾಣಿಯ ಬಲ. ಅಗ್ನಿಬಾಣ ಬಳಸಿದ ಕೊನೆಯವರಲ್ಲಿ ಒಬ್ಬಳು ಎಂದು ಐತಿಹ್ಯ.",
        rate="-6%",
        char=("kn-IN-GaganNeural", "ಕೋಟೆ ನಿಂತಿದೆ ರಾಣಿ. ನಾವು ಜೊತೆಯಿದ್ದೇವೆ."),
        sfx="wind",
    ),
    dict(
        name="07_women",
        images=["ai_women.jpg", "ai_women_b.jpg"],
        priya="ಮಹಿಳೆಯರು ಖಡ್ಗಾಭ್ಯಾಸ ಮಾಡುತ್ತಿದ್ದಾರೆ. ರಾಣಿ ಕರಾವಳಿ ಮಹಿಳೆಯರನ್ನು ಸೇನೆ ಮಾಡಿದಳು.",
        rate="-6%",
        char=("kn-IN-SapnaNeural", "ಜೈ ಅಬ್ಬಕ್ಕ! ಜೈ ಅಭಯರಾಣಿ!"),
        sfx="fire",
    ),
    dict(
        name="08_corridor",
        images=["ai_corridor.jpg", "ai_corridor_b.jpg"],
        priya="ಒಂದು ಸಾವಿರ ಐನೂರು ಅರವತ್ತೆಂಟರಲ್ಲಿ ಜನರಲ್ ಪೈಕ್ಸೊಟೊ ಉಳ್ಳಾಲವನ್ನು ಆಕ್ರಮಿಸಿ ಅರಮನೆ ಪ್ರವೇಶಿಸಿದ.",
        rate="-8%", char=None, sfx="fire",
    ),
    dict(
        name="09_night",
        images=["ai_night.jpg", "ai_night_b.jpg"],
        priya="ರಾಣಿ ಮಸೀದಿಯಲ್ಲಿ ಆಶ್ರಯ ಪಡೆದು ಅದೇ ರಾತ್ರಿ ಎರಡು ನೂರು ಸೈನಿಕರೊಂದಿಗೆ ಮರುದಾಳಿ ಮಾಡಿದಳು. ಪೋರ್ಚುಗೀಸರು ಮಂಗಳೂರು ಕೋಟೆಯಿಂದ ಹಿಂದೆ ಸರಿದರು.",
        rate="-9%",
        char=("kn-IN-GaganNeural", "ರಾಣಿ, ಇಲ್ಲೇ ಆಶ್ರಯ ತೆಗೆದುಕೊಳ್ಳಿ. ನಾವು ಕಾಯುತ್ತೇವೆ."),
        sfx="fire",
    ),
    dict(
        name="10_memory",
        images=["monuments/abbakka_circle.jpg"],
        priya="ಕೊನೆಯ ಚಿತ್ರ ಸ್ಮೃತಿ. ಉಳ್ಳಾಲದ ವೃತ್ತದಲ್ಲಿ ಅಬ್ಬಕ್ಕ ಜೀವಂತ.",
        rate="-8%", char=None, sfx="murmur",
    ),
    dict(
        name="11_stamp",
        images=["monuments/stamp.jpg"],
        priya="ಅಂಚೆಚೀಟಿಯಲ್ಲಿ ವೀರರಾಣಿ. ಕಿತ್ತೂರು ಚೆನ್ನಮ್ಮ ಮತ್ತು ಒನಕೆ ಓಬವ್ವರ ಸಾಲಿನಲ್ಲಿ ಕರ್ನಾಟಕ ಈ ರಾಣಿಯನ್ನು ಸ್ಮರಿಸುತ್ತದೆ.",
        rate="-8%", char=None, sfx="murmur",
    ),
    dict(
        name="12_queen",
        images=["monuments/ullal_queen.jpg", "monuments/circle_ullal.jpg"],
        priya="ಇದು ನಮ್ಮ ಕನ್ನಡ ವರದಿ. ವೀರರಾಣಿ ಅಬ್ಬಕ್ಕ ಚೌಟ. ಅಭಯರಾಣಿ. ನಾವು ಮತ್ತೆ ಸಿಗೋಣ.",
        rate="-6%", char=None, sfx="murmur",
    ),
]

async def all_tts():
    jobs = []
    for s in SCENES:
        p = os.path.join(VOICE, s["name"] + "_priya.mp3")
        jobs.append(tts(s["priya"], p, "kn-IN-SapnaNeural", s.get("rate", "-8%"), "+4Hz"))
        s["priya_path"] = p
        if s.get("char"):
            voice, text = s["char"]
            c = os.path.join(VOICE, s["name"] + "_char.mp3")
            jobs.append(tts(text, c, voice, "+2%", "+0Hz"))
            s["char_path"] = c
        else:
            s["char_path"] = None
    await asyncio.gather(*jobs)

def main():
    print("tts...")
    asyncio.run(all_tts())
    fire = os.path.join(SFX, "fire.ogg")
    wind = os.path.join(WORK, "wind.wav")
    murmur = os.path.join(WORK, "murmur.wav")
    make_wind(wind, 20)
    make_murmur(murmur, 20)
    sfx_map = {"fire": fire if os.path.exists(fire) else murmur, "wind": wind, "murmur": murmur}

    concat_list = os.path.join(WORK, "pack_list.txt")
    names = []
    full_script = []
    for s in SCENES:
        full_script.append(s["priya"])
        pd = dur_of(s["priya_path"])
        clip_dur = max(6.2, pd + 1.15)
        print(s["name"], "priya", round(pd, 2), "clip", round(clip_dur, 2))
        imgs = [os.path.join(ROOT, p) if not os.path.isabs(p) else p for p in s["images"]]
        vraw = os.path.join(WORK, s["name"] + "_v.mp4")
        if len(imgs) >= 2 and os.path.exists(imgs[1]):
            two_shot(imgs[0], imgs[1], clip_dur, vraw)
        else:
            one_shot(imgs[0], clip_dur, vraw, reverse=s["name"].endswith("rani") or s["name"].endswith("stamp"))
        araw = os.path.join(WORK, s["name"] + "_a.wav")
        mix_audio(s["priya_path"], s.get("char_path"), sfx_map.get(s.get("sfx")), clip_dur, araw)
        mout = os.path.join(WORK, s["name"] + ".mp4")
        mux(vraw, araw, mout)
        names.append(s["name"] + ".mp4")

    with open(concat_list, "w") as f:
        for n in names:
            f.write("file '%s'\n" % n)
    tmp = os.path.join(WORK, "pack_concat.mp4")
    out = os.path.join(ROOT, "abbakka_full.mp4")
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_list, "-c", "copy", tmp], quiet=False)
    run([
        "ffmpeg", "-y", "-i", tmp, "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-crf", "23", "-preset", "veryfast", "-c:a", "aac", "-b:a", "128k",
        "-s", "1920x1080", "-movflags", "+faststart", out
    ])
    # extract mix for studio visemes / click-to-play
    mixmp3 = os.path.join(ROOT, "abbakka_kn.mp3")
    run(["ffmpeg", "-y", "-i", out, "-vn", "-c:a", "libmp3lame", "-q:a", "4", mixmp3])
    script_path = os.path.join(ROOT, "abbakka_script_kn.txt")
    with open(script_path, "w", encoding="utf-8") as f:
        f.write(" ".join(full_script) + "\n")
    print("done video", os.path.getsize(out), "audio", os.path.getsize(mixmp3), "dur", dur_of(mixmp3) if os.path.exists(mixmp3) else "?")

if __name__ == "__main__":
    main()
