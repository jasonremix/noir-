"""FEDX - Lass mich frei (Jason Remix) - Uptempo / Warstyle / Frenchcore / Hardtek version.

Builds the whole track from the 200-BPM stems (src/stems200) and the supplied kick samples.
Run from the project folder:  python3 scripts/remix.py  -> out/mix_premaster.wav, out/remix.wav
"""
import sys, json, os
import numpy as np
import soundfile as sf
from numba import njit

sys.path.insert(0, os.path.dirname(__file__))
from dsp import *  # noqa

np.random.seed(7)

# ------------------------------------------------------------------ grid
BPM = 200
BEAT = 60 / BPM
BAR = 4 * BEAT
STEP = BEAT / 4
RATIO = 184 / 200          # stretched / original duration
T0S = 0.0745               # stretched stems: time of original bar 0, beat 0 (measured)
NBARS = 112
TAIL = 5.0
N = int((NBARS * BAR + TAIL) * SR)

CHORDS = ['F', 'Dm', 'Am', 'Am']           # one chord per bar, loop aligned to every section start


def chord(n):
    return CHORDS[n % 4]


def tn(bar, step=0.0):
    return bar * BAR + step * STEP


def S(t):
    return int(round(t * SR))


def src_bar(o):            # time inside the stretched stems of original bar o
    return T0S + o * BAR


def src_time(t_orig):      # original-song seconds -> stretched-stem seconds
    return t_orig * RATIO + 0.0065


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# ------------------------------------------------------------------ load material
def load(p):
    x, sr = sf.read(p, dtype='float64', always_2d=True)
    assert sr == SR, p
    return x


VOC = load('src/stems200/vocals.wav')
OTH = load('src/stems200/other.wav')


def tail_hz(x, t0=0.08, t1=0.25):
    m = mono(x)[int(t0 * SR):int(t1 * SR)]
    sp = np.abs(np.fft.rfft(m * np.hanning(len(m)), n=1 << 17))
    fr = np.fft.rfftfreq(1 << 17, 1 / SR)
    msk = (fr > 30) & (fr < 130)
    return fr[msk][np.argmax(sp[msk])]


KS = {
    'zaag': load('src/kick_zaag.wav'),
    'peep': load('src/kick_peep.wav'),
    'horns': load('src/kick_horns_Cm.wav'),
    'feedback': load('src/kick_feedback.wav'),
}
_loop = load('src/kick_uptempo_loop217.wav')
_lp = len(_loop) / 32
LOOPSL = [_loop[int(k * _lp):int((k + 1) * _lp)] for k in range(32)]
KS['loop'] = LOOPSL[0]
# where the tail pitch is measured differs per sample (horns swell later, zaag body 0.2s+)
KHZ = {
    'zaag': tail_hz(KS['zaag'], 0.22, 0.6),
    'peep': tail_hz(KS['peep'], 0.15, 0.6),
    'horns': tail_hz(KS['horns'], 0.12, 0.7),
    'feedback': tail_hz(KS['feedback'], 0.08, 0.3),
    'loop': tail_hz(KS['loop'], 0.06, 0.27),
}
LOOPHZ = [tail_hz(s, 0.06, 0.27) for s in LOOPSL]
ROOT_HZ = {'F': midi(29), 'Dm': midi(26), 'Am': midi(33)}   # F1 43.65, D1 36.7, A1 55

_kcache = {}
HORNS_SWELL_HZ = tail_hz(KS['horns'], 0.8, 1.3)     # the horn swell (~55.9 Hz) is tuned onto the chord root


def _measure(x):
    # pitch heard while the kick actually plays at 200 BPM (first 0.3 s, after the click)
    return tail_hz(x, 0.06, min(0.29, len(x) / SR - 0.005))


def kick(name, target_hz, extra=0.0, idx=None):
    """kick sample resampled so its audible body sits on target_hz (iteratively measured)."""
    key = (name, idx, round(target_hz, 2), round(extra, 2))
    if key in _kcache:
        return _kcache[key]
    src = LOOPSL[idx] if idx is not None else KS[name]
    if name == 'horns':
        semis = 12 * np.log2(target_hz / HORNS_SWELL_HZ)
    else:
        semis = 12 * np.log2(target_hz / _measure(src))
        for _ in range(4):
            err = 12 * np.log2(target_hz / _measure(resample_pitch(src, semis)))
            if abs(err) < 0.08:
                break
            semis += err
    _kcache[key] = resample_pitch(src, semis + extra)
    return _kcache[key]


