#!/usr/bin/env python3
"""NOIRE - Asset preparation.

Reads the campaign originals from assets-src/ and writes the web-ready
derivatives into assets/.  For every derivative both WebP and PNG/JPEG are
encoded and the smaller file wins, as required by the brief.

Run:  python3 tools/prep_assets.py
"""
import os, io, json, shutil
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.path.join(ROOT, 'assets-src')
OUT  = os.path.join(ROOT, 'assets')

os.makedirs(OUT, exist_ok=True)


def _encode(im, base, candidates):
    """Encode `im` with every candidate (ext, kwargs) and keep the smallest."""
    best = None
    for ext, kw in candidates:
        buf = io.BytesIO()
        im.save(buf, **kw)
        data = buf.getvalue()
        if best is None or len(data) < len(best[1]):
            best = (ext, data)
    ext, data = best
    name = base + ext
    with open(os.path.join(OUT, name), 'wb') as fh:
        fh.write(data)
    return name, len(data)


def resize_w(im, width):
    if im.width == width:
        return im
    h = max(1, round(im.height * width / im.width))
    return im.resize((width, h), Image.LANCZOS)


def opaque(path):
    return Image.open(path).convert('RGB')


def wall(src, base, width=460, quality=72):
    """Campaign poster for the corridor wall - caption stays, it is the poster."""
    im = resize_w(opaque(os.path.join(SRC, src)), width)
    return _encode(im, base, [
        ('.webp', dict(format='WEBP', quality=quality, method=6)),
        ('.jpg',  dict(format='JPEG', quality=quality, optimize=True, progressive=True)),
    ])


def flacon(src, base, cut_bottom, width, quality=70):
    """Caption cropped away - used as the no-WebGL fallback still."""
    im = opaque(os.path.join(SRC, src))
    im = im.crop((0, 0, im.width, int(round(im.height * (1.0 - cut_bottom)))))
    im = resize_w(im, width)
    return _encode(im, base, [
        ('.webp', dict(format='WEBP', quality=quality, method=6)),
        ('.jpg',  dict(format='JPEG', quality=quality, optimize=True, progressive=True)),
    ])


def wordmark(src, base, width=1100):
    """Alpha bounding box crop, transparency preserved (additive blending)."""
    im = Image.open(os.path.join(SRC, src)).convert('RGBA')
    box = im.getchannel('A').getbbox()
    if box:
        im = im.crop(box)
    im = resize_w(im, width)
    # RGB of fully transparent pixels must stay black: additive blending and
    # `screen` both add colour, alpha only scales it.
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0 and (r or g or b):
                px[x, y] = (0, 0, 0, 0)
    cands = [
        ('.webp', dict(format='WEBP', quality=80, method=6)),
        ('.png',  dict(format='PNG', optimize=True)),
    ]
    # A 48 colour palette is often smaller; only keep it if it really is.
    quant = im.quantize(colors=48, method=Image.FASTOCTREE)
    buf = io.BytesIO(); quant.save(buf, format='PNG', optimize=True)
    if len(buf.getvalue()) < min(_size(im, kw) for _, kw in cands):
        name = base + '.png'
        with open(os.path.join(OUT, name), 'wb') as fh:
            fh.write(buf.getvalue())
        return name, len(buf.getvalue())
    return _encode(im, base, cands)


def _size(im, kw):
    buf = io.BytesIO(); im.save(buf, **kw); return len(buf.getvalue())


def logo(src, base, height=150, square=False):
    """Retailer logo: alpha bounding box, fixed height, colours untouched.

    Stays transparent — the light plate it sits on is drawn by the page, in
    the DOM as a CSS background and in the 3D room on a canvas. Recolouring a
    partner's logo white breaks almost every brand style guide there is.
    """
    im = Image.open(os.path.join(SRC, src)).convert('RGBA')
    box = im.getchannel('A').getbbox()
    if box:
        im = im.crop(box)
    if square:
        side = max(im.size)
        pad = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        pad.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
        im = pad
    w = max(1, round(im.width * height / im.height))
    im = im.resize((w, height), Image.LANCZOS)

    cands = [
        ('.webp', dict(format='WEBP', quality=88, method=6)),
        ('.png',  dict(format='PNG', optimize=True)),
    ]
    # Flat brand marks usually survive 48 colours; only keep it if smaller.
    quant = im.quantize(colors=48, method=Image.FASTOCTREE)
    buf = io.BytesIO(); quant.save(buf, format='PNG', optimize=True)
    if len(buf.getvalue()) < min(_size(im, kw) for _, kw in cands):
        name = base + '.png'
        with open(os.path.join(OUT, name), 'wb') as fh:
            fh.write(buf.getvalue())
        return name, len(buf.getvalue())
    return _encode(im, base, cands)


def social(src, base, size=(1200, 630), quality=68):
    """Open Graph card - centre crop of the key visual."""
    im = opaque(os.path.join(SRC, src))
    tw, th = size
    scale = max(tw / im.width, th / im.height)
    im = im.resize((max(tw, round(im.width * scale)), max(th, round(im.height * scale))), Image.LANCZOS)
    left = (im.width - tw) // 2
    top = int((im.height - th) * 0.42)      # bias to the bottle, not the empty top
    im = im.crop((left, top, left + tw, top + th))
    # JPEG only: a few social scrapers still refuse WebP cards.
    return _encode(im, base, [
        ('.jpg', dict(format='JPEG', quality=quality, optimize=True, progressive=True)),
    ])


def main():
    for f in os.listdir(OUT):
        os.remove(os.path.join(OUT, f))

    manifest = {}
    total = 0
    jobs = [
        ('WALL1',    lambda: wall('teaser-1-line.jpg',        'teaser-line')),
        ('WALL2',    lambda: wall('teaser-2-silhouette.jpg',  'teaser-silhouette')),
        ('WALL3',    lambda: wall('teaser-3-engraving.jpg',   'teaser-engraving')),
        ('FLACONA',  lambda: flacon('teaser-2-silhouette.jpg', 'flacon-silhouette', 0.170, 760)),
        ('FLACONB',  lambda: flacon('teaser-3-engraving.jpg',  'flacon-engraving',  0.185, 820)),
        ('MARK',     lambda: wordmark('wordmark.png',          'wordmark')),
        ('OG',       lambda: social('key-visual.jpg',          'og')),
        ('LOGOPF',   lambda: logo('logo-parfumfabrik.png', 'logo-parfumfabrik')),
        ('LOGODM',   lambda: logo('logo-dm.png',           'logo-dm', 170, square=True)),
        ('LOGORO',   lambda: logo('logo-rossmann.webp',    'logo-rossmann')),
        ('LOGOMU',   lambda: logo('logo-mueller.png',      'logo-mueller')),
    ]
    for token, fn in jobs:
        name, size = fn()
        manifest[token] = name
        total += size
        print('%-9s %-26s %7.1f KB' % (token, name, size / 1024.0))

    with open(os.path.join(OUT, 'manifest.json'), 'w') as fh:
        json.dump(manifest, fh, indent=2, sort_keys=True)
    print('-' * 46)
    print('%-36s %7.1f KB' % ('total image payload', total / 1024.0))
    return manifest


if __name__ == '__main__':
    main()
