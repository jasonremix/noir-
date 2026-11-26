// Heldenzeit (Uptempo) teaser: pure function of time. window.seek(t) paints frame t (lib/motion.js).
// Timing is in beats (u) on the measured 180 bpm grid; docs/shotlist.md is the plan this file follows.
// One camera moves through the release cover, split into depth layers (sky / back figure / front
// figure), and ends on the real cover. Version (pre-save / out now) comes from film.json "version".
import * as M from './lib/motion.js';

const { W, H, FORMAT, E, prog, lerp, clamp, springU, spring, SPRING, wobble, font, layout, glyph, text, fill, bump, mulberry32, hash01, noise1 } = M;

// ------------------------------------------------------------------ tokens (from the cover)
const C = { ink: '#0B0B0B', paper: '#F2F0EC' };
const DISPLAY = 'Display', TITLE = 'DisplayI', UI = 'UI';
const P = 1254;                                   // cover / plate size in source px
const COVER = {                                   // ink boxes measured on the cover (scripts in docs)
  title: { x0: 139, x1: 1151, base: 955, cap: 102 },
  script: { x: 260, y: 966, w: 755, h: 174, ink0: 290, ink1: 973 },
  credits: { x: 215, y: 55, w: 835, h: 50 },
  titleMatte: { x: 50, y: 828, w: 1145, h: 144 },
};
const ASSET = '/heldenzeit-teaser/assets/';
const fmt = FORMAT.name;
const pick = FORMAT.pick;

// Every accent: [beat, label, sfx, opts]. sfx.mjs voices them on the same grid.
const HITS = [
  [0, 'WELLLO', 'click'],
  [2, 'x', 'tick'],
  [4, 'JASON REMIX', 'click'],
  [6, 'punch-in on the back figure', 'thud', { pitch: 'D2', gain: 0.22 }],
  [8, 'whip to the front figure', 'whoosh', { len: 0.35, from: 500, to: 3200 }],
  [10, 'NEUE SINGLE', 'tick'],
  [16, 'drop: light breaks through', 'sub', { len: 0.7 }],
  [16, 'HEL', 'thud', { pitch: 'D2' }],
  [17, 'DEN', 'thud', { pitch: 'D2' }],
  [18, 'ZEIT', 'thud', { pitch: 'A1' }],
  [24, 'cut: eye', 'click'],
  [25, 'cut: back figure', 'click'],
  [26, 'cut: ear', 'click'],
  [27, 'cut: lips', 'click'],
  [28, 'pull back into the cover', 'whoosh', { len: 0.6, from: 2800, to: 400 }],
  [32, 'end card: the cover', 'impact'],
  [33, 'CTA line 1', 'tick'],
  [34, 'CTA line 2', 'tick'],
];

// ------------------------------------------------------------------ camera
// cam: plate point (x, y) drawn at screen anchor (ax, ay), z screen px per plate px, rot radians,
// px/py/pz: parallax. A layer at depth d lags the camera by (1 - d) of the parallax offset.
const LAYERS = { sky: 0.45, back: 0.78, front: 1 };
function lx(cam, d) {
  const k = 1 - d;
  return { x: cam.x + cam.px * k, y: cam.y + cam.py * k, z: cam.z * (1 - cam.pz * k) };
}
const toScreen = (cam, d, X, Y) => { const L = lx(cam, d); return [cam.ax + (X - L.x) * L.z, cam.ay + (Y - L.y) * L.z]; };
const mixCam = (a, b, k) => ({
  x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: a.z * (b.z / a.z) ** k,
  ax: lerp(a.ax, b.ax, k), ay: lerp(a.ay, b.ay, k), rot: lerp(a.rot, b.rot, k),
  px: lerp(a.px, b.px, k), py: lerp(a.py, b.py, k), pz: lerp(a.pz, b.pz, k),
});
const cam0 = (o) => ({ ax: W / 2, ay: H / 2, rot: 0, px: 0, py: 0, pz: 0, ...o });