# ------------------------------------------------------------------ kick track (monophonic)
class KickTrack:
    def __init__(self):
        self.ev = []   # (time, audio, gain, maxlen)

    def hit(self, t, audio, gain=1.0, maxlen=None):
        self.ev.append((t, audio, gain, maxlen))

    def render(self):
        out = np.zeros((N, 2))
        ev = sorted(self.ev, key=lambda e: e[0])
        onsets = []
        for i, (t, a, g, ml) in enumerate(ev):
            st_ = S(t)
            end = len(a)
            if ml is not None:
                end = min(end, S(ml))
            if i + 1 < len(ev):
                end = min(end, S(ev[i + 1][0]) - st_)
            seg = a[:end].copy()
            fo = min(int(0.004 * SR), len(seg))
            if end < len(a) and fo > 0:
                seg[-fo:] *= np.linspace(1, 0, fo)[:, None]
            add(out, seg, st_, g)
            onsets.append(st_)
        return out, onsets


KICK = KickTrack()
GHOST = []          # extra sidechain triggers (no sound), sample positions


def kbar(n, name, steps=(0, 4, 8, 12), gain=1.0, extra=0.0, root=None):
    r = ROOT_HZ[root or chord(n)]
    for s in steps:
        KICK.hit(tn(n, s), kick(name, r, extra), gain)


def roll(n, name, s0, s1, div=1.0, gain=1.0, rise=0.0, root=None):
    """kick roll from step s0 to s1 (exclusive) every `div` steps, pitch rising by `rise` semis."""
    r = ROOT_HZ[root or chord(n)]
    pos = np.arange(s0, s1, div)
    for i, s in enumerate(pos):
        e = rise * i / max(1, len(pos) - 1)
        KICK.hit(tn(n, s), kick(name, r, e), gain * (0.8 + 0.2 * i / max(1, len(pos) - 1)))


# ------------------------------------------------------------------ buses
B = {k: np.zeros((N, 2)) for k in
     ['voc', 'vocfx', 'oth', 'stab', 'pad', 'acid', 'hat', 'clap', 'crash', 'fx', 'screech', 'sub', 'loopfx', 'lead']}


def place(bus, src, t_src0, t_src1, t_dst, gain=1.0, fin=0.004, fout=0.02):
    a, b = S(t_src0), S(t_src1)
    a0 = max(0, a)
    seg = src[a0:b].copy()
    seg = fade(seg, fin, fout)
    add(B[bus] if isinstance(bus, str) else bus, seg, S(t_dst) + (a0 - a), gain)


def stem_bars(bus, stem, o0, o1, n0, pre=0.0, post=0.0, gain=1.0, fin=0.004, fout=0.03):
    """copy original bars [o0, o1) of a stretched stem to new bar n0."""
    place(bus, stem, src_bar(o0) - pre, src_bar(o1) + post, tn(n0) - pre, gain, fin, fout)


# ------------------------------------------------------------------ one-shot synths
def snare(n_=0.14, tone=190, bright=1.0):
    n = S(n_)
    t = np.arange(n) / SR
    nz = bp(noise(n), 900, 9000) * np.exp(-t / 0.045)[:, None] * bright
    body = sine(tone * (1 + 0.6 * np.exp(-t / 0.01)), n) * np.exp(-t / 0.03)
    return soft((nz * 2.2 + st(body) * 0.8), 1.5) * 0.7


def clap():
    n = S(0.25)
    t = np.arange(n) / SR
    e = np.zeros(n)
    for d in (0.0, 0.009, 0.018):
        k = S(d)
        e[k:] += np.exp(-(t[: n - k]) / 0.006)
    e += np.exp(-np.maximum(t - 0.027, 0) / 0.07) * (t > 0.027) * 0.8
    x = bp(noise(n), 800, 5000) * e[:, None]
    x = peq(x, 1800, 4, 1.2)
    return reverb(x, 0.9, 0.005, 0.25) * 1.6


def hat(open_=False):
    n = S(0.16 if open_ else 0.05)
    t = np.arange(n) / SR
    x = hp(noise(n), 7500, 4) * np.exp(-t / (0.055 if open_ else 0.012))[:, None]
    return x * (1.4 if open_ else 1.0)


