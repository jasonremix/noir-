# /// script
# requires-python = ">=3.10"
# dependencies = ["librosa>=0.10", "numpy", "scipy", "soundfile"]
# ///
"""JASON REMIX – DER WEG HINTER DER MUSIK: Score, Sounddesign und Sprecher-Schnitt.

    MOTION_REEL_SKILL=<skill> uv run jason-remix-trailer/audio/score.py

150 BPM (1 Beat = 0,4 s), 85,0 s, a-Moll (Am – F – C – G). Alles ist synthetisiert und geseedet.
Liest  audio/vo/raw/*.wav (vo_gen.py) + audio/vo_script.json
Schreibt audio/music.wav (Score + Foley), audio/vo.wav (platzierter Temp-Sprecher),
         beats.json (Raster), audio/viz.json (Wellenformen + Hüllkurven fürs Bild)

Dramaturgie (Beats):
  0-20    Schwarzbild: Atem, Schalter, Lüfter, Monitor, eine Taste (A2 auf b14)
  20-56   Der Anfang: Klaviermotiv, Pad, Sub-Drone; ab b47 wird alles dumpf ("niemand sonst")
  56-100  Der Weg: Halftime-Percussion, Bass, Arpeggio ab b80, Riser, Sub-Hit b96, harter Stopp b100
  100-144 Die andere Seite: Raumton, Uhr (1/s), unfertiger 1-Takt-Loop b108-136, Stille, Atem, Riser
  144-184 Der Moment: Groove (Ticken wird Hi-Hat), Build b160, Drop b168 (Hardtechno), Stopp b184
  188-212 Titel: Impact, Klavier A2 (b196), Atem (b200), trockener Kick (b205)
"""
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf
from scipy import signal


def _skill_dir():
    if os.environ.get("MOTION_REEL_SKILL"):
        return Path(os.environ["MOTION_REEL_SKILL"])
    found = sorted((Path.home() / ".claude/plugins").glob("**/skills/motion-reel/scripts/dsp.py"))
    if found:
        return found[-1].parent.parent
    sys.exit("set MOTION_REEL_SKILL to the folder that holds the motion-reel SKILL.md")


sys.path.insert(0, str(_skill_dir() / "scripts"))
from dsp import *  # noqa: E402,F403
import dsp  # noqa: E402

HERE = Path(__file__).resolve().parent
FILM = HERE.parent
BPM = 150
BEAT = 60 / BPM
DUR = 85.0
N = int(SR * DUR)
FPS = 25
seed(20271)


def T(b):
    return b * BEAT


def S(b):
    return int(round(T(b) * SR))


def rnd():
    return dsp.rng


# ---------------------------------------------------------------- instruments

def felt_piano(note, length=5.0, vel=0.7, bright=0.45):
    """Soft felt piano: inharmonic partials, two-stage decay, detuned unison, hammer felt noise."""
    f0 = hz(note)
    n = int(length * SR)
    t = tvec(n)
    B = 0.00022 * (110 / f0) ** 0.5
    x = np.zeros(n)
    for k in range(1, 16):
        fk = f0 * k * np.sqrt(1 + B * k * k)
        if fk > 7000:
            break
        amp = (1 / k ** 1.25) * np.exp(-0.22 * k * (1 - bright))
        t1 = 0.45 * (1 + (110 / f0) ** 0.5) / (1 + 0.35 * k)
        t2 = 4.2 * (1 + (110 / f0) ** 0.35) / (1 + 0.18 * k)
        env = 0.55 * np.exp(-t / t1) + 0.45 * np.exp(-t / t2)
        ph = rnd().uniform(0, 2 * np.pi)
        det = 1 + 0.00045 * (1 if k % 2 else -1)
        x += amp * env * (np.sin(2 * np.pi * fk * t + ph) + 0.7 * np.sin(2 * np.pi * fk * det * t + ph * 0.7)) / 1.7
    felt = filt(rnd().standard_normal(n) * np.exp(-t / 0.010), "bandpass", [180, 1800]) * 0.05
    thump = np.sin(2 * np.pi * min(f0, 90) * t) * np.exp(-t / 0.04) * 0.10
    x = x * vel + (felt + thump) * vel
    x = filt(x, "lowpass", 1400 + 3200 * bright * vel)
    x *= 1 - np.exp(-t / 0.004)
    x *= np.clip((length - t) / 0.35, 0, 1)
    return x


def boom(gain=1.0, tail=0.9):
    """Cinematic low hit (halftime pulse)."""
    n = int((tail + 0.3) * SR)
    t = tvec(n)
    f = 38 + 70 * np.exp(-t / 0.05)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (tail * 0.45))
    x += filt(rnd().standard_normal(n) * np.exp(-t / 0.008), "lowpass", 900) * 0.35
    return np.tanh(1.4 * x * gain) * (1 - np.exp(-t / 0.002))


def techno_kick(drive=2.2, decay=0.22, f_hi=260, f_lo=48):
    n = int(0.5 * SR)
    t = tvec(n)
    f = f_lo + (f_hi - f_lo) * np.exp(-t / 0.018)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / decay)
    click = filt(rnd().standard_normal(n) * np.exp(-t / 0.0015), "highpass", 2500) * 0.35
    x = np.tanh(drive * (body + click)) / np.tanh(drive)
    return x * (1 - np.exp(-t / 0.0006))


