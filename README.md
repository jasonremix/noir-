# NOIRÉ — Le Couloir

A 3D scroll site for the fragrance **NOIRÉ — Eau de Parfum**. Not a scroll
effect on a page: a corridor you fly down, with the campaign hanging on its
walls, opening into a hall with the flacon. Markup, styles, scene and shaders
live in one file. No build step at runtime, two CDN scripts, nothing else.

```
src/index.src.html     the source, with __A_*__ asset placeholders
assets-src/            the campaign originals as delivered
assets/                web ready derivatives (built)
tools/prep_assets.py   originals  -> assets/
tools/build.py         source     -> dist/
tools/verify.py        the pre-delivery checks
tools/smoke.js         renders the built page in Chromium
tools/smoke-fallback.js  the same page with WebGL switched off
dist/preview/          one file, images inlined — opens by double click
dist/web/              index.html + assets/ + README — the production upload
```

## Build

```bash
python3 tools/prep_assets.py     # 82 KB of images from the originals
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
node tools/smoke.js dist/standalone/noire-standalone.html
node tools/smoke-fallback.js dist/standalone/noire-standalone.html
```

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
and 414×896, with and without WebGL: the flight, the reveals, the language
switch, the legal overlay, focus handling and the picture fallback all behave.
What that run cannot tell you is how it feels on real hardware — frame rate on
a mid-range phone, and whether the camera timing reads as cinema or as
seasickness. Those need one tuning pass on real devices.

The fragrance notes and the hard product data are a draft and need to be
confirmed. The retailer logos were never supplied; all four partners are
`confirmed: false`, so they appear nowhere a customer could read them as a
promise.