def crash(dur=2.2):
    n = S(dur)
    t = np.arange(n) / SR
    met = sum(sine(f, n) for f in (3127, 4301, 5523, 6971, 8410)) / 5
    x = hp(noise(n) + st(met) * 0.25, 3500, 2) * np.exp(-t / 0.55)[:, None]
    return reverb(x, 2.5, 0.0, 0.3) * 0.9


def impact():
    n = S(2.5)
    t = np.arange(n) / SR
    f = 30 + 70 * np.exp(-t / 0.12)
    boom = soft(sine(f, n) * np.exp(-t / 0.6) * 1.5, 1.5)
    nz = lp(noise(n), 1800) * np.exp(-t / 0.35)[:, None]
    x = st(boom) * 0.9 + reverb(nz, 3.0, 0.0, 0.6) * 1.2
    return x


def riser(bars, lo=250, hi=11000):
    n = S(bars * BAR)
    x = noise(n) * 0.9
    x = sweep_filter(x, lo, hi, 'lowpass')
    x = sweep_filter(x, 80, hi / 6, 'highpass')
    g = np.linspace(0, 1, n) ** 2.2
    return x * g[:, None] * 1.4


def pitch_riser(bars, m0=57, m1=81):
    n = S(bars * BAR)
    t = np.linspace(0, 1, n)
    f = midi(m0 + (m1 - m0) * t ** 1.6)
    x = supersaw(f, n, voices=5, detune=0.3)
    x = lp(x, 6000)
    return x * (t ** 2)[:, None] * 0.35


def siren(dur=2.4, f0=420, f1=980):
    n = S(dur)
    t = np.linspace(0, 1, n)
    curve = np.where(t < 0.55, (np.clip(t, 0, 0.55) / 0.55) ** 0.7, 1 - (np.clip(t - 0.55, 0, None) / 0.45) ** 1.5 * 0.85)
    f = f0 + (f1 - f0) * curve
    x = saw(f, n) + 0.6 * saw(f * 1.005, n)
    x = soft(x * 2, 2)
    x = bp(st(x), 300, 4000)
    env = np.minimum(1, t * 8) * np.minimum(1, (1 - t) * 6)
    return reverb(x * env[:, None], 1.8, 0.02, 0.35) * 0.45


def screech(note=69, dur=0.26, bend=-12):
    n = S(dur)
    t = np.arange(n) / SR
    f = midi(note + bend * (t / dur) ** 0.6)
    ph = phase(f, n)
    mod = np.sin(2 * np.pi * ph * 1.5) * (4 + 3 * np.sin(2 * np.pi * 18 * t))
    x = np.tanh(4 * np.sin(2 * np.pi * ph + mod))
    x = bp(x, 700, 6000)
    env = np.minimum(1, t / 0.004) * np.exp(-t / (dur * 0.7))
    x = x * env
    return np.stack([x, np.roll(x, 90)], 1) * 0.55


VOICING = {   # midi chord voicings (pads/stabs)
    'F': [53, 57, 60, 65, 69, 72],
    'Dm': [50, 53, 57, 62, 65, 69],
    'Am': [52, 57, 60, 64, 69, 72],
}


def chord_saw(name, dur, voices=7, detune=0.22, octave=0):
    n = S(dur)
    x = np.zeros((n, 2))
    for m in VOICING[name]:
        x += supersaw(midi(m + 12 * octave), n, voices=voices, detune=detune)
    return x / len(VOICING[name]) * 1.4


_stab_cache = {}


def stab(name):
    if name not in _stab_cache:
        x = chord_saw(name, 0.2, octave=0)
        t = np.arange(len(x)) / SR
        env = np.minimum(1, t / 0.003) * np.exp(-t / 0.075)
        x = hp(lp(x * env[:, None], 7500), 220)
        _stab_cache[name] = x
    return _stab_cache[name]


# ------------------------------------------------------------------ acid line (hardtek)
@njit(cache=True)
def svf_lp(x, fc, damp):
    n = len(x)
    out = np.empty(n)
    low = 0.0
    band = 0.0
    for i in range(n):
        c = fc[i]
        if c > 5000.0:
            c = 5000.0
        f = 2.0 * np.sin(np.pi * c / 44100.0)
        high = x[i] - low - damp * band
        band += f * high
        low += f * band
        out[i] = low
    return out


