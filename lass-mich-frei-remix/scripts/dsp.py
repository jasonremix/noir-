"""Small DSP toolbox for the remix: filters, synths, FX, mixing helpers.

All audio is float32/float64 numpy, stereo arrays are shape (n, 2), SR = 44100.
"""
import numpy as np
from scipy import signal

SR = 44100
rng = np.random.default_rng(1984)


# ---------------------------------------------------------------- basics
def st(x):
    """mono -> stereo"""
    return np.stack([x, x], 1) if x.ndim == 1 else x


def mono(x):
    return x.mean(1) if x.ndim == 2 else x


def db(x):
    return 10 ** (x / 20)


def silence(sec):
    return np.zeros((int(round(sec * SR)), 2))


def fade(x, fin=0.0, fout=0.0, shape='lin'):
    x = x.copy()
    n = len(x)
    if fin > 0:
        k = min(n, int(fin * SR))
        r = np.linspace(0, 1, k)
        if shape == 'exp':
            r = r ** 2
        x[:k] *= r[:, None] if x.ndim == 2 else r
    if fout > 0:
        k = min(n, int(fout * SR))
        r = np.linspace(1, 0, k)
        if shape == 'exp':
            r = r ** 2
        x[n - k:] *= r[:, None] if x.ndim == 2 else r
    return x


def add(dst, src, at, gain=1.0):
    """mix src into dst starting at sample `at` (clipped to dst)."""
    at = int(round(at))
    if at < 0:
        src = src[-at:]
        at = 0
    n = min(len(src), len(dst) - at)
    if n > 0:
        dst[at:at + n] += src[:n] * gain
    return dst


# ---------------------------------------------------------------- filters
def _sos(kind, f, order=2):
    f = np.clip(np.atleast_1d(f), 10, SR / 2 - 100)
    return signal.butter(order, f if len(f) > 1 else f[0], btype=kind, fs=SR, output='sos')


def hp(x, f, order=2):
    return signal.sosfilt(_sos('highpass', f, order), x, axis=0)


def lp(x, f, order=2):
    return signal.sosfilt(_sos('lowpass', f, order), x, axis=0)


def bp(x, lo, hi, order=2):
    return signal.sosfilt(_sos('bandpass', [lo, hi], order), x, axis=0)


def peq(x, f, gain_db, q=1.0):
    """RBJ peaking EQ"""
    A = 10 ** (gain_db / 40)
    w = 2 * np.pi * f / SR
    al = np.sin(w) / (2 * q)
    b = np.array([1 + al * A, -2 * np.cos(w), 1 - al * A])
    a = np.array([1 + al / A, -2 * np.cos(w), 1 - al / A])
    return signal.lfilter(b / a[0], a / a[0], x, axis=0)


def shelf(x, f, gain_db, kind='low'):
    A = 10 ** (gain_db / 40)
    w = 2 * np.pi * f / SR
    al = np.sin(w) / 2 * np.sqrt(2)
    c = np.cos(w)
    sA = 2 * np.sqrt(A) * al
    if kind == 'low':
        b = [A * ((A + 1) - (A - 1) * c + sA), 2 * A * ((A - 1) - (A + 1) * c), A * ((A + 1) - (A - 1) * c - sA)]
        a = [(A + 1) + (A - 1) * c + sA, -2 * ((A - 1) + (A + 1) * c), (A + 1) + (A - 1) * c - sA]
    else:
        b = [A * ((A + 1) + (A - 1) * c + sA), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - sA)]
        a = [(A + 1) - (A - 1) * c + sA, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - sA]
    b, a = np.array(b), np.array(a)
    return signal.lfilter(b / a[0], a / a[0], x, axis=0)


def sweep_filter(x, f0, f1, kind='lowpass', block=512, curve='exp'):
    """time-varying 2-pole filter, cutoff moving f0 -> f1 over the clip."""
    n = len(x)
    y = np.zeros_like(x)
    nb = int(np.ceil(n / block))
    zi = None
    for i in range(nb):
        t = i / max(1, nb - 1)
        f = f0 * (f1 / f0) ** t if curve == 'exp' else f0 + (f1 - f0) * t
        sos = _sos(kind, f, 2)
        if zi is None:
            zi = np.zeros((sos.shape[0], 2) + x.shape[1:])
        seg = x[i * block:(i + 1) * block]
        out, zi = signal.sosfilt(sos, seg, axis=0, zi=zi)
        y[i * block:(i + 1) * block] = out
    return y


