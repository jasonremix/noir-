#!/usr/bin/env python3
"""NOIRE - the pre-delivery checks named in the brief, section 19.

  * JavaScript syntax (node --check)
  * bracket balance in every GLSL fragment
  * every uniform a shader declares has a starting value
  * every data-t key exists in all three languages
  * HTML tags balanced
  * no placeholder tokens left in the output
  * price logic evaluated at four points in time

Run:  python3 tools/verify.py
"""
import os, re, sys, json, subprocess, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.path.join(ROOT, 'src', 'index.src.html')
OUTS = [os.path.join(ROOT, 'dist', 'preview', 'noire-preview.html'),
        os.path.join(ROOT, 'dist', 'web', 'index.html')]

FAIL = []
def ok(name, detail=''):   print('  \033[32mPASS\033[0m  %-46s %s' % (name, detail))
def bad(name, detail=''):  FAIL.append(name); print('  \033[31mFAIL\033[0m  %-46s %s' % (name, detail))


def read(p):
    with open(p, encoding='utf-8') as fh:
        return fh.read()


def inline_js(html):
    """The one script tag without a src attribute."""
    i = html.index('\n<script>\n')
    j = html.index('</script>', i)
    return html[i + len('\n<script>\n'):j]


def balanced_object(s, start):
    """start points at the opening brace; returns the slice including braces."""
    depth, i, n = 0, start, len(s)
    while i < n:
        c = s[i]
        if c == '{': depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return s[start:i + 1]
        i += 1
    return None


def node(script):
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as fh:
        fh.write(script); path = fh.name
    try:
        r = subprocess.run(['node', path], capture_output=True, text=True, timeout=60)
        return r.returncode, r.stdout.strip(), r.stderr.strip()
    finally:
        os.unlink(path)


# ---------------------------------------------------------------- 1 · syntax
def check_js_syntax(js):
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as fh:
        fh.write(js); path = fh.name
    try:
        r = subprocess.run(['node', '--check', path], capture_output=True, text=True, timeout=60)
        if r.returncode == 0:
            ok('JavaScript syntax', '%d lines' % js.count('\n'))
        else:
            bad('JavaScript syntax', r.stderr.strip().split('\n')[0])
    finally:
        os.unlink(path)


# ----------------------------------------------------------------- 2 · GLSL
SHADER_RE = re.compile(r"var\s+((?:F|V|FS)_[A-Z0-9_]+|VERT|FOG_FN)\s*=\s*\[(.*?)\]\.join\('\\n'\);", re.S)

def shaders(js):
    out = {}
    for m in SHADER_RE.finditer(js):
        name, body = m.group(1), m.group(2)
        lines = re.findall(r"'((?:[^'\\]|\\.)*)'", body)
        out[name] = '\n'.join(l.replace("\\n", "\n").replace("\\'", "'") for l in lines)
    return out

def check_glsl_balance(sh):
    bad_ones = []
    for name, src in sh.items():
        for op, cl, label in (('{', '}', 'braces'), ('(', ')', 'parens'), ('[', ']', 'brackets')):
            depth = 0
            for ch in src:
                if ch == op: depth += 1
                elif ch == cl:
                    depth -= 1
                    if depth < 0: break
            if depth != 0:
                bad_ones.append('%s %s %+d' % (name, label, depth))
    if bad_ones: bad('GLSL bracket balance', '; '.join(bad_ones))
    else: ok('GLSL bracket balance', '%d fragments' % len(sh))

def check_glsl_smoothstep(sh):
    """edge0 must be smaller than edge1 - the reverse form is undefined."""
    offenders = []
    num = re.compile(r'^-?\d+(?:\.\d+)?$')
    for name, src in sh.items():
        for a, b in re.findall(r'smoothstep\(\s*([^,()]+),\s*([^,()]+),', src):
            a, b = a.strip(), b.strip()
            if num.match(a) and num.match(b) and float(a) >= float(b):
                offenders.append('%s: smoothstep(%s,%s,…)' % (name, a, b))
    if offenders: bad('GLSL smoothstep edge order', '; '.join(offenders))
    else: ok('GLSL smoothstep edge order', 'edge0 < edge1 everywhere')

