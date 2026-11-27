# FEDX – Lass mich frei (Jason Remix) · Uptempo / Warstyle / Frenchcore / Hardtek

Remix auf **200 BPM, A-Moll** (Original: 184 BPM, A-Moll, Akkordloop F – Dm – Am – Am), 2:16, gemastert auf −6,5 LUFS integrated (Drops ≈ −5 LUFS) bei −0,7 dBTP.
Der Remix ist komplett Code: Stems trennen, auf 200 BPM strecken, Arrangement, Kicks, Synths, Mix und Master laufen per Skript.

## Arrangement

| Takte (200 BPM) | Zeit | Teil | Was passiert |
|---|---|---|---|
| 0–7 | 0:00 | Intro | Original-Instrumental mit öffnendem Filter, Horns-Kick-Hits, „Lass mich frei“-Tease mit Hall/Delay, Kick-Roll |
| 8–35 | 0:10 | Verse 1 · **Hardtek** | Strophe 1 über Uptempo-Loop-Kick, 303-Acid-Line (16tel), Offbeat-Hats, Claps |
| 36–39 | 0:43 | Build 1 | Snare-Roll, Noise- und Pitch-Riser, Zaag-32tel-Roll |
| 40–55 | 0:48 | Drop 1 · **Uptempo/Frenchcore** | Refrain über Peep-Kick (folgt den Akkorden F–D–A–A), Offbeat-Supersaw-Stabs, Kick-Rolls, Screech |
| 56–67 | 1:07 | Break | Strophe 2 (2. Hälfte) mit Pads, Sub, Half-Time-Kicks |
| 68–71 | 1:22 | Build 2 | Snare-Roll, Riser, Luftschutz-Sirene, Feedback-Kick-Screech, Stop |
| 72–87 | 1:26 | Drop 2 · **Warstyle** | Refrain 2 über Zaag-Kick mit synkopierten War-Patterns, Sirene, Screeches, Feedback- und Horns-Kick |
| 88–103 | 1:46 | Drop 3 · Final | Die Shouts aus dem Original-Drop, Supersaw-Anthem-Lead, Loop-Slice-Rolls, 3 Takte Pitch-Dive mit dem Uptempo-Drop-Loop |
| 104–111 | 2:05 | Outro | Kicks, Filter schließt, Horns-Kick, Vocal-Echo |

## Kicks (alle gelieferten Samples sind drin)

Jede Kick wird per Resampling so gestimmt, dass ihr *hörbarer* Teil (die ersten 0,3 s, so lang dauert ein Beat bei 200 BPM) auf dem Grundton des Takts liegt: F1 · D1 · A1.
Das Tuning wird iterativ gemessen (`scripts/check_kicks.py`: Median-Abweichung 4 Cent).

- `xtra-raw-zaag-kick` → Warstyle-Drop, Rolls, Outro
- `piercing-peep-kick` → Uptempo/Frenchcore-Drop 1 und Drop 3 (erste Hälfte)
- `hard-uptempo-kick_217bpm` → in 32 Einzel-Kicks zerlegt: Hardtek-Strophe und Roll-Fills in Drop 3
- `horns-distorted-feedback-hardstyle-kick` → Einzel-Hits (Intro, Break, Ende Drop 2, Outro); der Horn-Swell sitzt auf dem Grundton
- `distorted-feedback-kick-one-shot` → Screech-Akzente vor Drop 2 und in Takt 79
- `uptempo-drop_210bpm` → per Rubber Band auf 200 BPM und A-Moll (+3 HT) gebracht; Pitch-Dive in Drop 3 (Takt 93–95)

## Neu bauen

```bash
pip install numpy scipy soundfile librosa pyloudnorm numba demucs torch torchaudio
# Quellen nach src/ legen: original.wav (Song), kick_*.wav, drop_loop210_C.wav
python3 scripts/separate.py                       # Demucs-Stems -> src/stems/
# auf 200 BPM strecken (Rubber Band über ffmpeg), siehe unten
python3 scripts/remix.py                          # -> out/mix_premaster.wav
python3 scripts/master.py                         # -> out/remix_master.wav + MP3
python3 scripts/inspect_mix.py                    # Spektrogramm-Übersicht out/overview.png
```

Strecken: `ffmpeg -i src/stems/<stem>.wav -af "rubberband=tempo=1.0869565:transients=crisp:phase=laminar:pitchq=quality:channels=together" src/stems200/<stem>.wav`
(Vocals mit `transients=mixed:detector=soft:formant=preserved`). Drop-Loop: `rubberband=tempo=0.952381:pitch=1.189207`.

Audio (Original, Stems, Renders) liegt nicht im Repo (`src/`, `out/` sind ignoriert).