def snare(tone=190, decay=0.12, bright=1.0):
    n = int(0.3 * SR)
    t = tvec(n)
    nz = filt(rnd().standard_normal(n), "bandpass", [1200, 7500 * bright]) * np.exp(-t / decay)
    body = np.sin(2 * np.pi * tone * t) * np.exp(-t / 0.045) * 0.6
    return (nz * 0.8 + body) * (1 - np.exp(-t / 0.0008))


def ride(length=0.9):
    n = int(length * SR)
    t = tvec(n)
    x = np.zeros(n)
    for fr, a in ((3150, 0.3), (4410, 0.25), (5260, 0.2), (6690, 0.18), (8120, 0.12), (9350, 0.1)):
        x += a * np.sin(2 * np.pi * fr * t + rnd().uniform(0, 6)) * np.sin(2 * np.pi * fr * 1.37 * t)
    x += filt(rnd().standard_normal(n), "highpass", 6000) * 0.25
    return x * np.exp(-t / (length * 0.35)) * (1 - np.exp(-t / 0.001))


def tick(high=True):
    """Mechanical clock tick: click + small resonant ping."""
    n = int(0.09 * SR)
    t = tvec(n)
    f = 3350 if high else 2650
    ping = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.006) * 0.5
    ping += np.sin(2 * np.pi * f * 1.73 * t) * np.exp(-t / 0.003) * 0.25
    click = filt(rnd().standard_normal(n) * np.exp(-t / 0.0007), "highpass", 1800) * 0.6
    wood = np.sin(2 * np.pi * 820 * t) * np.exp(-t / 0.012) * 0.25
    return (ping + click + wood) * (1 - np.exp(-t / 0.0002))


def breath(kind="in", length=1.0):
    n = int(length * SR)
    p = np.linspace(0, 1, n)
    nz = rnd().standard_normal(n)
    if kind == "in":
        x = sweep_filter(nz, 700 + 900 * p, "bandpass", 0.9) + 0.4 * sweep_filter(nz, 2300 + 600 * p, "bandpass", 1.6)
        env = np.sin(np.pi * np.clip(p / 0.85, 0, 1)) ** 1.4 * np.clip((1 - p) / 0.15, 0, 1)
    else:
        x = sweep_filter(nz, 900 - 400 * p, "bandpass", 0.8) + 0.5 * filt(nz, "lowpass", 500)
        env = np.clip(p / 0.08, 0, 1) * np.exp(-p * 2.6)
    return filt(filt(x, "highpass", 120), "lowpass", 5200) * env


def switch_click():
    n = int(0.25 * SR)
    t = tvec(n)
    a = filt(rnd().standard_normal(n) * np.exp(-t / 0.0012), "bandpass", [1500, 9000]) * 0.8
    thump = np.sin(2 * np.pi * 95 * t) * np.exp(-t / 0.02) * 0.6
    b = np.zeros(n)
    d = int(0.038 * SR)
    b[d:] = filt(rnd().standard_normal(n - d) * np.exp(-tvec(n - d) / 0.001), "bandpass", [2000, 8000]) * 0.45
    return a + thump + b


def mouse_click():
    n = int(0.08 * SR)
    t = tvec(n)
    x = filt(rnd().standard_normal(n) * np.exp(-t / 0.0008), "bandpass", [2500, 9000])
    x += np.sin(2 * np.pi * 1900 * t) * np.exp(-t / 0.004) * 0.4
    return x


def key_thock():
    n = int(0.3 * SR)
    t = tvec(n)
    x = np.sin(2 * np.pi * (140 + 60 * np.exp(-t / 0.01)) * t) * np.exp(-t / 0.035)
    x += filt(rnd().standard_normal(n) * np.exp(-t / 0.004), "bandpass", [400, 3500]) * 0.5
    return x


def metal_ring(f0=98.0, length=5.0):
    """Inharmonic metallic resonance for the title impact."""
    n = int(length * SR)
    t = tvec(n)
    x = np.zeros(n)
    for r, a, d in ((1.0, 1.0, 2.2), (2.41, 0.6, 1.6), (3.87, 0.42, 1.1), (5.43, 0.3, 0.8), (7.12, 0.2, 0.6), (8.97, 0.12, 0.4)):
        x += a * np.sin(2 * np.pi * f0 * r * t + rnd().uniform(0, 6)) * np.exp(-t / d)
    return x * (1 - np.exp(-t / 0.002))


def brass_swell(notes, length, cutoff=520):
    n = int(length * SR)
    x = np.zeros(n)
    for nt in notes:
        for det in (-0.06, 0.0, 0.05):
            x += saw(hz(nt) * 2 ** (det / 12), n, phase0=rnd().uniform())
    p = np.linspace(0, 1, n)
    x = sweep_filter(x, cutoff * (0.6 + 0.8 * np.sin(np.pi * np.clip(p * 1.4, 0, 1))), "lowpass", 0.9)
    env = np.clip(p / 0.06, 0, 1) * np.exp(-p * 2.2)
    return x * env / (len(notes) * 3)