def check_glsl_pow(sh):
    """pow() with a base that can go negative is undefined - x*x instead."""
    offenders = []
    for name, src in sh.items():
        for m in re.finditer(r'pow\(\s*([^,]+),', src):
            base = m.group(1)
            if 'max(' in base or 'clamp(' in base or 'abs(' in base or base.strip().startswith('1.0 -'):
                continue
            offenders.append('%s: pow(%s,…)' % (name, base.strip()[:34]))
    if offenders: bad('GLSL pow() base sign', '; '.join(offenders))
    else: ok('GLSL pow() base sign', 'no unguarded bases')


# ------------------------------------------------------ 3 · uniform defaults
def check_uniform_defaults(js, sh):
    missing = []
    for name, src in sh.items():
        declared = set(re.findall(r'uniform\s+\w+\s+(\w+)\s*;', src))
        if not declared:
            continue
        provided = set()
        for m in re.finditer(r'\b%s\b' % re.escape(name), js):
            idx = m.end()
            if js[max(0, m.start() - 6):m.start()].strip().endswith('var'):
                continue                                    # its own definition
            window = js[idx:idx + 2600]
            u = window.find('uniforms:')
            brace = window.find('{', u) if 0 <= u < 420 else window.find('{')
            if brace < 0:
                continue
            obj = balanced_object(window, brace)
            if not obj:
                continue
            provided |= set(re.findall(r'(\bu[A-Za-z0-9_]*)\s*:\s*\{', obj))
        gap = declared - provided
        if gap:
            missing.append('%s: %s' % (name, ', '.join(sorted(gap))))
    if missing: bad('uniform starting values', '; '.join(missing))
    else: ok('uniform starting values', 'every declared uniform is initialised')


# ------------------------------------------------------------------ 4 · i18n
def check_i18n(html, js):
    start = js.index('var DICT = {')
    obj = balanced_object(js, js.index('{', start))
    code = 'var DICT = %s;\nconsole.log(JSON.stringify(Object.keys(DICT).reduce(function(a,k){a[k]=Object.keys(DICT[k]).sort();return a;},{})));' % obj
    rc, out, err = node(code)
    if rc != 0:
        bad('language dictionary parses', err.split('\n')[0]); return
    keys = json.loads(out)
    langs = sorted(keys.keys())
    base = set(keys['de'])
    diffs = []
    for l in langs:
        if l == 'de': continue
        miss = base - set(keys[l]); extra = set(keys[l]) - base
        if miss:  diffs.append('%s missing %s' % (l, ', '.join(sorted(miss))))
        if extra: diffs.append('%s extra %s' % (l, ', '.join(sorted(extra))))
    if diffs: bad('all keys in all three languages', '; '.join(diffs))
    else: ok('all keys in all three languages', '%d keys x %s' % (len(base), '/'.join(langs)))

    used = set(re.findall(r'data-t[hp]?="([^"]+)"', html))
    used |= set(re.findall(r"T\('([^']+)'\)", js))
    used |= set(re.findall(r"T\('lg\.' \+ ovTab\)", js) and ['lg.' + t for t in
                 ('imprint', 'privacy', 'revoke', 'product')] or [])
    used |= set('a4.%s%d' % (p, i) for p in ('w', 'n', 'p') for i in (1, 2, 3))
    used |= set('ch.%d' % i for i in range(1, 9))
    dyn = re.compile(r"^(lg\.' \+|a4\.'|ch\.')")
    unresolved = sorted(k for k in used if k not in base and not dyn.match(k) and "'" not in k and '+' not in k)
    if unresolved: bad('every referenced key exists', ', '.join(unresolved))
    else: ok('every referenced key exists', '%d references' % len(used))