# ---------------------------------------------------------------- saturation
def soft(x, drive=1.0):
    return np.tanh(x * drive) / np.tanh(drive)


def hardclip(x, ceil=1.0):
    return np.clip(x, -ceil, ceil)


# ---------------------------------------------------------------- pitch / resample
def resample_pitch(x, semis):
    """turntable-style pitch shift (changes length)."""
    r = 2 ** (semis / 12)
    n = int(round(len(x) / r))
    return signal.resample_poly(x, 1000, int(round(1000 * r)), axis=0)[:n] if n > 0 else x[:0]


def varispeed(x, rate_curve):
    """read through x at a time-varying rate (array per output sample)."""
    pos = np.cumsum(rate_curve)
    pos = pos[pos < len(x) - 1]
    i = pos.astype(int)
    f = (pos - i)[:, None] if x.ndim == 2 else pos - i
    return x[i] * (1 - f) + x[i + 1] * f


# ---------------------------------------------------------------- envelopes
def env_adsr(n, a=0.002, d=0.1, s=0.0, r=0.05, hold=None):
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    e = np.zeros(n)
    k = 0
    seg = np.linspace(0, 1, max(1, a))[:n]
    e[:len(seg)] = seg
    k = len(seg)
    seg = np.linspace(1, s, max(1, d))[:n - k]
    e[k:k + len(seg)] = seg
    k += len(seg)
    if hold is not None:
        h = int(hold * SR) - k
        if h > 0:
            e[k:k + h] = s
            k += h
        seg = np.linspace(s, 0, max(1, r))[:n - k]
        e[k:k + len(seg)] = seg
        e[k + len(seg):] = 0
    else:
        e[k:] = s
    return e


# ---------------------------------------------------------------- oscillators
def phase(freq, n):
    f = np.broadcast_to(np.asarray(freq, dtype=float), (n,))
    return np.cumsum(f) / SR


def saw(freq, n, ph0=0.0):
    """band-limited-ish saw via PolyBLEP"""
    f = np.broadcast_to(np.asarray(freq, dtype=float), (n,))
    dt = f / SR
    p = (np.cumsum(dt) + ph0) % 1.0
    y = 2 * p - 1
    # polyblep
    m = p < dt
    t = p[m] / dt[m]
    y[m] -= t + t - t * t - 1
    m = p > 1 - dt
    t = (p[m] - 1) / dt[m]
    y[m] -= t * t + t + t + 1
    return y


def supersaw(freq, n, voices=7, detune=0.25, width=1.0):
    """stereo detuned saw stack"""
    out = np.zeros((n, 2))
    offs = np.linspace(-1, 1, voices)
    for i, o in enumerate(offs):
        ratio = 2 ** (o * detune / 12)
        v = saw(np.asarray(freq) * ratio, n, ph0=rng.random())
        pan = 0.5 + 0.5 * o * width
        g = 1.0 if i == voices // 2 else 0.8
        out[:, 0] += v * g * np.cos(pan * np.pi / 2)
        out[:, 1] += v * g * np.sin(pan * np.pi / 2)
    return out / voices * 1.6


def sine(freq, n, ph0=0.0):
    return np.sin(2 * np.pi * (phase(freq, n) + ph0))


def noise(n, stereo=True):
    return rng.standard_normal((n, 2) if stereo else n) * 0.3


# ---------------------------------------------------------------- reverb / delay
_ir_cache = {}


