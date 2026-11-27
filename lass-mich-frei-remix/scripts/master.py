"""Master out/mix_premaster.wav -> out/remix_master.wav (+ mp3) at a hard-dance loudness.

Chain: sub-sonic cut -> tilt EQ -> clipper (tanh) -> lookahead limiter, gain searched to hit TARGET LUFS.
"""
import sys, os, json, subprocess
import numpy as np
import soundfile as sf
import pyloudnorm as pyln
from scipy import signal

sys.path.insert(0, os.path.dirname(__file__))
from dsp import SR, hp, shelf, peq, limiter  # noqa

TARGET = float(sys.argv[1]) if len(sys.argv) > 1 else -6.5
CEIL = 10 ** (-1.0 / 20)
NAME = sys.argv[2] if len(sys.argv) > 2 else 'FEDX - Lass mich frei (Jason Remix) [Uptempo Warstyle Version]'

x, sr = sf.read('out/mix_premaster.wav', dtype='float64')
x = hp(x, 28, 2)
x = shelf(x, 9000, 1.5, 'high')
x = peq(x, 380, -1.0, 0.8)
meter = pyln.Meter(SR)


def chain(g, os_=2):
    y = signal.resample_poly(x * g, os_, 1, axis=0)  # oversampled clip + limit -> true-peak safe
    y = np.tanh(y / 0.9) * 0.9                       # clipper: shaves kick peaks
    import dsp
    dsp_sr = dsp.SR
    dsp.SR = SR * os_
    try:
        y, _ = limiter(y, ceiling=CEIL, lookahead=0.003, release=0.05)
    finally:
        dsp.SR = dsp_sr
    return signal.resample_poly(y, 1, os_, axis=0)


lo, hi = 0.1, 4.0
for _ in range(14):
    g = np.sqrt(lo * hi)
    L = meter.integrated_loudness(chain(g))
    if L > TARGET:
        hi = g
    else:
        lo = g
y = chain(g)
_end = np.where(np.abs(y).max(1) > 10 ** (-70 / 20))[0][-1] + int(0.3 * SR)   # trim silent tail
y = y[:_end]
_f = int(0.4 * SR)
y[-_f:] *= np.linspace(1, 0, _f)[:, None] ** 2
L = meter.integrated_loudness(y)
tp = np.abs(signal.resample_poly(y, 4, 1, axis=0)).max()
print(f'gain {g:.3f}  integrated {L:.2f} LUFS  sample peak {20*np.log10(np.abs(y).max()):.2f} dBFS  true peak {20*np.log10(tp):.2f} dBTP')

sf.write('out/remix_master.wav', y.astype(np.float32), SR, subtype='PCM_24')
mp3 = f'out/{NAME}.mp3'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', 'out/remix_master.wav', '-c:a', 'libmp3lame', '-b:a', '320k',
                '-metadata', f'title=Lass mich frei (Jason Remix) [Uptempo Warstyle Version]',
                '-metadata', 'artist=FEDX', '-metadata', 'album_artist=Jason Remix', '-metadata', 'TBPM=200',
                mp3], check=True)

# report: short-term loudness per section
sec = json.load(open('out/sections.json'))['sections']
for s in sec:
    a, b = int(s['t0'] * SR), int(s['t1'] * SR)
    seg = y[a:b]
    l = meter.integrated_loudness(seg) if b - a > SR * 0.5 else float('nan')
    print(f"{s['name']:30s} {s['t0']:7.2f}-{s['t1']:7.2f}s  {l:6.1f} LUFS  peak {20*np.log10(np.abs(seg).max()+1e-9):6.2f}")
print('mp3:', mp3)
