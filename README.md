# noir-

## Heldenzeit (Jason Remix) – Uptempo · Release-Teaser

15-Sekunden-Motion-Graphic zur Ankündigung von „Heldenzeit (Jason Remix) – Uptempo“ von WELLLO × Jason Remix
(Release 27.11.2026, https://distrokid.com/hyperfollow/welllo/heldenzeit-jason-remix-remix-uptempo-version/).

Fertige Videos liegen in `exports/`:

| Version | 9:16 (Reels, TikTok, Shorts) | 1:1 (Feed) | 16:9 (YouTube) |
|---|---|---|---|
| A · Pre-Save (bis 26.11.) | `Heldenzeit_PreSave_9x16.mp4` | `Heldenzeit_PreSave_1x1.mp4` | `Heldenzeit_PreSave_16x9.mp4` |
| B · Jetzt überall (ab 27.11.) | `Heldenzeit_OutNow_9x16.mp4` | `Heldenzeit_OutNow_1x1.mp4` | `Heldenzeit_OutNow_16x9.mp4` |

Der Film ist Code (`heldenzeit-teaser/film.js`, jedes Frame ist eine reine Funktion der Zeit) und wurde mit dem
motion-reel-Workflow gebaut: Cover in Tiefenebenen zerlegt (`assets/layers/`), Beat-Raster aus dem Song gemessen
(180 BPM, `beats.json`), Shotlist und Critique-Log in `heldenzeit-teaser/docs/`.
`heldenzeit-teaser-outnow/` ist derselbe Film mit der Endkarte „Jetzt überall“ (`film.json` → `"version": "outnow"`).