// End card geometry per format: the square cover and the CTA block.
const CARD = pick({
  '9x16': { x: 120, y: 330, s: 840 },
  '1x1': { x: 195, y: 58, s: 690 },
  '16x9': { x: 150, y: 110, s: 860 },
});
const cardCam = () => cam0({ x: P / 2, y: P / 2, z: CARD.s / P, ax: CARD.x + CARD.s / 2, ay: CARD.y + CARD.s / 2 });

// Shot framings per format (plate px centre + zoom).
const F = {
  s1a: pick({ '9x16': [318, 525, 2.0], '1x1': [345, 478, 1.86], '16x9': [470, 445, 2.0] }),
  s1b: pick({ '9x16': [348, 492, 2.14], '1x1': [372, 455, 1.98], '16x9': [505, 425, 2.12] }),
  s2: pick({ '9x16': [868, 420, 2.25], '1x1': [850, 390, 2.05], '16x9': [790, 390, 2.15] }),
  two: pick({ '9x16': [640, 700, 1.06], '1x1': [627, 627, 1080 / P], '16x9': [627, 470, 1.53] }),
  cutZ: pick({ '9x16': 3.0, '1x1': 2.6, '16x9': 2.75 }),
};
const CUTS = [[985, 285], [405, 468], [792, 418], [1032, 342]];

function camAt(u) {
  // shot 1: back figure, drifting (frame 0 already moving)
  const p1 = (u + 1) / 9;
  const s1 = cam0({
    x: lerp(F.s1a[0], F.s1b[0], p1), y: lerp(F.s1a[1], F.s1b[1], p1), z: F.s1a[2] * (F.s1b[2] * 1.06 / F.s1a[2]) ** E.outCubic(p1),
    px: lerp(-34, 34, p1), py: lerp(16, -18, p1), pz: lerp(0.03, -0.04, p1), rot: lerp(0.012, -0.004, p1),
  });
  if (u < 8) { const pk = springU(u, 6, SPRING.snappy); return { ...s1, z: s1.z * (1 + 0.07 * pk), y: s1.y - 10 * pk }; }
  // shot 2: whip to the front figure, then a push that accelerates into the riser
  const s2base = cam0({ x: F.s2[0], y: F.s2[1], z: F.s2[2], px: 20, py: -6, pz: 0 });
  const kw = spring((u - 8) * M.GRID.period, { stiffness: 210, damping: 24 });
  const push = Math.exp(0.08 * (u - 8) / 8 + 0.32 * E.inCubic(prog(u, 11, 16)));
  const s1p = { ...s1, z: s1.z * 1.07, y: s1.y - 10 };
  const s2 = mixCam(s1p, { ...s2base, z: s2base.z * push, rot: -0.022 * E.inCubic(prog(u, 11, 16)), px: lerp(20, -18, prog(u, 8, 16)) }, kw);
  if (u < 16) return s2;
  // shot 3: the drop, spring pull-back to the two-shot, then a slow push
  const two = (v) => cam0({ x: F.two[0], y: F.two[1], z: F.two[2] * Math.exp(0.045 * (v - 16) / 12), px: lerp(-16, 16, prog(v, 16, 28)), py: lerp(8, -6, prog(v, 16, 28)), pz: 0.015 });
  if (u < 24) {
    // hard cut on the drop to a tighter two-shot that springs back: frame 1 is already the new image
    const kd = spring((u - 16) * M.GRID.period, { stiffness: 190, damping: 17 });
    const t2 = two(u), hit = { ...t2, z: t2.z * 1.3, y: t2.y - 40, rot: 0.02 };
    return mixCam(hit, t2, kd);
  }
  // shot 4: a hard cut on every beat to a close-up
  if (u < 28) {
    const i = Math.floor(u - 24), c = CUTS[i], f = u - 24 - i;
    return cam0({ x: c[0], y: c[1], z: F.cutZ * Math.exp(0.07 * f), px: lerp(-10, 10, f), rot: (i % 2 ? 1 : -1) * 0.006 });
  }
  // shot 5 + end card: the plate shrinks into the cover
  const kc = springU(u, 28, SPRING.gentle);
  return mixCam(two(28), cardCam(), kc);
}

