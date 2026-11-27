import sys, numpy as np, librosa
path = sys.argv[1]
y, sr = librosa.load(path, sr=22050, mono=True)
dur = len(y)/sr
oenv = librosa.onset.onset_strength(y=y, sr=sr)
tempo, beats = librosa.beat.beat_track(onset_envelope=oenv, sr=sr)
bt = librosa.frames_to_time(beats, sr=sr)
print(f"dur {dur:.2f}s tempo {np.atleast_1d(tempo)[0]:.2f} nbeats {len(bt)}")
# tempogram candidates
tg = librosa.feature.tempogram(onset_envelope=oenv, sr=sr)
ac = tg.mean(axis=1); freqs = librosa.tempo_frequencies(tg.shape[0], sr=sr)
idx = np.argsort(ac[1:])[::-1][:8]+1
print("tempo cands", [(round(freqs[i],1), round(ac[i],3)) for i in idx if 60<freqs[i]<240])
# key via chroma
chroma = librosa.feature.chroma_cqt(y=y, sr=sr).mean(axis=1)
maj = np.array([6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88])
mnr = np.array([6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17])
names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
sc=[]
for i in range(12):
    sc.append((np.corrcoef(np.roll(maj,i),chroma)[0,1], names[i]+' major'))
    sc.append((np.corrcoef(np.roll(mnr,i),chroma)[0,1], names[i]+' minor'))
sc.sort(reverse=True); print("key", sc[:4])
print("chroma", dict(zip(names, np.round(chroma/chroma.max(),2))))
# RMS per second
rms = librosa.feature.rms(y=y, frame_length=sr, hop_length=sr)[0]
print("rms/sec", ' '.join(f"{20*np.log10(r+1e-9):.0f}" for r in rms))
print("first beats", np.round(bt[:16],3))