def sub_tone(note, length, att=0.4, rel=0.6):
    n = int(length * SR)
    t = tvec(n)
    f = hz(note)
    x = np.sin(2 * np.pi * f * t) + 0.18 * np.sin(2 * np.pi * 2 * f * t)
    env = np.clip(t / att, 0, 1) * np.clip((length - t) / rel, 0, 1)
    return x * env


def drone(length, note="A1"):
    n = int(length * SR)
    t = tvec(n)
    f = hz(note)
    x = np.sin(2 * np.pi * f * t) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.07 * t))
    x += 0.35 * np.sin(2 * np.pi * f * 2.003 * t + 1.0) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.11 * t + 2))
    x += 0.15 * np.sin(2 * np.pi * f * 3.01 * t + 2.0)
    grain = filt(rnd().standard_normal(n), "bandpass", [160, 420]) * 0.25
    grain *= 0.5 + 0.5 * np.sin(2 * np.pi * 0.05 * t) ** 2
    return x + grain


def arp_note(note, length=0.32, cutoff=2600):
    n = int(length * SR)
    t = tvec(n)
    f = hz(note)
    x = saw(f, n) * 0.5 + saw(f * 1.004, n) * 0.5 + 0.3 * np.sin(2 * np.pi * 2 * f * t)
    x = sweep_filter(x, 300 + cutoff * np.exp(-t / 0.07), "lowpass", 1.3)
    return x * np.exp(-t / 0.12) * (1 - np.exp(-t / 0.002))


def reese(note, length, cutoff=220):
    n = int(length * SR)
    t = tvec(n)
    f = hz(note)
    x = saw(f, n) + saw(f * 1.012, n) + 0.8 * np.sin(2 * np.pi * f * t)
    x = filt(x, "lowpass", cutoff, 4)
    return np.tanh(1.6 * x) * adsr(n, 0.004, 0.08, 0.85, 0.03)


def stereo(x, pan=0.0):
    a = (pan + 1) / 2
    return np.stack([x * np.sqrt(1 - a), x * np.sqrt(a)])


def ir(length, decay, seed_=3, lp=6000):
    return reverb_ir(length, decay, seed_)


def convolve_st(x, impulse):
    return np.stack([signal.fftconvolve(x[c], impulse[c])[: x.shape[1]] for c in range(2)])


# ---------------------------------------------------------------- harmony

CH = {
    "Am": {"root": "A1", "pad": ["A2", "E3", "A3", "C4", "E4"], "lh": "A2"},
    "F": {"root": "F1", "pad": ["F2", "C3", "A3", "C4", "F4"], "lh": "F2"},
    "C": {"root": "C2", "pad": ["C3", "G3", "C4", "E4", "G4"], "lh": "C3"},
    "G": {"root": "G1", "pad": ["G2", "D3", "G3", "B3", "D4"], "lh": "G2"},
}
MOTIF = {   # right hand, a quarter note every 2 beats over one chord (8 beats)
    "Am": ["E4", "A4", "C5", "B4"],
    "F": ["A4", "C5", "F5", "E5"],
    "C": ["G4", "C5", "E5", "D5"],
    "G": ["B4", "D5", "G5", "A5"],
}
PROG = ["Am", "F", "C", "G"]


# ---------------------------------------------------------------- VO

def load_raw(f):
    y, sr = sf.read(f, dtype="float32")
    if y.ndim > 1:
        y = y.mean(axis=1)
    return librosa.resample(y, orig_sr=sr, target_sr=SR)


def ffmpeg_chain(y):
    """Pitch -1.5 semitones with preserved formants (deeper, same length), then EQ + compression."""
    with tempfile.TemporaryDirectory() as d:
        a, b = Path(d) / "in.wav", Path(d) / "out.wav"
        sf.write(a, y, SR, subtype="FLOAT")
        af = ("rubberband=pitch=0.917:formant=preserved:transients=smooth,highpass=f=75,"
              "equalizer=f=135:t=q:w=0.9:g=3,equalizer=f=330:t=q:w=1.2:g=-2.5,"
              "equalizer=f=3000:t=q:w=1:g=1.8,equalizer=f=9000:t=q:w=0.8:g=1.5,deesser=i=0.35,"
              "acompressor=threshold=-24dB:ratio=3:attack=5:release=150:makeup=3")
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(a), "-af", af,
                        "-ar", str(SR), "-c:a", "pcm_f32le", str(b)], check=True)
        out, _ = sf.read(b, dtype="float32")
    return out if out.ndim == 1 else out.mean(axis=1)


def speech_bounds(y, thr_db=-38):
    hop = int(0.005 * SR)
    rms = librosa.feature.rms(y=y, frame_length=hop * 4, hop_length=hop)[0]
    db = 20 * np.log10(rms + 1e-9) - 20 * np.log10(rms.max() + 1e-9)
    on = np.nonzero(db > thr_db)[0]
    return on[0] * hop / SR, on[-1] * hop / SR, db, hop