ACID_PAT = [None, 0, 12, 0, None, 0, 15, 12, None, 0, 12, 7, None, 12, 10, 0]
ACID_ACC = {2, 6, 10, 13}
ACID_ROOT = {'F': 41, 'Dm': 38, 'Am': 45}


def acid(n0, n1, cut0=300, cut1=2200, reso=0.25):
    """16th acid line over bars [n0, n1) with cutoff opening cut0 -> cut1."""
    a, b = S(tn(n0)), S(tn(n1))
    n = b - a
    freq = np.full(n, 110.0)
    amp = np.zeros(n)
    fenv = np.zeros(n)
    step_n = S(STEP)
    for bar in range(n0, n1):
        root = ACID_ROOT[chord(bar)]
        for s, off in enumerate(ACID_PAT):
            if off is None:
                continue
            i0 = S(tn(bar, s)) - a
            i1 = min(n, i0 + step_n)
            k = np.arange(i1 - i0)
            freq[i0:i1] = midi(root + off)
            acc = s in ACID_ACC
            amp[i0:i1] = np.minimum(1, k / 60) * np.exp(-k / (SR * (0.09 if acc else 0.06))) * (1.0 if acc else 0.7)
            fenv[i0:i1] = np.exp(-k / (SR * 0.05)) * (1.6 if acc else 0.8)
    # slide smoothing of frequency
    freq = lp(freq, 60, 1)
    ramp = np.linspace(0, 1, n)
    cutoff = (cut0 * (cut1 / cut0) ** ramp) * (1 + fenv * 2.2)
    x = saw(freq, n) * 0.8
    y = svf_lp(x, cutoff, reso)
    y = np.tanh(y * 2.5 * amp) * 0.8
    y = hp(y, 90)
    out = st(y)
    out = delay(out, BEAT * 0.75, fb=0.3, wet=0.18)
    add(B['acid'], out, a)


# ------------------------------------------------------------------ helpers for patterns
def hats(n0, n1, closed=True, open_=True, g=1.0):
    for n in range(n0, n1):
        for s in range(16):
            if open_ and s % 4 == 2:
                add(B['hat'], hat(True), S(tn(n, s)), 0.55 * g)
            elif closed and s % 2 == 1:
                add(B['hat'], hat(False), S(tn(n, s)), 0.28 * g)


def claps(n0, n1, steps=(4, 12), g=1.0):
    c = clap()
    for n in range(n0, n1):
        for s in steps:
            add(B['clap'], c, S(tn(n, s)), 0.5 * g)


def stabs(n0, n1, steps=(2, 6, 10, 14), g=1.0):
    for n in range(n0, n1):
        x = stab(chord(n))
        for s in steps:
            add(B['stab'], x, S(tn(n, s)), 0.55 * g)


def pads(n0, n1, g=1.0, cutoff=1400):
    for n in range(n0, n1):
        x = chord_saw(chord(n), BAR + 0.25)
        x = fade(x, 0.06, 0.25)
        x = lp(x, cutoff)
        add(B['pad'], x, S(tn(n)), 0.45 * g)


def snare_roll(n0, bars, g=1.0):
    """accelerating snare roll over `bars` bars ending at bar n0+bars."""
    total = bars * 16
    for i in range(bars):
        n = n0 + i
        frac = i / bars
        div = 4 if frac < 0.25 else 2 if frac < 0.5 else 1 if frac < 0.75 else 0.5
        if bars <= 2:
            div = 2 if i == 0 else 1 if frac < 0.75 else 0.5
        for s in np.arange(0, 16, div):
            p = (i * 16 + s) / total
            x = snare(0.12, tone=180 + 220 * p)
            x = hp(x, 150 + 2500 * p ** 2)
            add(B['fx'], x, S(tn(n, s)), (0.25 + 0.75 * p ** 1.5) * 0.55 * g)


def sub_notes(n0, n1, g=1.0):
    for n in range(n0, n1):
        f = ROOT_HZ[chord(n)] * 2 if chord(n) == 'Dm' else ROOT_HZ[chord(n)]
        k = S(BAR)
        x = sine(f, k) * np.minimum(1, np.arange(k) / 800) * np.minimum(1, (k - np.arange(k)) / 2000)
        add(B['sub'], st(x), S(tn(n)), 0.35 * g)