def reverb(x, decay=1.8, pre=0.01, wet=0.3, damp=6000, width=1.0):
    key = (decay, pre, damp)
    if key not in _ir_cache:
        n = int(SR * decay * 1.5)
        t = np.arange(n) / SR
        e = np.exp(-6.9 * t / decay)
        ir = rng.standard_normal((n, 2)) * e[:, None]
        ir = lp(ir, damp)
        ir[: int(0.003 * SR)] *= np.linspace(0, 1, int(0.003 * SR))[:, None]
        ir = np.concatenate([np.zeros((int(pre * SR), 2)), ir])
        ir /= np.sqrt((ir ** 2).sum(0)).mean()
        _ir_cache[key] = ir
    ir = _ir_cache[key]
    xs = st(x)
    wetsig = np.stack([signal.fftconvolve(xs[:, c], ir[:, c])[: len(xs)] for c in range(2)], 1)
    if width != 1.0:
        m = wetsig.mean(1, keepdims=True)
        wetsig = m + (wetsig - m) * width
    return xs * (1 - wet) + wetsig * wet


def delay(x, t, fb=0.35, wet=0.25, pingpong=True, hpf=300, lpf=6000):
    xs = st(x)
    d = int(t * SR)
    out = np.zeros_like(xs)
    tap = hp(lp(xs, lpf), hpf)
    g = 1.0
    for k in range(1, 8):
        g *= fb if k > 1 else 1.0
        if g < 0.01:
            break
        sig = tap * g
        if pingpong and k % 2 == 1:
            sig = sig[:, ::-1]
        add(out, sig, d * k)
    return xs + out * wet


# ---------------------------------------------------------------- dynamics
def follower(x, attack=0.001, release=0.08):
    """peak envelope follower on mono abs signal"""
    a = np.exp(-1 / (attack * SR))
    r = np.exp(-1 / (release * SR))
    x = np.abs(mono(x))
    # vectorised-ish via lfilter on release, then max with instant attack approx
    y = np.zeros_like(x)
    prev = 0.0
    # chunked python loop is too slow for minutes of audio -> use decimated envelope
    dec = 32
    xd = x[: len(x) // dec * dec].reshape(-1, dec).max(1)
    ad = np.exp(-1 / (attack * SR / dec))
    rd = np.exp(-1 / (release * SR / dec))
    yd = np.zeros_like(xd)
    for i, v in enumerate(xd):
        c = ad if v > prev else rd
        prev = c * prev + (1 - c) * v
        yd[i] = prev
    y[: len(yd) * dec] = np.repeat(yd, dec)
    y[len(yd) * dec:] = prev
    return y


def duck_curve(onsets, n, depth=0.85, attack=0.004, hold=0.02, release=0.18, shape=2.0):
    """sidechain gain curve from kick onset sample positions."""
    g = np.ones(n)
    a, h, r = int(attack * SR), int(hold * SR), int(release * SR)
    seg = np.concatenate([
        np.linspace(1, 1 - depth, max(1, a)),
        np.full(h, 1 - depth),
        1 - depth * (1 - np.linspace(0, 1, r) ** (1 / shape)) ,
    ])
    for o in onsets:
        o = int(o)
        if o >= n:
            continue
        k = min(len(seg), n - o)
        g[o:o + k] = np.minimum(g[o:o + k], seg[:k])
    return g


def limiter(x, ceiling=0.97, lookahead=0.004, release=0.06):
    """lookahead brickwall limiter (stereo-linked)."""
    la = int(lookahead * SR)
    peak = np.abs(x).max(1)
    # running max over lookahead window
    from scipy.ndimage import maximum_filter1d
    pk = maximum_filter1d(peak, size=2 * la + 1, origin=0)
    gain_target = np.minimum(1.0, ceiling / np.maximum(pk, 1e-9))
    # smooth: instant down, release up (decimated loop)
    dec = 16
    gt = gain_target[: len(gain_target) // dec * dec].reshape(-1, dec).min(1)
    rd = np.exp(-1 / (release * SR / dec))
    g = np.empty_like(gt)
    prev = 1.0
    for i, v in enumerate(gt):
        prev = v if v < prev else rd * prev + (1 - rd) * v
        g[i] = prev
    gain = np.ones(len(x))
    gain[: len(g) * dec] = np.repeat(g, dec)
    gain[len(g) * dec:] = prev
    # smooth the staircase and keep it below target
    gain = np.minimum(signal.lfilter([1 / dec] * dec, [1], gain), gain_target)
    gain = np.minimum(gain, maximum_filter1d(gain, 1))
    y = x * gain[:, None]
    return np.clip(y, -ceiling, ceiling), gain
