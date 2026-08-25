#!/usr/bin/env python3
"""NOIRE - build both delivery variants from one source.

  dist/preview/noire-preview.html   images inlined as data URIs, double-click
  dist/web/index.html + assets/     production, lazy images, README

Run:  python3 tools/build.py
"""
import os, re, sys, json, base64, shutil, mimetypes, subprocess, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.path.join(ROOT, 'src', 'index.src.html')
ASSETS = os.path.join(ROOT, 'assets')
DIST = os.path.join(ROOT, 'dist')

# The live domain is not known yet.  Leaving this empty is deliberate: the
# canonical link is dropped rather than pointed at a guess, and the draft
# ledger keeps reminding whoever ships it.
CANONICAL = ''


def manifest():
    with open(os.path.join(ASSETS, 'manifest.json')) as fh:
        return json.load(fh)


def datauri(path):
    mime = mimetypes.guess_type(path)[0] or 'application/octet-stream'
    with open(path, 'rb') as fh:
        return 'data:%s;base64,%s' % (mime, base64.b64encode(fh.read()).decode('ascii'))


def german_dict(html):
    """Pull the German copy out of the source so the build can pre-fill it."""
    start = html.index('var DICT = {')
    i = html.index('{', start)
    depth, j = 0, i
    while j < len(html):
        if html[j] == '{':
            depth += 1
        elif html[j] == '}':
            depth -= 1
            if depth == 0:
                break
        j += 1
    obj = html[i:j + 1]
    code = 'var DICT = %s;\nprocess.stdout.write(JSON.stringify(DICT.de));' % obj
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as fh:
        fh.write(code)
        path = fh.name
    try:
        out = subprocess.run(['node', path], capture_output=True, text=True, timeout=60)
        if out.returncode != 0:
            raise SystemExit('cannot read the dictionary: ' + out.stderr.strip())
        return json.loads(out.stdout)
    finally:
        os.unlink(path)


