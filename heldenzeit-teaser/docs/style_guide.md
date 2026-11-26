# Style guide (from the release cover)

The cover (`assets/cover/cover.png`) is the reference for the look. There is no motion reference;
the motion below is written for this release.

## Rhythm
15 s ≈ 8 bars. New event every 1–2 bars, big changes on the downbeat of a bar. The bar before the
title is held calmer (a single camera move, no cuts), so the title hit lands harder.

## Motion vocabulary
- Camera: one continuous camera through the cover world. The plate is split into sky / back figure /
  front figure (`assets/layers/`), which move at depth 0.4 / 0.7 / 1.0 for parallax. Zooms are log-space.
- Entrances: type rises from behind a baseline mask (clip), per glyph, `SPRING.gentle`; small credits
  per word on beats with `SPRING.snappy`. No fades on their own: every entrance has direction.
- Script "Uptempo" writes on left to right (mask wipe along x, slight feathering), the swash
  last, ending on a beat.
- Exits: the camera moves on and takes the type out of frame. Type does not fade out in place.
- Signature move: **light breaks through**. The backlight between the two heads blooms on the drop
  and pulses with the kick, as if the sun broke through the clouds (Heldenzeit).

## Composition
Low angle, heads high in the frame, sky as negative space for the type. Title sits low over the
dark jackets (as on the cover), credits high in the sky. 9:16 keeps all type inside the safe area
(top 250 px, bottom 430 px clear for the app UI).

## Colour + texture
Pure monochrome, as on the cover: near-black `#0B0B0B`, paper white `#F2F0EC`, sky greys from the
photo. No colour accent: white light is the accent. Film grain (seeded, post), soft vignette,
slight halation on bright type.

## Type in motion
- Display: **Bodoni Moda Italic** (title, matches HELDENZEIT on the cover) and Bodoni Moda roman
  for wide-tracked credits ("WELLLO × JASON REMIX", tracking ≈ 0.45 em).
- UI: **Inter** Medium, caps, wide tracking, for date and CTA (read at phone size).
- Script: the cover's own "Uptempo" lettering (`assets/cover/script.png`), never re-drawn with a font.

## Do / don't
- Do keep the faces of the artists sharp and recognisable; the push-ins stop before softness shows.
- Do land the title on the downbeat of the lift in the song.
- Do end on the real cover with date + CTA held ≥ 2 s.
- Don't add colour, lens flares on type, or particle bursts.
- Don't fade from black on frame 0: the first frame is already a picture.
- Don't flash the full frame white on every cut; one flash at most (the drop).