// ------------------------------------------------------------------ world
function drawSky(ctx, cam, IMG, bloomA) {
  const L = lx(cam, LAYERS.sky), x0 = cam.ax - L.x * L.z, y0 = cam.ay - L.y * L.z, s = P * L.z;
  // mirrored sky beyond the plate (top and sides), darkened, so tall crops never show an edge
  for (const i of [-1, 0, 1]) for (const j of [-1, 0]) {
    ctx.save();
    ctx.translate(x0 + i * s, y0 + j * s);
    if (i !== 0) { ctx.translate(s, 0); ctx.scale(-1, 1); }
    if (j !== 0) { ctx.translate(0, s); ctx.scale(1, -1); }
    ctx.drawImage(IMG.sky, 0, 0, s, s);
    ctx.restore();
  }
  const gTop = ctx.createLinearGradient(0, y0 + 0.08 * s, 0, y0 - 0.45 * s);
  gTop.addColorStop(0, 'rgba(11,11,11,0)'); gTop.addColorStop(1, 'rgba(11,11,11,0.92)');
  ctx.fillStyle = gTop; ctx.fillRect(-W, y0 - s, 3 * W, 1.08 * s);
  // the light behind the heads
  if (bloomA > 0.001) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const [bx, by, br, ba] of [[495, 585, 330, 1], [1040, 300, 420, 0.55], [640, 150, 500, 0.35]]) {
      const cx = x0 + bx * L.z, cy = y0 + by * L.z, r = br * L.z;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      const a = clamp(bloomA * ba);
      g.addColorStop(0, `rgba(255,253,248,${a})`); g.addColorStop(0.35, `rgba(240,238,232,${a * 0.45})`); g.addColorStop(1, 'rgba(240,238,232,0)');
      ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    }
    ctx.restore();
  }
}
function drawFigure(ctx, cam, img, d) {
  const L = lx(cam, d);
  ctx.drawImage(img, cam.ax - L.x * L.z, cam.ay - L.y * L.z, P * L.z, P * L.z);
}
function drawWorld(ctx, cam, IMG, bloomA, flashA) {
  ctx.save();
  ctx.translate(cam.ax, cam.ay); ctx.rotate(cam.rot); ctx.translate(-cam.ax, -cam.ay);
  drawSky(ctx, cam, IMG, bloomA);
  drawFigure(ctx, cam, IMG.back, LAYERS.back);
  drawFigure(ctx, cam, IMG.front, LAYERS.front);
  // below the plate the jackets fall into black
  const L = lx(cam, 1), yb = cam.ay + (P - L.y) * L.z;
  const g = ctx.createLinearGradient(0, yb - 0.12 * P * L.z, 0, yb);
  g.addColorStop(0, 'rgba(8,8,8,0)'); g.addColorStop(1, 'rgba(8,8,8,1)');
  ctx.fillStyle = g; ctx.fillRect(-W, yb - 0.12 * P * L.z, 3 * W, 0.12 * P * L.z);
  ctx.fillStyle = '#080808'; ctx.fillRect(-W, yb - 1, 3 * W, 2 * H);
  // halation: the flash on the drop spills over the figures' edges
  if (flashA > 0.001) {
    const [cx, cy] = toScreen(cam, LAYERS.sky, 495, 560);
    const r = 900 * L.z;
    ctx.globalCompositeOperation = 'screen';
    const h = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    h.addColorStop(0, `rgba(255,252,246,${clamp(flashA)})`); h.addColorStop(0.4, `rgba(255,252,246,${clamp(flashA) * 0.35})`); h.addColorStop(1, 'rgba(255,252,246,0)');
    ctx.fillStyle = h; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}
function vignette(ctx, a = 0.5) {
  const g = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.62);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// ------------------------------------------------------------------ type
// A word that rises out of a mask at its baseline. p: 0..1 (spring, may overshoot).
function riseText(ctx, str, x, base, f, track, color, p, align = 'left', size = 40) {
  if (p <= 0) return;
  ctx.save();
  ctx.beginPath(); ctx.rect(-W, -H, 3 * W, base + size * 0.28 + H); ctx.clip();
  text(ctx, str, x, base + (1 - p) * size * 1.25, f, color, align, track);
  ctx.restore();
}

// The title, per glyph, positioned by its ink: centre x, baseline, ink width.
const TT = { str: 'HELDENZEIT', track: 0.045, syl: [0, 0, 0, 1, 1, 1, 2, 2, 2, 2] };
let TM = null;   // title metrics at size 100 (measured once in init)
function measureTitle(ctx) {
  const f = font(100, 400, TITLE);
  const L = layout(ctx, TT.str, f, TT.track * 100);
  ctx.font = f; ctx.letterSpacing = `${TT.track * 100}px`;
  const m = ctx.measureText(TT.str);
  ctx.letterSpacing = '0px';
  TM = { L, left: m.actualBoundingBoxLeft, right: m.actualBoundingBoxRight, asc: m.actualBoundingBoxAscent };
}
function drawTitle(ctx, u, R, alpha, mask) {
  if (alpha <= 0.001) return;
  const inkW = TM.right + TM.left, sc = R.w / inkW, size = 100 * sc;
  const x0 = R.cx - (TM.right - TM.left) / 2 * sc;
  const f = font(size, 400, TITLE);
  const extra = R.open * size;                    // tracking that opens after the slam
  const n = TM.L.glyphs.length;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = 'rgba(255,255,255,0.35)'; ctx.shadowBlur = size * 0.16;
  if (mask) { ctx.beginPath(); ctx.rect(-W, -H, 3 * W, R.base + size * 0.08 + H); ctx.clip(); }
  TM.L.glyphs.forEach((g, i) => {
    const t0 = 16 + TT.syl[i] + (i - [0, 3, 6][TT.syl[i]]) * 0.07;
    const k = mask ? springU(u, t0 - 0.12, { stiffness: 320, damping: 21 }) : 1;
    if (k <= 0) return;
    const gx = x0 + g.cx * sc + (i - (n - 1) / 2) * extra;
    glyph(ctx, g.ch, gx, R.base + (1 - k) * TM.asc * sc * 1.25, f, C.paper);
  });
  ctx.restore();
}
// The cover's own "Uptempo", written on left to right (p 0..1), placed by the title's ink rect.
let scriptBuf = null;
function drawScript(ctx, IMG, R, p, alpha) {
  if (p <= 0 || alpha <= 0.001) return;
  const s = R.w / (COVER.title.x1 - COVER.title.x0);
  const x = R.cx - R.w / 2 + (COVER.script.x - COVER.title.x0) * s;
  const y = R.base + (COVER.script.y - COVER.title.base) * s;
  const sw = COVER.script.w, sh = COVER.script.h;
  if (!scriptBuf) { scriptBuf = document.createElement('canvas'); scriptBuf.width = sw; scriptBuf.height = sh; }
  const b = scriptBuf.getContext('2d');
  b.globalCompositeOperation = 'source-over';
  b.clearRect(0, 0, sw, sh);
  b.drawImage(IMG.script, 0, 0);
  if (p < 1) {
    const edge = lerp(COVER.script.ink0 - COVER.script.x - 30, COVER.script.ink1 - COVER.script.x + 30, p);
    const g = b.createLinearGradient(edge - 40, 0, edge + 10, 0);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    b.globalCompositeOperation = 'destination-in';
    b.fillStyle = g; b.fillRect(0, 0, sw, sh);
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = 'rgba(255,255,255,0.3)'; ctx.shadowBlur = 10 * s;
  ctx.drawImage(scriptBuf, x, y, sw * s, sh * s);
  ctx.restore();
}

// Title rect during the drop, per format (ink centre x, baseline, ink width).
function titleRectDrop(cam) {
  if (fmt === '1x1') {   // locked to the plate exactly where the cover has it
    const [a, b] = [toScreen(cam, 1, COVER.title.x0, COVER.title.base), toScreen(cam, 1, COVER.title.x1, COVER.title.base)];
    return { cx: (a[0] + b[0]) / 2, base: a[1], w: b[0] - a[0] };
  }
  return pick({ '9x16': { cx: 510, base: 1296, w: 800 }, '16x9': { cx: 960, base: 838, w: 900 } });
}
const titleRectCard = (scale = 1) => {
  const s = CARD.s * scale / P, cx = CARD.x + CARD.s / 2, cy = CARD.y + CARD.s / 2;
  return { cx: cx + ((COVER.title.x0 + COVER.title.x1) / 2 - P / 2) * s, base: cy + (COVER.title.base - P / 2) * s, w: (COVER.title.x1 - COVER.title.x0) * s };
};
function burn(ctx, R, a) {
  const cx = R.cx, cy = R.base + R.w * 0.04, rx = R.w * 0.75, ry = R.w * 0.22;
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.55, `rgba(0,0,0,${a * 0.6})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(-rx, -rx, 2 * rx, 2 * rx);
  ctx.restore();
}
const mixRect = (a, b, k) => ({ cx: lerp(a.cx, b.cx, k), base: lerp(a.base, b.base, k), w: a.w * (b.w / a.w) ** k });

// ------------------------------------------------------------------ scenes
function credits(ctx, u, cam) {
  if (u > 9.5) return;
  // locked to the sky: the whip carries them out of frame
  const ref = camAt(4);
  const [ax, ay] = toScreen(cam, LAYERS.sky, 600, 300), [bx, by] = toScreen(ref, LAYERS.sky, 600, 300);
  const dx = ax - bx, dy = ay - by;
  const words = ['WELLLO', '×', 'JASON REMIX'];
  const size = pick({ '9x16': 72, '1x1': 46, '16x9': 54 });
  const f = font(size, 500, DISPLAY), track = pick({ '9x16': 0.34, '1x1': 0.4, '16x9': 0.4 }) * size;
  ctx.save(); ctx.translate(dx, dy);
  ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = size * 0.5;
  if (fmt === '16x9') {
    // stacked and left-aligned in the sky over the back figure (the front head fills the right)
    const ys = [124, 196, 268];
    words.forEach((w, i) => {
      const k = springU(u, i * 2 - (i === 0 ? 0.35 : 0), SPRING.snappy);
      if (i === 1) riseText(ctx, w, 104, ys[i] + 8, font(size * 2, 500, DISPLAY), 0, C.paper, k, 'left', size);
      else riseText(ctx, w, 104, ys[i], f, track, C.paper, k, 'left', size);
    });
  } else if (FORMAT.portrait) {
    // stacked, one word per beat, centred in the sky above the head
    const ys = [380, 482, 584];
    words.forEach((w, i) => {
      const k = springU(u, i * 2 - (i === 0 ? 0.35 : 0), SPRING.snappy);
      const L = layout(ctx, w, f, track);
      if (i === 1) { riseText(ctx, w, 540, ys[i] + 8, font(size * 2, 500, DISPLAY), 0, C.paper, k, 'center', size); return; }
      riseText(ctx, w, 540 - (L.width) / 2, ys[i], f, track, C.paper, k, 'left', size);
    });
  } else {
    const L = words.map((w) => layout(ctx, w, f, track));
    const gap = size * 1.1;
    const total = L.reduce((a, l) => a + l.width, 0) + gap * 2;
    let x = pick({ '1x1': 540, '16x9': 640 }) - total / 2;
    const y = pick({ '1x1': 156, '16x9': 186 });
    words.forEach((w, i) => {
      const k = springU(u, i * 2 - (i === 0 ? 0.35 : 0), SPRING.snappy);
      if (i === 1) riseText(ctx, w, x + L[i].width / 2, y + size * 0.1, font(size * 2, 500, DISPLAY), 0, C.paper, k, 'center', size);
      else riseText(ctx, w, x, y, f, track, C.paper, k, 'left', size);
      x += L[i].width + gap;
    });
  }
  ctx.restore();
}
function neueSingle(ctx, u, cam) {
  if (u < 9.8 || u > 16.2) return;
  const size = pick({ '9x16': 54, '1x1': 46, '16x9': 50 });
  const f = font(size, 600, UI), track = 0.3 * size;
  const s = FORMAT.safe;
  const x = s.x, y = pick({ '9x16': 1430, '1x1': 990, '16x9': 990 });
  // per letter, a touch apart; exits up together on 15
  const str = 'NEUE SINGLE';
  const L = layout(ctx, str, f, track);
  const out = E.inBack(prog(u, 15, 15.6), 1.3);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, y - size * 1.2, W, size * 1.5); ctx.clip();
  L.glyphs.forEach((g, i) => {
    const k = springU(u, 10 - 0.2 + i * 0.045, SPRING.snappy);
    if (k <= 0) return;
    glyph(ctx, g.ch, x + g.cx, y + (1 - k) * size * 1.3 - out * size * 1.4, f, C.paper);
  });
  ctx.restore();
  // a hairline that draws under it, the cover's thin-line language
  const lw = E.outCubic(prog(u, 10.4, 12)) * (1 - out);
  if (lw > 0) { ctx.fillStyle = 'rgba(242,240,236,0.7)'; ctx.fillRect(x, y + size * 0.55, L.width * lw, 2); }
}
// Largest size <= max at which str (tracked trackEm) fits maxW.
function fit(ctx, str, weight, family, max, trackEm, maxW) {
  const w = layout(ctx, str, font(100, weight, family), trackEm * 100).width;
  return Math.min(max, Math.floor(100 * maxW / w));
}
function cta(ctx, u, version) {
  if (u < 32.6) return;
  const A = version !== 'outnow';
  const big = A ? '27.11.2026' : 'JETZT ÜBERALL';
  const link = fmt === '16x9' ? 'LINK IN DER BESCHREIBUNG' : 'LINK IN BIO';
  const small = A ? `JETZT PRE-SAVEN · ${link}` : `AUF ALLEN PLATTFORMEN · ${link}`;
  const k1 = springU(u, 33 - 0.15, SPRING.snappy), k2 = springU(u, 34 - 0.15, SPRING.snappy);
  if (fmt === '16x9') {
    const x = 1120;
    const bs = fit(ctx, big, 500, DISPLAY, 112, 0.12, 690), ss = Math.min(40, fit(ctx, small.split(' · ')[0], 600, UI, 40, 0.3, 690), fit(ctx, small.split(' · ')[1], 600, UI, 52, 0.3, 690));
    riseText(ctx, big, x, 520, font(bs, 500, DISPLAY), 0.12 * bs, C.paper, k1, 'left', bs);
    const parts = small.split(' · ');
    riseText(ctx, parts[0], x + 4, 624, font(ss, 600, UI), 0.3 * ss, C.paper, k2, 'left', ss);
    riseText(ctx, parts[1], x + 4, 684, font(ss * 0.78, 600, UI), 0.3 * ss * 0.78, 'rgba(242,240,236,0.72)', springU(u, 34.4, SPRING.snappy), 'left', ss);
    const lw = E.outCubic(prog(u, 33.2, 35));
    if (lw > 0) { ctx.fillStyle = 'rgba(242,240,236,0.55)'; ctx.fillRect(x + 4, 552, 560 * lw, 2); }
    return;
  }
  const cx = CARD.x + CARD.s / 2;
  const by = CARD.y + CARD.s + pick({ '9x16': 120, '1x1': 84 });
  const [l1, l2] = small.split(' · ');
  const bs = fit(ctx, big, 500, DISPLAY, pick({ '9x16': 92, '1x1': 60 }), 0.12, pick({ '9x16': 800, '1x1': 700 }));
  const ss = fit(ctx, l1, 600, UI, pick({ '9x16': 44, '1x1': 34 }), 0.24, pick({ '9x16': 780, '1x1': 700 }));
  riseText(ctx, big, cx, by, font(bs, 500, DISPLAY), 0.12 * bs, C.paper, k1, 'center', bs);
  const [d1, d2] = pick({ '9x16': [82, 136], '1x1': [58, 102] });
  riseText(ctx, l1, cx, by + d1, font(ss, 600, UI), 0.24 * ss, C.paper, k2, 'center', ss);
  riseText(ctx, l2, cx, by + d2, font(ss * 0.8, 600, UI), 0.3 * ss * 0.8, 'rgba(242,240,236,0.72)', springU(u, 34.35, SPRING.snappy), 'center', ss);
}

// ------------------------------------------------------------------ the film
let GRAIN = [];
const version = () => (M.CFG && M.CFG.version) || 'presave';

M.film({
  fonts: [font(100, 400, TITLE), font(100, 500, DISPLAY), font(40, 500, UI), font(40, 600, UI)],
  images: {
    sky: ASSET + 'layers/sky.jpg', back: ASSET + 'layers/back.webp', front: ASSET + 'layers/front.webp',
    blur: ASSET + 'layers/plate_blur.jpg', cover: ASSET + 'cover/cover.png',
    script: ASSET + 'cover/script.png', titleM: ASSET + 'cover/title.png', creditsM: ASSET + 'cover/credits.png',
  },
  hits: HITS,
  init(ctx) {
    measureTitle(ctx);
    // seeded film grain tiles (never Math.random)
    for (let n = 0; n < 4; n++) {
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const g = c.getContext('2d'), im = g.createImageData(256, 256), r = mulberry32(911 + n * 7);
      for (let i = 0; i < im.data.length; i += 4) { const v = 128 + (r() + r() + r() - 1.5) * 120; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
      g.putImageData(im, 0, 0); GRAIN.push(c);
    }
  },
  draw(ctx, u, t, IMG) {
    fill(ctx, C.ink);
    const cam = camAt(u);
    // light: low in the break, swells into the drop, flashes on it, then pulses on every kick
    const kick = u >= 16 ? Math.exp(-((u % 1 + 1) % 1) * 5) : 0;
    const swell = 0.14 + 0.22 * E.inOutSine(prog(u, 8, 13)) - 0.2 * E.inCubic(prog(u, 13, 16));
    const bloomA = u < 16 ? swell : 0.38 + 0.22 * kick + 0.5 * Math.exp(-(u - 16) * 1.6);
    const flashA = u >= 16 ? 0.62 * Math.exp(-(u - 16) * 2.6) : 0;

    const kc = u >= 28 ? springU(u, 28, SPRING.gentle) : 0;
    if (u >= 28) {
      // the blurred cover behind the card, alive with the kick
      const s = Math.max(W, H) * 1.18 * (1 + 0.02 * kick);
      ctx.globalAlpha = clamp(kc * 1.4) * (0.85 + 0.15 * kick);
      ctx.drawImage(IMG.blur, (W - s) / 2, (H - s) / 2 - 0.02 * H, s, s);
      ctx.globalAlpha = 1;
      vignette(ctx, 0.55);
    }
    // the world, clipped to a rect that shrinks into the card
    const full = [0, 0, W, H], card = [CARD.x, CARD.y, CARD.s, CARD.s];
    const settle = u >= 32 ? 1 + 0.035 * wobble(u - 32, 2.2, 3.2) + 0.022 * prog(u, 32, 45) : 1;
    const R = full.map((v, i) => lerp(v, card[i], kc));
    const cx = R[0] + R[2] / 2, cy = R[1] + R[3] / 2;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(settle, settle); ctx.translate(-cx, -cy);
    if (u >= 28) {
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 60 * kc; ctx.shadowOffsetY = 20 * kc;
      ctx.fillStyle = '#000'; ctx.fillRect(R[0], R[1], R[2], R[3]);
      ctx.shadowColor = 'transparent';
    }
    ctx.beginPath(); ctx.rect(R[0], R[1], R[2], R[3]); ctx.clip();
    if (u >= 32.2) {
      ctx.drawImage(IMG.cover, CARD.x, CARD.y, CARD.s, CARD.s);   // the real cover, untouched
    } else {
      drawWorld(ctx, cam, IMG, bloomA * (1 - kc * 0.85), flashA);
      if (u < 28) vignette(ctx, 0.5);
      // the riser pulls the light in before the drop gives it back
      const dip = u < 16 ? 0.42 * E.inCubic(prog(u, 13, 16)) : 0;
      if (dip > 0) { ctx.fillStyle = `rgba(0,0,0,${dip})`; ctx.fillRect(0, 0, W, H); }
      // burn under the title so it reads over bright sky (darkroom burn, not a box)
      const burnA = 0.62 * prog(u, 15.8, 16.4) * (1 - kc);
      if (burnA > 0) burn(ctx, titleRectDrop(u < 24 ? cam : camAt(23.999)), burnA);
      // the cover's own lettering arrives on the card
      const la = prog(u, 31.4, 32.2);
      if (la > 0) { ctx.globalAlpha = la; ctx.drawImage(IMG.cover, CARD.x, CARD.y, CARD.s, CARD.s); ctx.globalAlpha = 1; }
    }
    // a slow sheen crosses the cover late in the hold
    const sh = prog(u, 37.5, 40.5);
    if (sh > 0 && sh < 1) {
      const sx = lerp(CARD.x - 0.6 * CARD.s, CARD.x + 1.6 * CARD.s, E.inOutSine(sh));
      const g = ctx.createLinearGradient(sx - 160, CARD.y, sx + 160, CARD.y + 220);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.16)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g; ctx.fillRect(CARD.x, CARD.y, CARD.s, CARD.s);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();

    // type
    credits(ctx, u, cam);
    neueSingle(ctx, u, cam);
    if (u >= 15.8 && u < 32.2) {
      const drop = titleRectDrop(u < 24 ? cam : camAt(23.999));
      const kt = u >= 28 ? springU(u, 28.15, SPRING.gentle) : 0;
      const Rt = { ...mixRect(drop, titleRectCard(), kt), open: lerp(lerp(0, 0.012, E.outCubic(prog(u, 18, 24))), 0, kt) };
      const fade = 1 - prog(u, 31.4, 32.2);
      drawTitle(ctx, u, Rt, fade, u < 19);
      drawScript(ctx, IMG, Rt, E.inOutSine(prog(u, 19.6, 22.6)), fade);
    }
    cta(ctx, u, version());
  },
  post(ctx, u, t) {
    // film grain at 24 fps cadence, seeded by the frame
    const fi = Math.floor(t * 24);
    const tile = GRAIN[fi % GRAIN.length];
    const pat = ctx.createPattern(tile, 'repeat');
    const ox = Math.floor(hash01(fi, 3) * 256), oy = Math.floor(hash01(fi, 5) * 256);
    ctx.save();
    ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.16;
    ctx.translate(-ox, -oy); ctx.fillStyle = pat; ctx.fillRect(0, 0, W + 256, H + 256);
    ctx.restore();
  },
});