def prefill_copy(html, de):
    """Write the default-language copy straight into the markup.

    Without this the page is a set of empty elements until JavaScript fills
    them, which is exactly what section 17 says must not happen. Switching
    language still replaces every one of these at runtime.
    """
    filled = {'t': 0, 'th': 0, 'tp': 0}

    def esc(v):
        return (v.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;'))

    def fill_empty(m):
        open_tag, tag, attr, key, close = m.group(0), m.group(1), m.group(2), m.group(3), m.group(4)
        text = de.get(key)
        if text is None:
            return open_tag
        body = text if attr == 'data-th' else esc(text)
        filled['th' if attr == 'data-th' else 't'] += 1
        return m.group(0).replace(close, body + close)

    html = re.sub(
        r'<([a-zA-Z0-9]+)[^>]*\b(data-t|data-th)="([^"]+)"[^>]*>\s*(</\1>)',
        fill_empty, html)

    def fill_placeholder(m):
        key = m.group(1)
        text = de.get(key)
        if text is None:
            return m.group(0)
        filled['tp'] += 1
        return m.group(0) + ' placeholder="' + esc(text).replace('"', '&quot;') + '"'

    html = re.sub(r'data-tp="([^"]+)"', fill_placeholder, html)
    return html, filled


def strip_canonical(html):
    """No domain configured -> no canonical tag and no og:url claim."""
    out = []
    for line in html.split('\n'):
        if 'rel="canonical"' in line and '__A_CANONICAL__' in line:
            continue
        out.append(line)
    return '\n'.join(out)


def render(html, mapping, canonical, de=None):
    if de:
        html, counts = prefill_copy(html, de)
        render.counts = counts
    if not canonical:
        html = strip_canonical(html)
    for token, value in mapping.items():
        html = html.replace('__A_%s__' % token, value)
    html = html.replace('__A_CANONICAL__', canonical)
    return html


def build_preview(src, mf, de):
    out_dir = os.path.join(DIST, 'preview')
    os.makedirs(out_dir, exist_ok=True)
    mapping = {}
    for token, name in mf.items():
        if token == 'OG':
            mapping['OGURL'] = 'assets/' + name      # a card, not page furniture
        else:
            mapping[token] = datauri(os.path.join(ASSETS, name))
    html = render(src, mapping, CANONICAL, de)
    path = os.path.join(out_dir, 'noire-preview.html')
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write(html)
    return path


def build_web(src, mf, de):
    out_dir = os.path.join(DIST, 'web')
    if os.path.isdir(out_dir):
        shutil.rmtree(out_dir)
    os.makedirs(os.path.join(out_dir, 'assets'))
    mapping = {}
    for token, name in mf.items():
        shutil.copy2(os.path.join(ASSETS, name), os.path.join(out_dir, 'assets', name))
        mapping['OGURL' if token == 'OG' else token] = 'assets/' + name
    html = render(src, mapping, CANONICAL, de)
    path = os.path.join(out_dir, 'index.html')
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write(html)
    write_readme(out_dir, mf)
    return out_dir


README = """# NOIRÉ — Le Couloir

Production build. Upload the whole folder; `index.html` is the entry point.

```
index.html      markup, styles, scene and shaders in one file
assets/         campaign stills, wordmark and the social card
```

## Before it goes live

1. **Fill in `CFG`.** It sits at the top of the inline script and is the only
   place the page takes facts from. Anything left empty renders as a visible
   `[noch zu ergänzen]` instead of an invented claim. Set `draft: false` to
   drop the open-points badge once the ledger is empty.
2. **Set `CFG.site.canonical` and `CFG.site.ogImage`** to absolute URLs and
   re-add the `<link rel="canonical">` tag (the build drops it while no domain
   is configured).
3. **Self-host the two dependencies.** Google Fonts and cdnjs are loaded from
   third-party servers and receive every visitor's IP address. Copy
   `three.min.js`, `gsap.min.js`, `ScrollTrigger.min.js` and the two font
   families next to `index.html` and repoint the tags.
4. **Retailers.** A partner appears in the text and in the 3D room only with
   `confirmed: true` *and* a `logo` path. Logos go in their original colours on
   the light plate the stylesheet already provides — never recoloured white.
5. **Legal.** The four tabs are a scaffold of the points the law asks for, not
   legal copy. Have them written and reviewed.

## Prices

Regular %(regular)s online and in retail. The launch discount in
`CFG.product.launch` switches itself on and off by date — after `until`
the page returns to the regular price on its own, with no code change.

Two points belong on the checklist: a struck-through price needs a real
reference price (§ 11 PAngV), and retail prices may not be dictated
(§ 1 GWB) — hence RRP.

## What has not been checked

The page has never been rendered in a browser. Camera path, timing and frame
rate are set by calculation and need one tuning pass on real hardware.

Image payload: %(bytes).1f KB across %(count)d files.
"""


def write_readme(out_dir, mf):
    total = sum(os.path.getsize(os.path.join(ASSETS, n)) for n in mf.values())
    with open(os.path.join(out_dir, 'README.md'), 'w', encoding='utf-8') as fh:
        fh.write(README % {'regular': '39,99 €', 'bytes': total / 1024.0, 'count': len(mf)})


LIBS = ['three.min.js', 'gsap.min.js', 'ScrollTrigger.min.js']
VENDOR = os.path.join(ROOT, 'vendor')


def inline_libs(html):
    """Swap the three CDN tags for the vendored sources.

    Not a delivery variant — the brief asks for exactly two CDN scripts. This
    exists so the page can be opened with no network at all, which is how it
    gets smoke tested and how the shareable copy is published.
    """
    for name in LIBS:
        path = os.path.join(VENDOR, name)
        with open(path, encoding='utf-8', errors='replace') as fh:
            code = fh.read()
        needle = [l for l in html.split('\n') if 'cdnjs' in l and name in l]
        if not needle:
            raise SystemExit('cannot find the CDN tag for ' + name)
        html = html.replace(needle[0], '<script>/* %s */\n%s\n</script>' % (name, code))
    return html


def build_standalone(src, mf, de):
    """Everything in one file, no network: images, libraries, the lot."""
    out_dir = os.path.join(DIST, 'standalone')
    os.makedirs(out_dir, exist_ok=True)
    mapping = {}
    for token, name in mf.items():
        mapping['OGURL' if token == 'OG' else token] = datauri(os.path.join(ASSETS, name))
    html = inline_libs(render(src, mapping, CANONICAL, de))
    path = os.path.join(out_dir, 'noire-standalone.html')
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write(html)
    return path


def build_artifact(src, mf, de):
    """Same page, reduced to a body fragment for a host that supplies the
    document skeleton itself."""
    out_dir = os.path.join(DIST, 'artifact')
    os.makedirs(out_dir, exist_ok=True)
    mapping = {}
    for token, name in mf.items():
        mapping['OGURL' if token == 'OG' else token] = datauri(os.path.join(ASSETS, name))
    html = inline_libs(render(src, mapping, CANONICAL, de))

    head = html[html.index('<head>') + 6:html.index('</head>')]
    body = html[html.index('<body>') + 6:html.rindex('</body>')]
    # The shared copy is named for the room, not the product: it sits in a
    # gallery beside other pages, where "Eau de Parfum" identifies nothing.
    keep = ['<title>NOIRÉ Le Couloir</title>']
    for m in re.finditer(r'<link rel="stylesheet"[^>]*>', head):
        keep.append(m.group(0))
    for m in re.finditer(r'<link rel="preconnect"[^>]*>', head):
        keep.append(m.group(0))
    for m in re.finditer(r'<style>.*?</style>', head, re.S):
        keep.append(m.group(0))
    frag = '\n'.join(keep) + '\n' + body
    path = os.path.join(out_dir, 'noire.html')
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write(frag)
    return path


def main():
    with open(SRC, encoding='utf-8') as fh:
        src = fh.read()
    mf = manifest()
    de = german_dict(src)
    p = build_preview(src, mf, de)
    w = build_web(src, mf, de)
    extras = []
    if os.path.isdir(VENDOR):
        extras.append(('standalone', build_standalone(src, mf, de)))
        extras.append(('artifact  ', build_artifact(src, mf, de)))

    def tree_size(path):
        if os.path.isfile(path):
            return os.path.getsize(path)
        return sum(os.path.getsize(os.path.join(r, f))
                   for r, _, fs in os.walk(path) for f in fs)

    print('preview   %-34s %7.1f KB' % (os.path.relpath(p, ROOT), tree_size(p) / 1024.0))
    for f in sorted(os.listdir(w)):
        full = os.path.join(w, f)
        print('web       %-34s %7.1f KB' % ('dist/web/' + f, tree_size(full) / 1024.0))
    print('-' * 54)
    print('%-44s %7.1f KB' % ('production total, on disk', tree_size(w) / 1024.0))
    import gzip as _gz
    wire = 0
    for r, _, fs in os.walk(w):
        for f in fs:
            full = os.path.join(r, f)
            raw = open(full, 'rb').read()
            # text is served compressed; webp/jpeg/png already are
            wire += len(_gz.compress(raw, 9)) if f.endswith(('.html', '.md')) else len(raw)
    print('%-44s %7.1f KB' % ('production, over the wire (gzip)', wire / 1024.0))
    for label, path in extras:
        print('%s %-34s %7.1f KB' % (label, os.path.relpath(path, ROOT), tree_size(path) / 1024.0))
    leftovers = 0
    for path in [p, os.path.join(w, 'index.html')] + [x[1] for x in extras]:
        with open(path, encoding='utf-8') as fh:
            leftovers += fh.read().count('__A_')
    c = getattr(render, 'counts', {})
    print('%-44s %7s' % ('copy written into the markup',
                         '%d + %d html + %d ph' % (c.get('t', 0), c.get('th', 0), c.get('tp', 0))))
    print('%-44s %7d' % ('leftover placeholder tokens', leftovers))
    return 0 if leftovers == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