# ------------------------------------------------------------------ anthem lead (drop 3)
LEAD = [   # 8th-note grid per bar, midi or None (= hold previous)
    [72, None, 69, None, 72, None, 77, 76],      # F
    [74, None, None, 69, None, 74, None, 77],    # Dm
    [76, None, None, 72, None, 69, None, 76],    # Am
    [74, 72, 71, None, 72, None, 69, None],      # Am
]


def lead(n0, n1, g=1.0, skip=()):
    """legato supersaw lead with short glide, 4-bar melody looped over bars [n0, n1)."""
    a, b = S(tn(n0)), S(tn(n1))
    n = b - a
    freq = np.zeros(n)
    gate = np.zeros(n)
    cur = None
    for bar in range(n0, n1):
        for e, note in enumerate(LEAD[(bar - n0) % 4]):
            i0, i1 = S(tn(bar, e * 2)) - a, S(tn(bar, e * 2 + 2)) - a
            if bar in skip:
                cur = None
                continue
            if note is not None:
                cur = note
                k = min(S(0.012), i1 - i0)
                gate[i0:i0 + k] = np.minimum(gate[i0:i0 + k], np.linspace(0.6, 1, k)) if i0 else 1
                gate[i0 + k:i1] = 1
            elif cur is not None:
                gate[i0:i1] = 1
            freq[i0:i1] = midi(cur) if cur is not None else freq[i0 - 1] if i0 else 440
    freq = np.where(freq > 0, freq, 440)
    freq = np.exp(lp(np.log(freq), 40, 1))                 # ~glide
    gate = lp(gate, 150, 1)
    x = supersaw(freq, n, voices=7, detune=0.28) + 0.5 * supersaw(freq / 2, n, voices=5, detune=0.2)
    x = soft(x * 1.5, 1.2) * gate[:, None]
    x = lp(hp(x, 250), 9000)
    x = delay(x, BEAT * 0.75, fb=0.3, wet=0.2)
    add(B['lead'], x, a, 0.5 * g)


SECTIONS = []


def section(name, n0, n1):
    SECTIONS.append({'name': name, 'bar0': n0, 'bar1': n1, 't0': round(tn(n0), 3), 't1': round(tn(n1), 3)})


# ================================================================== ARRANGEMENT
# --- 1. INTRO  bars 0-7  (pads of the original, filter opening, horns kick hits, vocal tease)
section('Intro', 0, 8)
x = OTH[S(src_bar(2)):S(src_bar(10))].copy()
x = sweep_filter(x, 550, 7000, 'lowpass')
x = fade(x, 0.8, 0.0)
add(B['oth'], x, S(tn(0)), 0.9)
for n in (0, 4):
    KICK.hit(tn(n), kick('horns', ROOT_HZ['F']), 0.85)
    add(B['crash'], crash(), S(tn(n)), 0.5 if n else 0.0)
# vocal tease "Lass mich frei" (first one of the chorus) with long reverb/delay
tease = VOC[S(src_time(43.40)):S(src_time(44.75))].copy()
tease = fade(tease, 0.01, 0.15)
tease = hp(tease, 250)
tease_fx = delay(reverb(tease, 3.0, 0.03, 0.55), BEAT * 1.5, fb=0.45, wet=0.5)
add(B['vocfx'], tease_fx, S(tn(1, 4)), 0.9)
add(B['vocfx'], tease_fx, S(tn(5, 4)), 0.9)
# bar 6: kicks on the beat, bar 7: 8ths -> 16ths roll into the verse
kbar(6, 'loop', gain=0.8)
roll(7, 'loop', 0, 8, 2, gain=0.85)
roll(7, 'loop', 8, 16, 1, gain=0.9, rise=5)
snare_roll(4, 4, g=0.8)
add(B['fx'], riser(4), S(tn(4)), 0.6)

# --- 2. VERSE 1 (HARDTEK)  bars 8-35  <- original bars 2-29 (+ build 36-39 <- 30-33)
section('Verse 1 - Hardtek', 8, 36)
stem_bars('voc', VOC, 2, 50, 8, pre=0.45, post=0.0, fout=0.01)     # verse 1 + chorus 1 in one piece
stem_bars('oth', OTH, 2, 34, 8, pre=0.0, gain=1.0)
add(B['crash'], crash(), S(tn(8)), 0.7)
add(B['fx'], impact(), S(tn(8)), 0.45)
for n in range(8, 36):
    if n in (23,):                       # breath: drop beat 4
        kbar(n, 'loop', steps=(0, 4, 8), gain=0.82)
    elif n == 31:                         # mini fill
        kbar(n, 'loop', steps=(0, 4, 8), gain=0.82)
        roll(n, 'loop', 12, 16, 1, gain=0.8, rise=3)
    else:
        kbar(n, 'loop', gain=0.82)