def build_vo():
    script = json.loads((HERE / "vo_script.json").read_text(encoding="utf-8"))
    vo = np.zeros(N + SR)
    placed = []
    for ln in script:
        y = load_raw(HERE / "vo" / "raw" / f"{ln['id']}.wav")
        y = ffmpeg_chain(y)
        a, b, db, hop = speech_bounds(y)
        start = T(ln["beat"]) - a
        s = int(round(start * SR))
        seg = y.copy()
        fi = int(0.004 * SR)
        seg[:fi] *= np.linspace(0, 1, fi)
        seg[-int(0.03 * SR):] *= np.linspace(1, 0, int(0.03 * SR))
        vo[s:s + len(seg)] += seg
        placed.append({"id": ln["id"], "text": ln["text"], "beat": ln["beat"],
                       "t0": round(start + a, 3), "t1": round(start + b, 3)})
        if ln["id"] == "p09":
            # where does "Riemix" start? the last voiced onset after a dip
            env = db[int(a * SR / hop):int(b * SR / hop)]
            dips = np.nonzero((env[1:-1] < env[:-2]) & (env[1:-1] < env[2:]) & (env[1:-1] < -18))[0]
            cand = [(a + (d + 1) * hop / SR) for d in dips]
            print("  p09 dips (s from phrase start):", [round(c - a, 3) for c in cand][-6:])
    print("VO edit:")
    for p0, p1 in zip(placed, placed[1:] + [{"t0": DUR}]):
        gap = p1["t0"] - p0["t1"]
        print(f"  {p0['id']} b{p0['beat']:<6} {p0['t0']:6.2f}-{p0['t1']:6.2f}  gap {gap * 1000:+6.0f} ms  {p0['text']}"
              + ("  OVERLAP" if gap < 0 else ""))
    # a little room on the voice
    v = vo[:N]
    st = np.stack([v, v])
    room = reverb_ir(0.9, 0.18, 11)
    wet = convolve_st(st, room)
    st = st + 0.10 * wet
    return st, placed


# ---------------------------------------------------------------- the score

