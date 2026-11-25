# JASON REMIX – DER WEG HINTER DER MUSIK · Trailer-Video (Fassung 1)

85 Sekunden · 1920×1080 · 25 fps · Stereo, −14 LUFS · Deutsch

Fertiges Video: `out/jason-remix-trailer/JASON_REMIX_Trailer_V1_1080p.mp4`
Shotliste: `docs/shotlist.md` · Prüfprotokoll: `docs/critique.md` · Konzept: `../TRAILER_KONZEPT_JASON_REMIX.md`

## Was im Film echt ist und was gestaltet

| Bild/Ton | Herkunft |
|---|---|
| Jasons Foto (Shots 18, 23, 28, 36) | jasonremix.de, Biografie (`assets/real/jason_foto_biografie.jpg`) |
| Logo (Shots 19, 33) | jasonremix.de (`assets/real/logo_jason.png`) |
| 8 Release-Cover + Daten (Shots 14, 16, 30, 35) | Spotify, offizielle Cover und Veröffentlichungsdaten (`assets/real/covers/`, `spotify_tracks.json`) |
| YouTube-Thumbnails, „seit 2022“ (Shot 15) | eigene Videos des Kanals @jasonremixorginal, Kanal angelegt am 08.12.2022 (`assets/real/youtube/`) |
| Studio, Monitor, Projekt, Fader, Uhr, Fassade, Stadt | Grafik aus Code (`film.js`), erkennbar gestaltet, keine Personen |
| Musik und Sounddesign | eigener synthetischer Score (`audio/score.py`), keine fremden Songs |
| Sprecher | **Temp-Stimme**: synthetische deutsche Stimme (Piper „Thorsten“, CC0), Platzhalter |

Keine KI-Gesichter, keine erfundenen Archivbilder, keine erfundenen Zahlen. Verworfen wurden die Konzertfotos der Website (Stockfotos, nicht Jason), das Video der Website (NordVPN-Werbung) und das YouTube-Thumbnail „Mein Neues Buch“ (Echtheit nicht prüfbar). Details: `assets/real/QUELLEN.md`.

**Vor einer Veröffentlichung:** die Temp-Stimme durch einen echten Sprecher ersetzen. Sonst muss die KI-Stimme auf YouTube als veränderter oder synthetischer Inhalt gekennzeichnet werden.

## Neu bauen

Aus dem Repository-Ordner (dem Ordner, der `jason-remix-trailer/` enthält), mit dem motion-reel-Skill unter `$SK`:

```bash
# 1. Sprecher (nur bei neuem Text; die Takes liegen in audio/vo/raw/)
uv run jason-remix-trailer/audio/vo_gen.py <pfad>/de_DE-thorsten-high.onnx
# 2. Score, Sprecher-Schnitt, Raster, Bilddaten
MOTION_REEL_SKILL=$SK uv run jason-remix-trailer/audio/score.py
# 3. Bild, SFX, Mix
node $SK/scripts/render.mjs --film jason-remix-trailer --video-only --fps 25 --workers 4
node $SK/scripts/sfx.mjs jason-remix-trailer
node $SK/scripts/mix.mjs jason-remix-trailer          # -> out/jason-remix-trailer/final.mp4
```

## Echten Sprecher einsetzen

Die Sätze stehen mit ihren Einsätzen in `audio/vo_script.json` (Beat × 0,4 = Sekunde). Eine Aufnahme pro Satz als WAV nach `audio/vo/raw/p01.wav` … `p17.wav` legen (trocken, ohne Musik), dann Schritt 2 und 3 ausführen. `score.py` setzt jeden Satz auf seinen Beat.

## Echtes Videomaterial einsetzen

Jeder Shot ist eine Funktion in `film.js` (Tabelle `SHOTS` am Ende). Wenn Jason Aufnahmen liefert (Studio, Hände am Keyboard, Auftritte, Brandenburg), ersetzen sie die Code-Grafik an denselben Stellen.