acid(8, 36, cut0=260, cut1=1800)
hats(8, 36, closed=False, open_=True, g=0.9)
hats(16, 36, closed=True, open_=False, g=0.8)
claps(16, 36, g=0.6)

# --- build into drop 1  bars 36-39
section('Build 1', 36, 40)
snare_roll(36, 4)
add(B['fx'], riser(4), S(tn(36)), 0.8)
add(B['fx'], pitch_riser(4), S(tn(36)), 0.8)
pads(36, 40, g=0.6, cutoff=900)
kbar(36, 'loop', steps=(0, 8), gain=0.75)
kbar(37, 'loop', steps=(0, 8), gain=0.75)
kbar(38, 'loop', steps=(0, 4, 8, 12), gain=0.8)
roll(39, 'zaag', 0, 8, 1, gain=0.8, rise=4)
roll(39, 'zaag', 8, 12, 0.5, gain=0.85, rise=7)           # 32nd "brrrt" before the stop

# --- 3. DROP 1 (UPTEMPO / FRENCHCORE)  bars 40-55  <- original chorus bars 34-49
section('Drop 1 - Uptempo/Frenchcore', 40, 56)
add(B['fx'], impact(), S(tn(40)), 0.8)
for n in range(40, 56):
    ph = (n - 40) % 4
    if ph == 3 and n in (43, 51):
        kbar(n, 'peep', steps=(0, 4, 8))
        roll(n, 'peep', 12, 16, 1, rise=5)
    elif ph == 3 and n in (47,):
        kbar(n, 'peep', steps=(0, 4, 8, 10))
        roll(n, 'peep', 12, 16, 0.5, rise=7)
    elif n == 55:
        kbar(n, 'peep', steps=(0, 4, 8))
        roll(n, 'peep', 12, 16, 0.5, gain=0.9, rise=12)
    else:
        kbar(n, 'peep')
for n in (40, 44, 48, 52):
    add(B['crash'], crash(), S(tn(n)), 0.75)
stabs(40, 56)
hats(40, 56)
claps(40, 56, g=0.8)
stem_bars('oth', OTH, 34, 50, 40, gain=0.55)
for n in (47, 55):                      # screech answer on fills
    add(B['screech'], screech(69, 0.3), S(tn(n, 12)), 0.5)

# --- 4. BREAK  bars 56-67  <- original bars 66-77, build 68-71 <- 78-81
section('Break', 56, 68)
stem_bars('voc', VOC, 66, 98, 56, pre=0.12, fout=0.01)      # break + drop 2 vocals in one piece
stem_bars('oth', OTH, 66, 82, 56, gain=0.95)
KICK.hit(tn(56), kick('horns', ROOT_HZ['F']), 0.9)
add(B['crash'], crash(3.0), S(tn(56)), 0.8)
add(B['fx'], impact(), S(tn(56)), 0.5)
pads(56, 72, g=0.9, cutoff=1500)
sub_notes(56, 68, g=0.8)
for n in range(64, 68):                 # half-time pulse coming back
    KICK.hit(tn(n), kick('zaag', ROOT_HZ[chord(n)]), 0.55, maxlen=BEAT * 2)
    KICK.hit(tn(n, 8), kick('zaag', ROOT_HZ[chord(n)]), 0.55, maxlen=BEAT * 2)

section('Build 2', 68, 72)
snare_roll(68, 4, g=1.0)
add(B['fx'], riser(4), S(tn(68)), 0.85)
add(B['fx'], pitch_riser(4, 57, 84), S(tn(68)), 0.8)
add(B['fx'], siren(2 * BAR), S(tn(70)), 0.9)
kbar(68, 'zaag', steps=(0, 8), gain=0.7)
kbar(69, 'zaag', steps=(0, 4, 8, 12), gain=0.75)
roll(70, 'zaag', 0, 16, 2, gain=0.8, rise=3)
roll(71, 'zaag', 0, 8, 1, gain=0.85, rise=5)
roll(71, 'feedback', 8, 9, 1, gain=0.8)                 # feedback screech then silence -> drop

