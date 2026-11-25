# Critique

## Round 1
| hook | read | motion | variety | brand | sync | min |
|  6   |  5   |   6    |    8    |   7   |  7   |  5  |

Worst three (most damaging first):
1. [b11-14, b36-42, b108-116, 16x9] The DAW screens are muddy: #101215 background, lanes and clips almost the same grey, nothing reads at phone size. In the wide room shots (b16-20, b100-108) the keyboard strip at the bottom reads as a barcode. -> Brighter graphite palette in daw() (bg #15181c, separators #262a30, silver clip gradient #59606a-#3d434b, waveform 0.9 white), keyboard strip out of roomWide(), boot screen less blown out (inner glow 0.55 -> 0.25).
2. [b188-212, b20-28, b72-80, b168-188] Type too small for a phone: subtitle 36 px, doc line 34 px, "EXKLUSIV AUF YOUTUBE" 30 px, supers 24 px, cards 92 px. -> subtitle 46, doc line 44, platform 40, date 92, supers 30, cards 112 (question 96).
3. [b64-84] Release timeline, YouTube wall and cover stream are underpowered: 250 px covers with unreadable labels, the 2026 cluster flies past, YouTube thumbnails sit dark in the top half, the stream leaves a third of the frame empty. -> Timeline in two beats: 2024 alone (Die Geisterbahn, 420 px, title + date), then the 2026 row of seven covers lighting up one by one with dates; YouTube 3x2 wall at 640 px, all visible at 45 %, lighting in sequence; cover stream on three rows over the full height.

Also: push-through wash at b30 too grey (0.55 -> 0.3, shorter); haze around the logo lock at b94-97; the city at b144-148 too dark to read.

Checks failed: readability on phone pages; longest gap fine (s23 4.0 s with push + VO).
Verdict: ANOTHER ROUND

## Round 2
| hook | read | motion | variety | brand | sync | min |
|  6   |  7   |   7    |    8    |   8   |  8   |  6  |

Worst three (most damaging first):
1. [b108-116, 16x9] The unfinished loop sat in the far left 6 % of a 16-bar view: the screen read as empty grey. -> s21 shows 4 bars, the 1-bar loop is a quarter of the width with three clips, a bright loop bracket and a glow where the playhead jumps back every 4 beats (synced to the audio loop).
2. [b7.5-11] The monitor woke up as a lamp-like oval (inner glow over the face) above a keyboard strip that read as a barcode. -> inner glow removed, keyboard strip removed from s03 and all wide room shots.
3. [b188-212, b20-28, b72-80] Title-sequence lines and supers still marginal on the phone pages. -> subtitle 58 px, doc line 58 px (weight 400), "EXKLUSIV AUF YOUTUBE" 54 px, date 108 px, supers 40 px, "Jeder hat einen Traum." 72 px; 2024 cover 460 px with 58/38 px labels.

Sync: 46/57 hits within 20 ms (median 2.7 ms). The rest are intentional: whooshes peak on their hit (b30, b80), the hard stop at b100 is silence, b20 cuts into soft ambience.
Hook stays at 6 by design: the approved concept opens on black with a breath (Szene 1).
Verdict: ANOTHER ROUND

## Round 3
| hook | read | motion | variety | brand | sync | min |
|  6*  |  8   |   8    |    8    |   8   |  8   |  8* |

\* Hook: frame 0 is black with a breath because the approved storyboard (Szene 1, "Komplette Dunkelheit. Man hört lediglich ein leises Atmen.") asks for it; the project's rule wins over the generic hook rule. Everything else is at 8.

Fixed this round:
1. [b188-196] The title streak ran through the middle of "JASON REMIX" like a strike-through. -> it opens the frame, then settles 104 px lower as a short underline between title and subtitle.
2. [b14-16] Piano keys read flat. -> specular streak on the key tops, shadow in the gaps.
3. [phone pages] Every line now readable on phone_p1..3, including "EINE DOKUMENTATION ÜBER JASON BÜRGER." and "EXKLUSIV AUF YOUTUBE".

Remaining (next pass, not blocking): b138-144 is a 2.4 s near-black stretch by design (silence before the drop); the s16 cover stream is busy for 1.6 s; the city (b144-148) is stylised, not Brandenburg itself.
Checks: no banned defaults; longest gap 4.0 s (b124-134, push + voice); one structural white-out (b164-168, the drop); end card holds 2.4 s.
Verdict: READY

## Final checks (delivery)
- Speech check (faster-whisper "small", German, on the final mix): the transcript matches the script word for word, including "Und aus Jason wurde Jason Remix." Three synthetic takes had been misheard ("Ringmix", "Kuhlesen", "Nichts"); they were replaced by takes that are recognised correctly ("Rie-Mix", "Kulißen", "Nächte," in vo_script.json).
- Master: -14.0 LUFS integrated, true peak -1.1 dBFS (AAC), 85.08 s, 1920x1080, 25 fps, yuv420p, H.264 High, AAC 48 kHz stereo.
- Delivery file: out/jason-remix-trailer/JASON_REMIX_Trailer_V1_1080p.mp4 (2-pass 6 Mbit/s, 66 MB). The CRF-16 master (400 MB, final.mp4) is not in git; it is rebuilt with the commands in README.md.
