"""Measure the pitch of every on-beat kick in out/bus_kick.wav against the bar's chord root."""
import numpy as np, soundfile as sf
SR = 44100; BAR = 1.2; BEAT = 0.3
k, _ = sf.read('out/bus_kick.wav'); km = k.mean(1)
on = set(int(round(o / (SR * 0.075))) for o in np.load('out/onsets.npy'))   # in 16th steps
CH = ['F', 'Dm', 'Am', 'Am']; EXP = {'F': 43.65, 'Dm': 36.71, 'Am': 55.0}
def f0(seg):
    sp = np.abs(np.fft.rfft(seg * np.hanning(len(seg)), n=1 << 17)); fr = np.fft.rfftfreq(1 << 17, 1 / SR)
    msk = (fr > 28) & (fr < 130); return fr[msk][np.argmax(sp[msk])]
rows, devs = [], []
for n in range(112):
    cells = []
    for b in range(4):
        step = n * 16 + b * 4
        if step not in on or (step + 1) in on or (step + 2) in on:   # skip rolls
            cells.append('  .  '); continue
        t = n * BAR + b * BEAT
        seg = km[int((t + 0.06) * SR):int((t + 0.29) * SR)]
        c = 1200 * np.log2(f0(seg) / EXP[CH[n % 4]])
        c = (c + 600) % 1200 - 600
        devs.append(c); cells.append(f"{c:+5.0f}")
    rows.append(f"{n:3d} {CH[n%4]:2s} " + ' '.join(cells))
print('\n'.join(rows))
d = np.abs(np.array(devs)); print(f"kicks measured {len(d)}  median |dev| {np.median(d):.0f} c  >30c: {(d>30).sum()}  >60c: {(d>60).sum()}")