# --- 5. DROP 2 (WARSTYLE)  bars 72-87  <- original chorus 2 bars 82-97
section('Drop 2 - Warstyle', 72, 88)
add(B['fx'], impact(), S(tn(72)), 0.9)
add(B['fx'], siren(2 * BAR, 380, 900), S(tn(72)), 0.6)
WAR = [
    (0, 4, 8, 12),
    (0, 4, 7, 8, 12, 14),
    (0, 4, 8, 10, 12),
    (0, 3, 6, 8, 12),
]
for n in range(72, 88):
    ph = (n - 72) % 4
    if n in (79,):
        kbar(n, 'zaag', steps=(0, 4))
        KICK.hit(tn(n, 8), kick('feedback', ROOT_HZ[chord(n)]), 0.9)   # feedback tail rings
    elif n == 83:
        kbar(n, 'zaag', steps=(0, 3, 6, 8))
        roll(n, 'zaag', 10, 16, 0.5, rise=-5)
    elif n == 87:
        KICK.hit(tn(n), kick('horns', ROOT_HZ['Am']), 1.0)              # horns kick rings out the bar
    else:
        kbar(n, 'zaag', steps=WAR[ph])
for n in (72, 80):
    add(B['crash'], crash(), S(tn(n)), 0.8)
claps(72, 87, g=0.9)
hats(72, 87, closed=True, open_=True, g=1.0)
stem_bars('oth', OTH, 82, 98, 72, gain=0.45)
for n in (75, 83):
    for s, nt in ((10, 72), (12, 69), (14, 64)):
        add(B['screech'], screech(nt, 0.2, -7), S(tn(n, s)), 0.55)
stabs(76, 80, steps=(2, 6, 10, 14), g=0.7)
stabs(84, 87, steps=(2, 6, 10, 14), g=0.7)

# --- 6. DROP 3 (FINAL - frenchcore madness)  bars 88-103 <- original hard drop bars 98-113
section('Drop 3 - Final', 88, 104)
stem_bars('voc', VOC, 98, 114, 88, pre=0.05, gain=1.0, fout=0.3)
stem_bars('oth', OTH, 98, 114, 88, gain=0.5)
add(B['fx'], impact(), S(tn(88)), 0.9)
for n in range(88, 104):
    ph = (n - 88) % 4
    name = 'peep' if n < 96 else 'zaag'
    if n in (93, 94, 95):
        continue                          # pitch-dive drop loop below
    if ph == 3 and n != 103:
        kbar(n, name, steps=(0, 4, 8))
        for i, s in enumerate(np.arange(12, 16, 1)):        # loop-slice roll (uptempo kick shapes)
            idx = (n * 4 + i) % 32
            KICK.hit(tn(n, s), kick('loop', ROOT_HZ[chord(n)], 2 * i, idx=idx), 0.9)
    elif n == 103:
        kbar(n, name, steps=(0, 4, 8))
        roll(n, 'zaag', 12, 16, 0.5, rise=12)
    else:
        kbar(n, name)
for n in (88, 92, 96, 100):
    add(B['crash'], crash(), S(tn(n)), 0.8)
stabs(88, 104, g=0.6)
lead(88, 104, skip=(93, 94, 95))
claps(88, 104)
hats(88, 104, g=1.1)
add(B['fx'], siren(2 * BAR, 450, 1000), S(tn(96)), 0.5)

# drop-loop (the supplied 210-BPM "uptempo drop", retuned to A / 200 BPM): it is one long gliding,
# distorted kick tail (A2 -> A1), so it gets 3 kick-less bars of its own (93-95) as a pitch-dive moment
if os.path.exists('src/drop_loop_200_A.wav'):
    dl = load('src/drop_loop_200_A.wav')
    seg = fade(dl[:S(3 * BAR)], 0.002, 0.03)
    seg = soft(seg * 2.6, 1.3) * 0.95
    add(B['loopfx'], seg, S(tn(93)), 1.0)
    GHOST.extend(S(tn(93, s)) for s in range(0, 48, 4))
    roll(95, 'zaag', 12, 16, 1, gain=0.9, rise=7)
    add(B['fx'], riser(2), S(tn(94)), 0.6)

