# /// script
# requires-python = ">=3.10"
# dependencies = ["piper-tts>=1.3"]
# ///
"""Temp-Sprecher (Layout-VO) für den Trailer: eine synthetische deutsche Stimme (Piper, Stimme
"Thorsten", CC0), Satz für Satz. Platzhalter, bis ein echter Sprecher aufgenommen ist.

    uv run jason-remix-trailer/audio/vo_gen.py <pfad/zu/de_DE-thorsten-high.onnx>

Schreibt jason-remix-trailer/audio/vo/raw/<id>.wav (22,05 kHz mono). score.py platziert die Sätze
auf dem Beat-Raster und bearbeitet sie (Tonhöhe, EQ, Kompression, Raum).

"Jason Remix" wird englisch ausgesprochen: die deutsche Phonemisierung würde "Jahson" sagen,
deshalb steht im TTS-Text die Lautschrift "Dschäjßen Riemix" (der Bildtext bleibt "Jason Remix").
"""
import json
import sys
import wave
from pathlib import Path

from piper import PiperVoice, SynthesisConfig

HERE = Path(__file__).resolve().parent
LINES = json.loads((HERE / "vo_script.json").read_text(encoding="utf-8"))


def main():
    if len(sys.argv) < 2:
        sys.exit("usage: vo_gen.py <de_DE-thorsten-high.onnx>")
    voice = PiperVoice.load(sys.argv[1])
    out = HERE / "vo" / "raw"
    out.mkdir(parents=True, exist_ok=True)
    for ln in LINES:
        cfg = SynthesisConfig(length_scale=ln.get("pace", 1.22), noise_scale=0.55, noise_w_scale=0.75)
        f = out / f"{ln['id']}.wav"
        with wave.open(str(f), "wb") as wf:
            voice.synthesize_wav(ln["tts"], wf, syn_config=cfg)
        with wave.open(str(f)) as wf:
            dur = wf.getnframes() / wf.getframerate()
        print(f"{ln['id']:4s} {dur:5.2f}s  {ln['text']}")


if __name__ == "__main__":
    main()
