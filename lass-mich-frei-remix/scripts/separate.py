# Stem separation with Demucs (htdemucs); writes src/stems/{drums,bass,other,vocals}.wav
import sys, numpy as np, soundfile as sf, torch
from demucs.pretrained import get_model
from demucs.apply import apply_model
torch.set_num_threads(4)
name = sys.argv[1] if len(sys.argv) > 1 else 'htdemucs'
model = get_model(name); model.eval()
y, sr = sf.read('src/original.wav', dtype='float32')
assert sr == model.samplerate, (sr, model.samplerate)
wav = torch.from_numpy(y.T.copy())
ref = wav.mean(0); wav = (wav - ref.mean()) / ref.std()
with torch.no_grad():
    out = apply_model(model, wav[None], device='cpu', shifts=1, split=True, overlap=0.25, progress=True)[0]
out = out * ref.std() + ref.mean()
import os; os.makedirs('src/stems', exist_ok=True)
for s, src in zip(model.sources, out):
    sf.write(f'src/stems/{s}.wav', src.numpy().T, sr, subtype='FLOAT')
    print(s, float(src.abs().max()))