# --- 7. OUTRO  bars 104-111
section('Outro', 104, 112)
for n in range(104, 108):
    kbar(n, 'zaag', gain=0.9 - 0.1 * (n - 104))
KICK.hit(tn(108), kick('horns', ROOT_HZ['F']), 0.9)
x = OTH[S(src_bar(2)):S(src_bar(10))].copy()
x = sweep_filter(x, 6000, 250, 'lowpass')
x = fade(x, 0.05, 3.0)
add(B['oth'], x, S(tn(104)), 0.8)
add(B['vocfx'], tease_fx, S(tn(105, 4)), 0.8)
add(B['vocfx'], tease_fx, S(tn(108, 4)), 0.6)
pads(108, 112, g=0.5, cutoff=900)
add(B['crash'], crash(3.0), S(tn(108)), 0.7)

# ================================================================== MIX
kick_bus, onsets = KICK.render()
onsets = sorted(onsets + GHOST)
duck = duck_curve(onsets, N, depth=0.9, attack=0.002, hold=0.03, release=0.2)[:, None]
duck_soft = 1 - (1 - duck) * 0.55
duck_voc = 1 - (1 - duck) * 0.22

# vocals: clean-up, presence, light compression, reverb + delay send
v = B['voc']
v = hp(v, 110, 2)
v = peq(v, 3200, 2.5, 0.9)
v = peq(v, 250, -2.0, 1.0)
env = follower(v, 0.005, 0.15)
gr = np.minimum(1, (np.maximum(env, 1e-6) / 0.12) ** (-0.4))      # ~1.7:1 above threshold
v = v * gr[:, None] * 1.25
vsend = hp(v, 400)
vrev = reverb(vsend, 2.2, 0.03, 1.0) * 0.16
vdel = delay(vsend, BEAT * 0.75, fb=0.35, wet=1.0) - st(vsend)
vocal_bus = v + (vrev + vdel * 0.08) * duck_soft + B['vocfx']

oth = hp(B['oth'], 160, 2) * duck_soft
stab_bus = reverb(B['stab'], 1.2, 0.01, 0.2) * duck
lead_bus = reverb(B['lead'], 2.0, 0.02, 0.25) * duck_soft
pad_bus = reverb(B['pad'], 2.5, 0.02, 0.35) * duck
acid_bus = B['acid'] * duck
sub_bus = B['sub'] * duck
fx_bus = B['fx'] + B['crash'] * 0.8 + B['screech']
perc = B['hat'] * 0.8 + B['clap']
loopfx = B['loopfx']

stems = {
    'kick': kick_bus * 0.72,
    'loopfx': loopfx * 0.9,
    'vocals': vocal_bus * 3.0,
    'other': oth * 1.0,
    'stab': stab_bus * 3.0,
    'lead': lead_bus * 1.0,
    'pad': pad_bus * 1.1,
    'acid': acid_bus * 0.30,
    'sub': sub_bus * 0.3,
    'fx': fx_bus * 0.55,
    'perc': perc * 0.7,
}
mix = sum(stems.values())
if os.environ.get('DEBUG_BUSES'):
    for k in ('kick', 'vocals', 'other'):
        sf.write(f'out/bus_{k}.wav', stems[k].astype(np.float32), SR, subtype='FLOAT')

os.makedirs('out', exist_ok=True)
sf.write('out/mix_premaster.wav', mix.astype(np.float32), SR, subtype='FLOAT')
np.save('out/onsets.npy', np.array(onsets))
with open('out/sections.json', 'w') as f:
    json.dump({'bpm': BPM, 'sections': SECTIONS, 'kick_tail_hz': {k: round(v, 1) for k, v in KHZ.items()}}, f, indent=1)

# per-section / per-stem loudness report (LUFS, K-weighted)
import pyloudnorm as pyln
_m = pyln.Meter(SR)
print(f"{'section':30s}" + ''.join(f"{k:>8s}" for k in stems))
for sec in SECTIONS:
    a, b = S(sec['t0']), S(sec['t1'])
    row = ''
    for k, x in stems.items():
        seg = x[a:b]
        row += f"{_m.integrated_loudness(seg) if np.abs(seg).max() > 1e-4 else -99:8.1f}"
    print(f"{sec['name']:30s}" + row)
print('premaster peak', np.abs(mix).max())