# ------------------------------------------------------------------ 5 · HTML
VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
def check_html(html):
    body = re.sub(r'<script\b.*?</script>', '', html, flags=re.S)
    body = re.sub(r'<style\b.*?</style>', '', body, flags=re.S)
    body = re.sub(r'<!--.*?-->', '', body, flags=re.S)
    body = re.sub(r'<!doctype[^>]*>', '', body, flags=re.I)
    stack, errs = [], []
    for m in re.finditer(r'<(/?)([a-zA-Z0-9]+)([^>]*)>', body):
        closing, tag, attrs = m.group(1), m.group(2).lower(), m.group(3)
        if tag in VOID or attrs.rstrip().endswith('/'):
            continue
        if closing:
            if not stack: errs.append('stray </%s>' % tag); break
            top = stack.pop()
            if top != tag: errs.append('</%s> closes <%s>' % (tag, top)); break
        else:
            stack.append(tag)
    if stack: errs.append('never closed: ' + ', '.join(stack))
    if errs: bad('HTML tags balanced', '; '.join(errs))
    else: ok('HTML tags balanced')


# ---------------------------------------------------------------- 6 · tokens
def check_tokens():
    left = []
    for p in OUTS:
        n = read(p).count('__A_')
        if n: left.append('%s x%d' % (os.path.basename(p), n))
    if left: bad('no placeholder tokens left', '; '.join(left))
    else: ok('no placeholder tokens left', '%d outputs' % len(OUTS))


# ------------------------------------------------------------------ 7 · price
def check_prices(js):
    cfg = balanced_object(js, js.index('{', js.index('var CFG = ')))
    fn_start = js.index('function priceState(')
    fn = js[fn_start:js.index('\n}\n', fn_start) + 3]
    harness = """
var CFG = %s;
function has(v){ return v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0); }
%s
var points = [
  ['before launch     ', '2026-10-01T12:00:00Z'],
  ['day one           ', '2026-11-15T06:00:00Z'],
  ['just before it ends', '2027-02-15T20:00:00Z'],
  ['after it ends     ', '2027-02-16T12:00:00Z']
];
var rows = points.map(function(p){
  var st = priceState(new Date(p[1]).getTime());
  return { when: p[0], price: st.price, strike: st.active ? st.regular : null,
           badge: st.active, saleOpen: st.saleOpen };
});
console.log(JSON.stringify(rows));
""" % (cfg, fn)
    rc, out, err = node(harness)
    if rc != 0:
        bad('price logic runs', err.split('\n')[0]); return
    rows = json.loads(out)
    want = [
        (39.99, None,  False, False),
        (19.99, 39.99, True,  True),
        (19.99, 39.99, True,  True),
        (39.99, None,  False, True),
    ]
    problems = []
    for row, (p, s, b, o) in zip(rows, want):
        got = (row['price'], row['strike'], row['badge'], row['saleOpen'])
        if got != (p, s, b, o):
            problems.append('%s got %s want %s' % (row['when'].strip(), got, (p, s, b, o)))
    for row in rows:
        print('        %s  %-8s %s' % (
            row['when'],
            ('%.2f' % row['price']) if row['price'] is not None else 'n/a',
            ('struck %.2f, badge on' % row['strike']) if row['strike'] else 'regular price, no badge'))
    if problems: bad('price logic at four points', '; '.join(problems))
    else: ok('price logic at four points', 'switches back on its own')


def main():
    html = read(SRC)
    js = inline_js(html)
    sh = shaders(js)
    print('\nNOIRÉ — pre-delivery checks\n')
    check_js_syntax(js)
    check_glsl_balance(sh)
    check_glsl_smoothstep(sh)
    check_glsl_pow(sh)
    check_uniform_defaults(js, sh)
    check_i18n(html, js)
    check_html(html)
    check_tokens()
    check_prices(js)
    print('')
    if FAIL:
        print('  %d check(s) failed: %s\n' % (len(FAIL), ', '.join(FAIL)))
        return 1
    print('  all checks passed\n')
    return 0


if __name__ == '__main__':
    sys.exit(main())