def main():
    buses = {k: Bus(DUR, BPM) for k in ("room", "foley", "piano", "pad", "drums", "bass", "synth", "fx", "loop")}
    room, foley, piano, pad, drums, bass, synth, fx, loop = (buses[k] for k in
                                                             ("room", "foley", "piano", "pad", "drums", "bass", "synth", "fx", "loop"))

    # ---- room tone + computer fan (continuous, very low)
    n_all = N + SR
    nz = dsp.rng.standard_normal(n_all)
    rt = filt(nz, "lowpass", 900) * 0.010 + filt(dsp.rng.standard_normal(n_all), "bandpass", [2000, 6000]) * 0.0012
    room.add(np.stack([rt, np.roll(rt, 977)]), 0, 1.0)
    fan_len = DUR - T(5)
    nfan = int(fan_len * SR)
    tf = tvec(nfan)
    spin = np.clip(tf / 1.6, 0, 1) ** 1.5
    fan = filt(dsp.rng.standard_normal(nfan), "bandpass", [140, 520]) * 0.012 * spin
    fan += (np.sin(2 * np.pi * 100 * tf) * 0.004 + np.sin(2 * np.pi * 300 * tf) * 0.0012) * spin
    room.add(fan, 5, 1.0, pan=0.15)

    # ---- SZENE 1 (b0-20)
    foley.add(breath("in", 1.05), 0.6, 0.15)
    foley.add(breath("out", 1.4), 3.2, 0.10)
    foley.add(switch_click(), 5, 0.22, pan=0.2)
    n_boot = int(T(6) * SR)
    tb = tvec(n_boot)
    boot = (np.sin(2 * np.pi * 50 * tb) * 0.4 + np.sin(2 * np.pi * 150 * tb) * 0.15 + np.sin(2 * np.pi * 250 * tb) * 0.06)
    boot *= np.clip(tb / 0.9, 0, 1) * np.exp(-tb / 2.2)
    foley.add(boot * 0.10, 7.5, 1.0)
    swp = np.sin(2 * np.pi * np.cumsum(280 + 260 * np.clip(tb / 0.8, 0, 1)) / SR) * np.exp(-tb / 0.5) * np.clip(tb / 0.05, 0, 1)
    foley.add(swp * 0.025, 7.5, 1.0)
    foley.add(mouse_click(), 12, 0.22, pan=0.25)
    foley.add(switch_click()[: int(0.06 * SR)], 7.5, 0.16, pan=-0.1)          # the monitor's relay
    # outside (b20-30): distant city and a little wind, then we go in through the window
    n_out = int(T(10.6) * SR)
    t_out = tvec(n_out)
    city = filt(dsp.rng.standard_normal(n_out), "lowpass", 380) * 0.05
    wind = sweep_filter(dsp.rng.standard_normal(n_out), 500 + 300 * np.sin(2 * np.pi * 0.11 * t_out) ** 2, "bandpass", 0.7) * 0.012
    env_out = np.clip(t_out / 0.05, 0, 1) * 0.6 + 0.4 * np.clip(t_out / 1.2, 0, 1)
    env_out *= np.clip((T(10.6) - t_out) / T(1.0), 0, 1)
    room.add(np.stack([(city + wind) * env_out, (np.roll(city, 1301) + wind) * env_out]), 20, 1.0)
    foley.add(key_thock(), 14, 0.30)
    piano.add(felt_piano("A2", 7.0, 0.75, 0.4), 14, 0.72)
    # sub drone from the monitor wake (b7.5) to the hard stop (b100), with its own swells
    dr = drone(T(100 - 7.5))
    ndr = len(dr)
    p = np.linspace(0, 1, ndr)
    tb2 = np.arange(ndr) / SR + T(7.5)
    dr_env = np.clip((tb2 - T(7.5)) / 2.5, 0, 1) * (0.55 + 0.45 * np.clip((tb2 - T(56)) / 6, 0, 1))
    pad.add(filt(dr, "highpass", 38) * dr_env * 0.07, 7.5, 1.0)

    # ---- SZENE 2 + 3: Klavier, Pad, Bass (b24-96)
    chords = []
    for i, b0 in enumerate(range(24, 96, 8)):
        chords.append((b0, PROG[i % 4]))
    for b0, ch in chords:
        c = CH[ch]
        lh_v = 0.55 if b0 < 56 else 0.5
        piano.add(felt_piano(c["lh"], 5.5, lh_v, 0.35), b0, 0.55, pan=-0.12)
        for k, nt in enumerate(MOTIF[ch]):
            v = 0.62 if k == 0 else 0.5
            if b0 >= 56:
                v *= 0.9
            piano.add(felt_piano(nt, 4.0, v, 0.45), b0 + 2 * k, 0.5, pan=0.12 - 0.06 * k)
        if b0 >= 36:
            g = 0.22 if b0 < 56 else 0.3
            pad.add(pad_chord(c["pad"], T(8) + 0.6, (500, 900) if b0 < 56 else (700, 1500), attack=0.9, release=0.6), b0, g)
        if b0 >= 56:
            bass.add(sub_tone(c["root"], T(8) - 0.05, 0.08, 0.2), b0, 0.42)

    # Scene 3 percussion (halftime) b56-96
    for b0 in range(56, 96, 4):
        drums.add(boom(1.0, 0.8), b0, 0.75)
        if b0 >= 64:
            drums.add(clap(), b0 + 2, 0.22, pan=0.05)
            drums.add(snare(170, 0.09, 0.7), b0 + 2, 0.12)
        if b0 >= 72:
            drums.add(boom(0.7, 0.4), b0 + 3.5, 0.35)
    for b in np.arange(60, 96, 0.5):
        drums.add(dsp.hat(), b + 0.25, 0.035 + (0.02 if b >= 80 else 0), pan=0.3)
    for b in np.arange(80, 96, 0.25):
        if (b * 4) % 2 == 1:
            drums.add(dsp.hat(), b, 0.018, pan=-0.25)
    # arpeggio b80-96 (8ths), chord tones climbing, filter opening
    arp_pat = {"Am": ["A4", "C5", "E5", "A5"], "F": ["A4", "C5", "F5", "A5"], "C": ["G4", "C5", "E5", "G5"], "G": ["G4", "B4", "D5", "G5"]}
    for b in np.arange(80, 96, 0.5):
        ch = [c for b0, c in chords if b0 <= b][-1]
        notes = arp_pat[ch]
        k = int(round((b - 80) * 2))
        nt = notes[k % 4]
        cut = 900 + 3200 * ((b - 80) / 16) ** 1.5
        synth.add(arp_note(nt, 0.34, cut), b, 0.09, pan=-0.35 if k % 2 else 0.35)
    # riser + swell into the sub hit (b96), then the "logo" chord
    fx.add(riser(T(8)), 88, 0.32)
    sw = crash(2.2)[::-1].copy()
    sw[-int(0.02 * SR):] = 0
    fx.add(sw, 96 - 2.2 / BEAT, 0.22)
    fx.add(sub_drop(1.6, 70, 30), 96, 0.85)
    fx.add(metal_ring(110, 3.0), 96, 0.12)
    fx.add(crash(2.4), 96, 0.18)
    synth.add(pad_chord(["A2", "E3", "B3", "C4", "E4", "A4"], T(4) + 0.3, (2400, 1200), attack=0.01, release=0.2), 96, 0.42)
    bass.add(sub_tone("A1", T(4), 0.01, 0.1), 96, 0.55)

    # ---- SZENE 4 (b100-144)
    # clock: one tick per second from t=40.6, accelerating onto the grid at the end
    tick_times = [40.6 + k for k in range(16)]
    tick_times = [x for x in tick_times if x < T(140)]
    accel = [140.0, 141.25, 142.25, 142.75, 143.25, 143.5, 143.75]
    tick_times += [T(b) for b in accel]
    for k, tt in enumerate(tick_times):
        foley.add(tick(k % 2 == 0), 0, 0.30 + (0.1 if tt > T(140) else 0), pan=0.18, at=tt)
    # drone returns, colder, with a high air tone
    dr4 = drone(T(144 - 102), "A1")
    n4 = len(dr4)
    t4 = np.arange(n4) / SR
    env4 = np.clip(t4 / 3, 0, 1) * np.clip((T(144 - 102) - t4) / 0.5, 0, 1)
    pad.add(filt(dr4, "highpass", 38) * env4 * 0.05, 102, 1.0)
    air = np.sin(2 * np.pi * hz("E6") * t4) * 0.5 + np.sin(2 * np.pi * hz("A6") * 1.002 * t4) * 0.3
    air *= np.clip((t4 - T(14)) / 4, 0, 1) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.2 * t4)) * np.clip((T(36) - t4) / 1.5, 0, 1)
    pad.add(air * 0.006, 102, 1.0, pan=-0.2)
    # the unfinished 1-bar loop (b108-136), heard through a small speaker
    for b0 in range(108, 136, 4):
        loop.add(techno_kick(1.5, 0.15, 180, 55), b0, 0.5)
        loop.add(techno_kick(1.5, 0.15, 180, 55), b0 + 2, 0.4)
        for h in (0.5, 1.5, 2.5, 3.5):
            loop.add(dsp.hat(), b0 + h, 0.12)
        loop.add(pad_chord(["A3", "C4", "E4"], 0.22, 2400, attack=0.005, release=0.05), b0 + 1.5, 0.5)
        loop.add(pad_chord(["A3", "C4", "E4"], 0.22, 2400, attack=0.005, release=0.05), b0 + 3, 0.45)
        for k, nt in enumerate(["A4", "C5", "E5", "D5"]):
            loop.add(arp_note(nt, 0.3, 2000), b0 + k, 0.35)
    foley.add(mouse_click(), 136, 0.25, pan=0.25)
    foley.add(breath("in", 1.1), 140.6, 0.17)
    sw2 = crash(1.4)[::-1].copy()
    sw2[-int(0.015 * SR):] = 0
    fx.add(sw2, 144 - 1.4 / BEAT, 0.25)
    fx.add(riser(T(2.5)), 141.5, 0.25)

    # ---- SZENE 5 (b144-184)
    fx.add(sub_drop(1.2, 65, 32), 144, 0.6)
    fx.add(crash(1.8), 144, 0.12)
    # groove b144-160: halftime kick, the ticks become hats, clap on 3
    for b in range(144, 160, 2):
        drums.add(techno_kick(2.0, 0.24), b, 0.62)
    for b in range(144, 160):
        drums.add(dsp.hat(), b + 0.5, 0.08, pan=0.2)
        drums.add(tick(b % 2 == 0), b + 0.5, 0.10, pan=0.18)
    for b in range(146, 160, 4):
        drums.add(clap(), b, 0.28)
    for b0, ch in ((144, "Am"), (152, "F")):
        c = CH[ch]
        pad.add(pad_chord(c["pad"], T(8) + 0.4, (900, 1800), attack=0.3, release=0.4), b0, 0.3)
        bass.add(reese(c["root"].replace("1", "2"), T(8) - 0.05, 260), b0, 0.18)
        for k, nt in enumerate(MOTIF[ch]):
            up = nt[:-1] + str(int(nt[-1]) + 1)
            piano.add(felt_piano(up, 3.0, 0.55, 0.55), b0 + 2 * k, 0.42, pan=0.15)
    # build b160-168
    for b0, ch in ((160, "C"), (164, "G")):
        c = CH[ch]
        pad.add(pad_chord(c["pad"], T(4) + 0.2, (1200, 4200), attack=0.05, release=0.2), b0, 0.3)
        bass.add(reese(c["root"].replace("1", "2"), T(4) - 0.05, 320), b0, 0.2)
    for b in range(160, 167):
        drums.add(techno_kick(2.2, 0.2), b, 0.62)
    roll = [(b, 0.12 + 0.25 * (b - 160) / 8) for b in np.arange(160, 164, 0.5)]
    roll += [(b, 0.2 + 0.25 * (b - 160) / 8) for b in np.arange(164, 166, 0.25)]
    roll += [(b, 0.3 + 0.25 * (b - 160) / 8) for b in np.arange(166, 167.75, 0.125)]
    for b, g in roll:
        drums.add(snare(200, 0.07), b, g, pan=0.05)
    fx.add(riser(T(7.75)), 160, 0.38)

    # DROP b168-184: hard techno, Am F C G (4 beats each), 150 BPM
    kicks = list(range(168, 184))
    for b in kicks:
        drums.add(techno_kick(3.2, 0.26, 300, 46), b, 0.85)
    # rumble: the kick train through a short room, distorted, low-passed, ducked by the kick
    rum = Bus(DUR, BPM)
    for b in kicks:
        rum.add(techno_kick(2.0, 0.2), b, 0.6)
    rsrc = rum.x[:, :N].mean(axis=0)
    rir = reverb_ir(0.7, 0.22, 5)[0]
    rw = signal.fftconvolve(rsrc, rir)[:N]
    rw = filt(rw, "lowpass", 140, 4)
    rw = np.tanh(4.5 * rw / (np.abs(rw).max() + 1e-9)) * 0.5
    rw = filt(rw, "highpass", 32)
    duck = sidechain([T(b) for b in kicks], N, 0.97, 0.07)
    rw *= duck
    m = np.zeros(N)
    m[S(168):S(184)] = 1
    bass.add(rw * m, 0, 0.55)
    for b in kicks:
        drums.add(dsp.hat(open_=True), b + 0.5, 0.11, pan=-0.15)
        drums.add(ride(0.7), b, 0.04, pan=0.3)
        for s16 in (0.25, 0.75):
            drums.add(dsp.hat(), b + s16, 0.05, pan=0.25)
        if b % 2 == 1:
            drums.add(clap(True), b, 0.3)
    fx.add(crash(2.0), 168, 0.25)
    fx.add(crash(1.6), 176, 0.18)
    lead = {"Am": ["E5", "A5", "C6", "B5", "A5", "E5", "C6", "B5"], "F": ["F5", "A5", "C6", "E6", "C6", "A5", "F5", "A5"],
            "C": ["E5", "G5", "C6", "D6", "C6", "G5", "E5", "G5"], "G": ["D6", "B5", "G5", "A5", "B5", "D6", "G6", "A6"]}
    for i, ch in enumerate(PROG):
        b0 = 168 + 4 * i
        c = CH[ch]
        for off in (0.5, 1.5, 2.5, 3.5):
            synth.add(pad_chord(c["pad"][1:], 0.2, 5200, attack=0.003, release=0.06), b0 + off, 0.42)
        for k, nt in enumerate(lead[ch]):
            synth.add(arp_note(nt, 0.3, 4200), b0 + 0.5 * k, 0.16, pan=0.2 if k % 2 else -0.2)
        bass.add(sub_tone(c["root"], T(4) - 0.04, 0.005, 0.03), b0, 0.3)
    # the drop's synths pump with the kick
    pump = sidechain([T(b) for b in kicks], synth.x.shape[1], 0.55, 0.09)
    synth.x *= pump

    # ---- SZENE 6 (b188-212.5)
    fx.add(sub_drop(2.2, 60, 26), 188, 0.95)
    fx.add(metal_ring(82.4, 6.0), 188, 0.18)
    fx.add(crash(3.0), 188, 0.10)
    fx.add(brass_swell(["A1", "E2", "A2"], T(8) + 1.0), 188, 0.55)
    piano.add(felt_piano("A2", 7.0, 0.75, 0.4), 196, 0.72)
    piano.add(felt_piano("E4", 6.0, 0.4, 0.4), 196.02, 0.35)
    pad.add(pad_chord(["A2", "E3", "A3", "C4"], T(14), (420, 300), attack=1.2, release=2.0), 196, 0.2)
    foley.add(breath("out", 1.5), 200, 0.12)
    drums.add(techno_kick(1.2, 0.3, 160, 42), 205, 0.75)

    # ---- the cut: hard stops and the "niemand sonst" muffle
    music_keys = ("piano", "pad", "drums", "bass", "synth", "fx", "loop")
    gate = np.ones(N)
    gate[S(100):S(101)] = 0                 # b100 hard stop (the drone from b102 is added after this window)
    gate[S(184):S(188)] = 0                 # b184 abrupt stop, silence until the title
    gate[S(167.75):S(168)] = 0              # pre-drop breath
    for k in music_keys:
        x = buses[k].x[:, :N]
        if k != "fx":
            x[:, S(100):S(101)] = 0
        x[:, S(184):S(188)] *= 0
        x[:, S(167.75):S(168)] *= 0
        # everything from before b100 that would ring past it is cut too
        if k in ("piano", "pad", "synth", "bass", "drums"):
            tail = x[:, S(100):S(102)]
            tail *= 0
        buses[k].x[:, :N] = x
    # fx tails stop at b100 as well, except nothing: a clean cut
    buses["fx"].x[:, S(100):S(102.5)] = 0
    # the loop sounds through a small speaker: band-limited, a little crushed
    lp = buses["loop"].x[:, :N]
    lp = np.stack([filt(filt(ch, "highpass", 320, 2), "lowpass", 2600, 2) for ch in lp])
    lp = np.round(lp * 64) / 64
    buses["loop"].x[:, :N] = lp

    # muffle b46-52 ("die niemand sonst hören kann"): low-pass sweep on the musical buses, back at b56
    a, b_ = S(46), S(56)
    cut = np.full(b_ - a, 1.0)
    pp = np.linspace(0, 1, b_ - a)
    fc = np.where(pp < 0.6, 6000 * (280 / 6000) ** (pp / 0.6), 280)
    for k in ("piano", "pad"):
        x = buses[k].x[:, a:b_]
        buses[k].x[:, a:b_] = np.stack([sweep_filter(ch, fc, "lowpass", 0.7, block=256) for ch in x])

    # ---- reverb sends and the bed
    hall = reverb_ir(3.8, 1.1, 7)
    plate = reverb_ir(1.6, 0.45, 9)
    piano_x = buses["piano"].x[:, :N]
    pad_x = buses["pad"].x[:, :N]
    synth_x = buses["synth"].x[:, :N]
    drums_x = buses["drums"].x[:, :N]
    fx_x = buses["fx"].x[:, :N]
    wet_hall = convolve_st(piano_x * 0.55 + pad_x * 0.25 + fx_x * 0.2 + synth_x * 0.12, hall)
    wet_plate = convolve_st(drums_x * 0.12 + synth_x * 0.2, plate)
    # reverb tails obey the hard stops too
    for w in (wet_hall, wet_plate):
        w[:, S(100):S(101.5)] *= np.linspace(1, 0, S(101.5) - S(100))[None, :] ** 6
        w[:, S(101.5):S(102)] = 0
        w[:, S(184):S(188)] = 0
    # section levels (the voice sits on top): -3 dB under scene 3 and the groove, -2 dB in the build
    pts = [(0, 0), (55.5, 0), (56, -3), (99.5, -3), (100, 0), (143.5, 0), (144, -3), (159.5, -3), (160, -2),
           (167.5, -2), (168, 0), (213, 0)]
    gdb = np.interp(np.arange(N) / SR, [T(b) for b, _ in pts], [d for _, d in pts])
    g_auto = 10 ** (gdb / 20)
    for arr in (piano_x, pad_x, synth_x, drums_x):
        arr *= g_auto[None, :]
    buses["bass"].x[:, :N] *= g_auto[None, :]
    wet_hall *= g_auto[None, :]
    wet_plate *= g_auto[None, :]
    bed = (buses["room"].x[:, :N] * 1.0 + buses["foley"].x[:, :N] * 0.9 + piano_x * 0.8 + pad_x * 0.75
           + drums_x * 0.85 + buses["bass"].x[:, :N] * 0.8 + synth_x * 0.7 + fx_x * 0.75
           + buses["loop"].x[:, :N] * 0.5 + wet_hall * 0.5 + wet_plate * 0.35)
    bed = np.stack([filt(ch, "highpass", 24) for ch in bed])
    fade = int(0.6 * SR)
    bed[:, -fade:] *= np.linspace(1, 0, fade) ** 2
    peak = np.abs(bed).max()
    bed = bed / (peak + 1e-9) * 0.89
    sf.write(HERE / "music.wav", bed.T, SR, subtype="PCM_24")
    print(f"music.wav: {DUR}s, peak normalised (was {peak:.3f})")

    # ---- VO
    vo_st, placed = build_vo()
    vo_st = vo_st / (np.abs(vo_st).max() + 1e-9) * 0.7
    sf.write(HERE / "vo.wav", vo_st.T, SR, subtype="PCM_24")

    # ---- grid
    beats = [round(T(i), 4) for i in range(int(DUR / BEAT) + 1)]
    grid = {"bpm": BPM, "period": BEAT, "offset": 0.0, "beats": beats, "designed_bpm": BPM,
            "downbeats": beats[::4],
            "sections": {"schwarzbild": [0, 20], "anfang": [20, 56], "weg": [56, 100], "andere_seite": [100, 144],
                         "moment": [144, 188], "titel": [188, 212.5]},
            "source": "designed grid: every sound in audio/score.py is placed on T(b) = 0.4 * b exactly"}
    # sanity: measure the drop on the drums alone
    dr_m = buses["drums"].x[:, S(168):S(184)].mean(axis=0)
    meas = measure_beats(dr_m, SR, BPM, t0=0.0)
    grid["check_drop"] = {"bpm": meas["bpm"], "offset_ms": round(meas["offset"] * 1000, 2), "fit_ms": meas["fit_residual_ms"]}
    (FILM / "beats.json").write_text(json.dumps(grid, indent=1))
    print(f"beats.json: designed {BPM} bpm; drop measured {meas['bpm']} bpm, offset {meas['offset'] * 1000:.1f} ms, fit {meas['fit_residual_ms']} ms")

    # ---- data for the picture
    mono = bed.mean(axis=0)
    hop = SR // FPS
    nfr = int(DUR * FPS)
    rms = np.array([np.sqrt(np.mean(mono[i * hop:(i + 1) * hop] ** 2)) for i in range(nfr)])
    rdb = 20 * np.log10(rms + 1e-9)
    rnorm = np.clip((rdb + 50) / 44, 0, 1)
    # oscilloscope frames b40-56: piano + pad only, triggered on a rising zero crossing
    musical = (piano_x + pad_x * 0.6).mean(axis=0)
    musical = filt(musical, "lowpass", 1200)
    win = 2400
    frames = []
    f0, f1 = int(T(40) * FPS), int(T(56) * FPS)
    gmax = np.abs(musical[S(40):S(56)]).max() + 1e-9
    for fr in range(f0, f1):
        c = int(fr / FPS * SR)
        seg = musical[c - win:c + win * 2]
        zc = np.nonzero((seg[:-1] <= 0) & (seg[1:] > 0))[0]
        zc = zc[(zc > win // 2) & (zc < win * 1.5)]
        s0 = zc[0] if len(zc) else win
        w = seg[s0:s0 + win]
        idx = np.linspace(0, len(w) - 1, 320).astype(int)
        frames.append([round(float(v / gmax), 3) for v in w[idx]])
    # the clip in shot 9: piano from b24 to b40 as min/max bins
    clip = (piano_x.mean(axis=0))[S(24):S(40)]
    bins = np.array_split(clip, 400)
    cmax = np.abs(clip).max() + 1e-9
    clipwave = [[round(float(b.min() / cmax), 3), round(float(b.max() / cmax), 3)] for b in bins]
    viz = {"fps": FPS, "rms": [round(float(x), 3) for x in rnorm],
           "scope": {"from_frame": f0, "frames": frames}, "clipwave": clipwave, "vo": placed}
    (HERE / "viz.json").write_text(json.dumps(viz))
    print(f"viz.json: rms {nfr} frames, scope {len(frames)} frames, clip {len(clipwave)} bins")


if __name__ == "__main__":
    main()
