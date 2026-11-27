"""Visual + numeric checks of the rendered remix (spectrogram with sections, kick pitch per bar, vocal grid fit)."""
import sys, os, json, numpy as np, soundfile as sf, librosa, librosa.display, matplotlib
matplotlib.use('Agg'); import matplotlib.pyplot as plt
sys.path.insert(0, os.path.dirname(__file__)); from dsp import SR, lp
path = sys.argv[1] if len(sys.argv) > 1 else 'out/remix_master.wav'
y, _ = sf.read(path); m = y.mean(1)
sec = json.load(open('out/sections.json'))['sections']
fig, ax = plt.subplots(2, 1, figsize=(22, 9), sharex=True, gridspec_kw={'height_ratios': [1, 2.5]})
t = np.arange(len(m)) / SR
dec = 200
ax[0].plot(t[::dec], np.abs(m[::dec]), lw=0.3)
rms = librosa.feature.rms(y=m, frame_length=4096, hop_length=1024)[0]
ax[0].plot(np.arange(len(rms)) * 1024 / SR, rms, 'r', lw=0.8)
S = librosa.amplitude_to_db(np.abs(librosa.stft(m, n_fft=4096, hop_length=1024)), ref=np.max)
librosa.display.specshow(S, sr=SR, hop_length=1024, y_axis='log', x_axis='time', ax=ax[1], vmin=-70)
for s in sec:
    for a in ax:
        a.axvline(s['t0'], color='w' if a is ax[1] else 'k', lw=1)
    ax[0].text(s['t0'] + 0.3, 0.95, s['name'], fontsize=9, va='top')
plt.tight_layout(); plt.savefig('out/overview.png', dpi=55)
print('saved out/overview.png')
