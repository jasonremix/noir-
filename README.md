# NOIRÉ — Le Couloir

A site for the fragrance **NOIRÉ — Eau de Parfum**, in two halves.

**Le Couloir** — eight scroll acts you fly down as a corridor, the campaign
hanging on its walls, opening into a hall with the flacon.

**Das Dossier** — where the flight lands, the page becomes an ordinary long
one: the essay, the figures, a concentration scale, the composition, how it is
made, the object, care, and the questions.

Markup, styles, scene and shaders live in one file. No build step at runtime,
two CDN scripts, nothing else.

```
src/index.src.html     the source, with __A_*__ asset placeholders
assets-src/            the campaign originals as delivered
assets/                web ready derivatives (built)
tools/prep_assets.py   originals  -> assets/
tools/build.py         source     -> dist/
tools/verify.py        the pre-delivery checks
tools/smoke.js         renders the flight in Chromium
tools/smoke-fallback.js  the same page with WebGL switched off
tools/smoke-dossier.js   figures, the scale, the accordion, GL idling
tools/smoke-nojs.js      JavaScript off — every word must still be there
dist/preview/          one file, images inlined — opens by double click
dist/web/              index.html + assets/ + README — the production upload
```

## Build

```bash
python3 tools/prep_assets.py     # 98 KB of images from the originals
python3 tools/build.py           # both variants
python3 tools/verify.py          # syntax, GLSL, i18n, price logic
```

Optional, for a copy that runs with no network at all (used for the browser
tests and for sharing):

```bash
mkdir -p vendor && cd vendor
curl -sO https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js
curl -sO https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js
curl -sO https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js
cd .. && python3 tools/build.py   # now also writes dist/standalone and dist/artifact
node tools/smoke.js          dist/standalone/noire-standalone.html
node tools/smoke-fallback.js dist/standalone/noire-standalone.html
node tools/smoke-dossier.js  dist/standalone/noire-standalone.html
node tools/smoke-nojs.js     dist/web/index.html
```

## Figures

Every number in the dossier is either held in `CFG` or is arithmetic on
numbers held in `CFG`, and the tile says which — `500 × 50 ml` under the 25
litres, `18 % · 25 l` under the 4.5 litres of oil. Nothing is estimated to
fill a tile. Where a value is missing the tile shows the gap instead.

The one set of numbers from outside `CFG` is the concentration classes on the
scale, which are industry convention rather than a standard; they sit in
`CFG.reference` with a ledger item asking for the source. The scale's ordinal
ramp was checked with the dataviz palette validator against the page's own
surface (`#84202a → #f04048`, monotone lightness, light end clearing `#050203`);
the marker is bone rather than a fifth red, so the value that matters is not
mistaken for another band.

## Size

Roughly 290 KB on disk, **154 KB over the wire** — the markup and script
gzip to about a third, the images are already compressed. `tools/build.py`
prints both. The brief's 250 KB target holds for the transferred size; the
on-disk figure went past it when the dossier's copy was added.

## The CFG block

Everything factual comes from one object at the top of the inline script.
**The page shows nothing that is not held there.** An empty price says
"Preis folgt" and disables the button; an empty checkout URL keeps it
disabled; an unconfirmed retailer appears neither in the text nor in the 3D
room; a missing mandatory field renders as a visible `[noch zu ergänzen]`.
`draft: true` adds the open-points ledger in the corner.

## Prices

39,99 € regular, online and in retail. `CFG.product.launch` holds a 50 %
introductory discount for three months from launch; the page switches to it
and back out of it by date, with no code change. Verified at four points in
time by `tools/verify.py`.

Two items belong on the legal checklist: a struck-through price needs a real
reference price (§ 11 PAngV), and retail prices may not be dictated
(§ 1 GWB) — hence RRP rather than a fixed price.

## What was checked, and what was not

`tools/verify.py` covers JavaScript syntax, bracket balance in all 17 GLSL
fragments, `smoothstep` edge order, `pow()` base signs, uniform defaults, the
116 copy keys across all three languages, HTML balance, leftover placeholders,
and the price logic at four dates.

Beyond that the page **was** rendered in Chromium (software WebGL) at 1440×900
and 414×896, with WebGL, without WebGL, and with JavaScript off: the flight,
the reveals, the counters, the scale, the accordion, the language switch, the
legal overlay, focus handling and the picture fallback all behave, and nothing
overflows sideways in portrait.

What that run cannot tell you is how it feels on real hardware — frame rate on
a mid-range phone, and whether the camera timing reads as cinema or as
seasickness. Those need one tuning pass on real devices.

The fragrance notes and the hard product data are a draft and need to be
confirmed. The four retailer logos are in, cropped to their alpha box at
150 px (dm 170 px, square) and left in their original colours — the light
plate they sit on is drawn by the page, as a CSS background on the DOM chip
and on a canvas for the wall, so one transparent file serves both.

All four partners are confirmed, so they appear in the copy and as lit signs
on the corridor wall. None of them has a target link yet — the ledger says
so, and the chips stay plain text until a URL is filled in.

One deliberate deviation from the brief: §4 hangs the logo wall on the right
and §9 puts act VI's copy on the right too, so the marks ended up behind the
text. The wall moved to the left and the "Erhältlich bei" plaque took the
covered side — a label loses less by being half read than a partner's mark
does. The signs also carry a permanent 58 % turn towards the corridor;
flush with the wall they are edge on at flying speed.
