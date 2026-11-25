// JASON REMIX – DER WEG HINTER DER MUSIK. Ein Film als reine Funktion der Zeit:
// window.seek(t) malt Frame t. Zeit in Beats (u) auf dem 150-BPM-Raster (1 Beat = 0,4 s).
// Plan: docs/shotlist.md. Echtes Material nur aus assets/real/ (Herkunft: assets/real/QUELLEN.md).
import * as M from './lib/motion.js';

const { W, H, E, prog, lerp, clamp, kf, springU, SPRING, font, layout, fill, cover, noise1, hash01, mulberry32, bump, wobble } = M;

// ------------------------------------------------------------------ tokens
const C = {
  deep: '#050506', bg: '#0A0A0B', anth: '#2B2D30', silver: '#A7ACB2', white: '#F2F3F5', dim: '#6c7178',
};
const DISPLAY = 'Display', UI = 'UI';
const la = (a) => `rgba(226,234,245,${clamp(a, 0, 1).toFixed(4)})`;          // the one light: cold white
const lz = (a, b, p) => a * Math.pow(b / a, clamp(p));                       // log zoom (constant-rate dolly)

// ------------------------------------------------------------------ hits: [beat, label, sfx, opts]
const HITS = [
  [5, 'Standby-LED'],
  [7.5, 'Monitor erwacht'],
  [11, 'Spur 1', 'tick', { gain: 0.35, pitch: 2600 }],
  [11.4, 'Spur 3', 'tick', { gain: 0.3, pitch: 2400 }],
  [11.8, 'Spur 5', 'tick', { gain: 0.28, pitch: 2200 }],
  [12.2, 'Spur 7', 'tick', { gain: 0.25, pitch: 2000 }],
  [14, 'Taste A2'],
  [20, 'Fassade'],
  [30, 'durchs Fenster', 'whoosh', { len: 0.9, from: 300, to: 1400, gain: 0.25 }],
  [36, 'Bildschirm nah'],
  [42, 'Wellenform'],
  [56, 'Zündung'],
  [60, 'Fader'],
  [64.05, '2024: Die Geisterbahn', 'click', { gain: 0.3 }],
  [68, 'Zeitgeist', 'click', { gain: 0.22 }],
  [68.5, 'Monster 2', 'click', { gain: 0.22 }],
  [69, 'LAURA', 'click', { gain: 0.22 }],
  [69.5, 'Eine Insel', 'click', { gain: 0.22 }],
  [70, 'Sommernacht', 'click', { gain: 0.22 }],
  [70.5, 'Feeling', 'click', { gain: 0.22 }],
  [71, 'Hol mich', 'click', { gain: 0.25 }],
  [72, 'YouTube 1', 'tick', { gain: 0.2, pitch: 1800 }],
  [72.9, 'YouTube 2', 'tick', { gain: 0.18, pitch: 1700 }],
  [73.8, 'YouTube 3', 'tick', { gain: 0.18, pitch: 1600 }],
  [74.7, 'YouTube 4', 'tick', { gain: 0.18, pitch: 1500 }],
  [75.6, 'YouTube 5', 'tick', { gain: 0.18, pitch: 1400 }],
  [76.5, 'YouTube 6', 'tick', { gain: 0.18, pitch: 1300 }],
  [80, 'Cover-Strom', 'whoosh', { len: 1.2, from: 500, to: 3200, gain: 0.3 }],
  [84, 'J', 'tick', { gain: 0.25, pitch: 'A5' }],
  [84.5, 'A', 'tick', { gain: 0.25, pitch: 'C6' }],
  [85, 'S', 'tick', { gain: 0.25, pitch: 'E6' }],
  [85.5, 'O', 'tick', { gain: 0.25, pitch: 'D6' }],
  [86, 'N', 'tick', { gain: 0.25, pitch: 'A6' }],
  [90, 'Foto'],
  [96, 'Logo rastet ein'],
  [100, 'harter Stopp'],
  [108, 'Loop'],
  [116, '03:47'],
  [124, 'Gesicht'],
  [134, 'Fassade nachts'],
  [144, 'Stadt'],
  [148, 'Kopfhörer'],
  [152, 'Foto kurz'],
  [154, 'Fader schnell'],
  [156, 'Cover 1', 'thud', { gain: 0.25 }], [157, 'Cover 2', 'thud', { gain: 0.25 }], [158, 'Cover 3', 'thud', { gain: 0.25 }], [159, 'Cover 4', 'thud', { gain: 0.25 }],
  [160, 'Build'],
  [168, 'DU KENNST DEN NAMEN', 'impact', { gain: 0.35 }],
  [171, 'Logo', 'impact', { gain: 0.45 }],
  [174, 'DU KENNST DIE MUSIK', 'thud', { gain: 0.4 }],
  [177, 'Cover in Farbe', 'whoosh', { len: 0.5, from: 800, to: 4000, gain: 0.2 }],
  [181, 'Foto im Licht'],
  [184, 'Stopp: die Frage'],
  [188, 'Titel'],
  [205, 'Sommer 2027'],
];

// ------------------------------------------------------------------ data + sprites (built once in init)
let VIZ = null;
const SPR = {};
const COVERS = [   // real releases (Spotify), in release order
  { k: 'geisterbahn', title: 'DIE GEISTERBAHN', date: '03.10.2024', img: 'cv_geisterbahn' },
  { k: 'zeitgeist', title: 'ZEITGEIST', date: '29.07.2026', img: 'cv_zeitgeist' },
  { k: 'monster', title: 'MONSTER 2', date: '11.09.2026', img: 'cv_monster' },
  { k: 'laura', title: 'LAURA', date: '25.09.2026', sub: 'ALBUM', img: 'cv_laura' },
  { k: 'insel', title: 'EINE INSEL', date: '09.10.2026', img: 'cv_insel' },
  { k: 'sommernacht', title: 'SOMMERNACHT', date: '09.10.2026', img: 'cv_sommernacht' },
  { k: 'feeling', title: 'FEELING', date: '23.10.2026', img: 'cv_feeling' },
  { k: 'holmich', title: 'HOL MICH', date: '13.11.2026', img: 'cv_holmich' },
];
const YT = ['yt_holmichraus', 'yt_apologize', 'yt_hinundher', 'yt_sommernacht', 'yt_outnow', 'yt_morgenkinder'];

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function graded(img, filter, w = img.width, h = img.height) {
  const c = canvas(w, h), g = c.getContext('2d');
  g.filter = filter; g.drawImage(img, 0, 0, w, h); g.filter = 'none';
  return c;
}

// luminance -> alpha, so the black-backed logo composites over anything
function lumaAlpha(img) {
  const c = canvas(img.width, img.height), g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    const a = Math.max(p[i], p[i + 1], p[i + 2]);
    const aa = clamp((a - 10) / 235) * 255;
    if (aa > 0) { const s = 255 / Math.max(a, 1); p[i] = Math.min(255, p[i] * s); p[i + 1] = Math.min(255, p[i + 1] * s); p[i + 2] = Math.min(255, p[i + 2] * s); }
    p[i + 3] = aa;
  }
  g.putImageData(d, 0, 0);
  return c;
}

function glowSprite(r, g0, b0) {
  const c = canvas(256, 256), g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  for (let i = 0; i <= 16; i++) { const p = i / 16; gr.addColorStop(p, `rgba(${r},${g0},${b0},${(Math.exp(-p * p * 4.2) * (1 - p)).toFixed(4)})`); }
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  return c;
}

function rectGlowSprite() {
  const c = canvas(400, 260), g = c.getContext('2d');
  g.filter = 'blur(26px)'; g.fillStyle = 'rgb(226,234,245)'; g.fillRect(100, 65, 200, 130); g.filter = 'none';
  return c;
}

function noiseTile(seed) {
  const c = canvas(512, 512), g = c.getContext('2d');
  const d = g.createImageData(512, 512), r = mulberry32(seed);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = 128 + ((r() + r() + r() - 1.5) * 95);
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255;
  }
  g.putImageData(d, 0, 0);
  return c;
}

// the facade: a dark building, one window lit (drawn per frame)
const FAC = { w: 2600, h: 1600, cols: 11, rows: 7, ww: 132, wh: 176, gx: 96, gy: 70, x0: 168, y0: 150, lit: [6, 3] };
function winRect(c, r) {
  const { ww, wh, gx, gy, x0, y0 } = FAC;
  return [x0 + c * (ww + gx), y0 + r * (wh + gy), ww, wh];
}
function facadeSprite() {
  const c = canvas(FAC.w, FAC.h), g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, FAC.h);
  sky.addColorStop(0, '#0d0f12'); sky.addColorStop(0.5, '#090a0c'); sky.addColorStop(1, '#050506');
  g.fillStyle = sky; g.fillRect(0, 0, FAC.w, FAC.h);
  const r = mulberry32(77);
  for (let i = 0; i < 2400; i++) {         // plaster texture
    g.fillStyle = `rgba(160,170,185,${(r() * 0.012).toFixed(4)})`;
    g.fillRect(r() * FAC.w, r() * FAC.h, 1 + r() * 3, 1 + r() * 3);
  }
  for (let row = 0; row < FAC.rows; row++) for (let col = 0; col < FAC.cols; col++) {
    const [x, y, w, h] = winRect(col, row);
    g.fillStyle = '#0f1114'; g.fillRect(x - 8, y - 8, w + 16, h + 16);
    g.fillStyle = '#040506'; g.fillRect(x, y, w, h);
    const refl = g.createLinearGradient(x, y, x + w, y + h);
    refl.addColorStop(0, 'rgba(150,165,185,0.045)'); refl.addColorStop(0.5, 'rgba(150,165,185,0.008)'); refl.addColorStop(1, 'rgba(150,165,185,0.02)');
    g.fillStyle = refl; g.fillRect(x, y, w, h);
    g.fillStyle = '#0d0f12'; g.fillRect(x + w / 2 - 2, y, 4, h); g.fillRect(x, y + h * 0.38 - 2, w, 4);
    g.fillStyle = 'rgba(170,180,195,0.05)'; g.fillRect(x - 14, y + h + 10, w + 28, 3);
  }
  return c;
}

// keyboard silhouette strip (foreground), rim-lit top edges
function keysSprite() {
  const w = 2400, h = 300, c = canvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#060708'; g.fillRect(0, 40, w, h - 40);
  const kw = 58;
  for (let i = 0; i * kw < w; i++) {
    const x = i * kw;
    const gr = g.createLinearGradient(0, 40, 0, h);
    gr.addColorStop(0, '#1a1d21'); gr.addColorStop(0.25, '#0c0d0f'); gr.addColorStop(1, '#050506');
    g.fillStyle = gr; g.fillRect(x + 2, 44, kw - 4, h - 50);
    g.fillStyle = 'rgba(210,220,235,0.22)'; g.fillRect(x + 3, 44, kw - 6, 2);
  }
  const pat = [1, 1, 0, 1, 1, 1, 0];
  for (let i = 0; i * kw < w; i++) {
    if (!pat[i % 7]) continue;
    const x = (i + 1) * kw - 17;
    g.fillStyle = '#020203'; g.fillRect(x, 40, 34, 150);
    g.fillStyle = 'rgba(210,220,235,0.16)'; g.fillRect(x + 3, 41, 28, 1.5);
  }
  g.fillStyle = '#040405'; g.fillRect(0, 0, w, 42);
  g.fillStyle = 'rgba(210,220,235,0.10)'; g.fillRect(0, 38, w, 2);
  return c;
}

// skyline layers for the city (stylised, seeded)
function skylineSprite(seed, base, hmin, hmax, color, winA, tower) {
  const w = 3600, h = 900, c = canvas(w, h), g = c.getContext('2d');
  const r = mulberry32(seed);
  let x = 0;
  while (x < w) {
    const bw = 90 + r() * 230, bh = hmin + r() * (hmax - hmin);
    g.fillStyle = color; g.fillRect(x, h - bh, bw + 1, bh);
    if (r() < 0.25) { g.fillRect(x + bw * 0.3, h - bh - 30 - r() * 50, bw * 0.12, 80); }
    for (let wy = h - bh + 20; wy < h - 30; wy += 22) for (let wx = x + 10; wx < x + bw - 12; wx += 18) {
      if (r() < winA) { g.fillStyle = `rgba(226,234,245,${(0.25 + r() * 0.55).toFixed(3)})`; g.fillRect(wx, wy, 5, 7); g.fillStyle = color; }
    }
    x += bw + (r() < 0.3 ? 20 + r() * 60 : 0);
  }
  if (tower) {   // a church tower silhouette: Brandenburg's skyline is churches and water
    for (const tx of tower) {
      g.fillStyle = color;
      g.fillRect(tx, h - hmax - 240, 70, hmax + 240);
      g.beginPath(); g.moveTo(tx - 6, h - hmax - 240); g.lineTo(tx + 35, h - hmax - 420); g.lineTo(tx + 76, h - hmax - 240); g.fill();
      g.fillRect(tx + 33, h - hmax - 470, 4, 60);
    }
  }
  return c;
}

// ------------------------------------------------------------------ drawing helpers
function glowAt(ctx, x, y, rx, ry, a, spr = SPR.glow) {
  if (a <= 0.002) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(a);
  ctx.drawImage(spr, x - rx, y - ry, rx * 2, ry * 2);
  ctx.restore();
}

function camera(ctx, s = 1, x = 0, y = 0, r = 0, cx = W / 2, cy = H / 2) {
  ctx.translate(cx + x, cy + y); ctx.rotate(r); ctx.scale(s, s); ctx.translate(-cx, -cy);
}
function hand(u, amp = 3, seed = 1) {   // a camera held by a person: slow, small, never still
  return [amp * noise1(u * 0.55, seed), amp * 0.7 * noise1(u * 0.5, seed + 7), 0.0011 * noise1(u * 0.4, seed + 13)];
}

function ttext(ctx, str, x, y, { size, weight = 400, fam = DISPLAY, color = C.white, track = 0, align = 'center', alpha = 1 }) {
  if (alpha <= 0.002) return null;
  const f = font(size, weight, fam);
  const L = layout(ctx, str, f, track * size);
  const x0 = align === 'center' ? x - L.width / 2 : align === 'right' ? x - L.width : x;
  ctx.save(); ctx.globalAlpha *= clamp(alpha);
  ctx.font = f; ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.letterSpacing = `${track * size}px`;
  ctx.fillText(str, x0, y);
  ctx.letterSpacing = '0px'; ctx.restore();
  return L;
}

function vignette(ctx, a = 0.55, inner = 0.42) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * inner, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

function fadeBlack(ctx, a) { if (a > 0.002) { ctx.fillStyle = `rgba(5,5,6,${clamp(a).toFixed(4)})`; ctx.fillRect(0, 0, W, H); } }

// ------------------------------------------------------------------ the DAW (an abstract arrangement view, no real product UI)
function clipBars(ctx, x, y, w, h, seed, density = 1, a = 0.75) {
  const r = mulberry32(seed);
  ctx.fillStyle = `rgba(232,237,243,${Math.min(1, a * 1.25)})`;
  const step = 3;
  let env = 0.5;
  for (let i = 0; i < w - 4; i += step) {
    env += (r() - 0.5) * 0.25; env = clamp(env, 0.15, 0.95);
    const v = env * (0.4 + 0.6 * r()) * density;
    const bh = Math.max(1, v * (h * 0.42));
    ctx.fillRect(x + 2 + i, y + h / 2 - bh, 1.6, bh * 2);
  }
}

function daw(ctx, x, y, w, h, o) {
  const lanes = o.lanes ?? 8, bars = o.bars ?? 16;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = '#15181c'; ctx.fillRect(x, y, w, h);
  const hdr = w * 0.12, ruler = h * 0.07, top = y + ruler, lh = (h - ruler) / lanes, tw = w - hdr;
  const X = (p) => x + hdr + tw * p;                    // timeline position 0..1 -> px
  // ruler
  ctx.fillStyle = '#1c1f24'; ctx.fillRect(x, y, w, ruler);
  ctx.fillStyle = 'rgba(167,172,178,0.5)';
  for (let b = 0; b <= bars * 4; b++) {
    const bx = X(b / (bars * 4));
    const big = b % 4 === 0;
    ctx.fillRect(bx, y + ruler * (big ? 0.35 : 0.7), 1, ruler * (big ? 0.65 : 0.3));
  }
  ctx.fillStyle = 'rgba(167,172,178,0.12)'; ctx.fillRect(x, y + ruler - 1, w, 1);
  // loop region
  if (o.loop) {
    const [a, b] = o.loop;
    ctx.fillStyle = 'rgba(226,234,245,0.85)'; ctx.fillRect(X(a), y + ruler * 0.12, X(b) - X(a), ruler * 0.26);
    ctx.fillStyle = 'rgba(226,234,245,0.07)'; ctx.fillRect(X(a), top, X(b) - X(a), h - ruler);
    ctx.fillStyle = 'rgba(226,234,245,0.5)'; ctx.fillRect(X(a), top, 1.5, h - ruler); ctx.fillRect(X(b) - 1.5, top, 1.5, h - ruler);
  }
  // lanes + headers
  for (let i = 0; i < lanes; i++) {
    const rv = o.laneReveal ? clamp(o.laneReveal(i)) : 1;
    if (rv <= 0) continue;
    const ly = top + i * lh;
    ctx.fillStyle = i % 2 ? '#1a1d22' : '#17191e'; ctx.fillRect(x + hdr, ly, tw * rv, lh);
    ctx.fillStyle = '#2a2e35'; ctx.fillRect(x + hdr, ly + lh - 1, tw * rv, 1.5);
    ctx.globalAlpha = rv;
    ctx.fillStyle = '#20242a'; ctx.fillRect(x, ly, hdr - 2, lh - 1);
    ctx.fillStyle = 'rgba(167,172,178,0.45)';
    M.rrect(ctx, x + hdr * 0.12, ly + lh * 0.3, hdr * (0.35 + 0.35 * hash01(i, 4)), Math.max(3, lh * 0.12), 3); ctx.fill();
    ctx.fillStyle = 'rgba(167,172,178,0.22)';
    M.rrect(ctx, x + hdr * 0.12, ly + lh * 0.55, hdr * 0.5, Math.max(2, lh * 0.08), 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // clips
  for (const c of o.clips || []) {
    const cx0 = X(c.x0), cx1 = X(c.x1), ly = top + c.lane * lh;
    if (cx1 - cx0 < 2 || (c.a ?? 1) <= 0) continue;
    ctx.save(); ctx.globalAlpha *= c.a ?? 1;
    const s = c.s ?? 1;
    const ch = (lh - 6) * s, cy = ly + 3 + (lh - 6) * (1 - s) / 2;
    M.rrect(ctx, cx0 + 1, cy, cx1 - cx0 - 2, ch, Math.min(5, lh * 0.1));
    const cg = ctx.createLinearGradient(0, cy, 0, cy + ch);
    cg.addColorStop(0, c.hi ? '#6d747e' : '#565c65'); cg.addColorStop(1, c.hi ? '#4b5159' : '#3a3f46');
    ctx.fillStyle = cg; ctx.fill();
    ctx.fillStyle = 'rgba(226,234,245,0.30)'; ctx.fillRect(cx0 + 2, cy, cx1 - cx0 - 4, 1.5);
    ctx.save(); ctx.beginPath(); ctx.rect(cx0 + 1, cy, cx1 - cx0 - 2, ch); ctx.clip();
    if (c.wave) c.wave(ctx, cx0 + 1, cy, cx1 - cx0 - 2, ch);
    else if (c.midi) {
      const r = mulberry32(c.seed ?? 1);
      ctx.fillStyle = 'rgba(232,237,243,0.85)';
      for (let k = 0; k < (cx1 - cx0) / 14; k++) ctx.fillRect(cx0 + 4 + k * 14, cy + ch * (0.15 + 0.7 * r()), 9, Math.max(2, ch * 0.07));
    } else clipBars(ctx, cx0 + 1, cy, cx1 - cx0 - 2, ch, c.seed ?? 3, c.d ?? 1, 0.7);
    ctx.restore();
    ctx.restore();
  }
  // playhead
  if (o.play != null && o.play >= 0) {
    const px = X(o.play);
    if (o.caret == null || o.caret) {
      ctx.fillStyle = C.white; ctx.fillRect(px - 1, y, 2, h);
      ctx.beginPath(); ctx.moveTo(px - 8, y); ctx.lineTo(px + 8, y); ctx.lineTo(px, y + 10); ctx.fill();
      glowAt(ctx, px, y + h / 2, 30, h * 0.6, 0.08);
    }
  }
  ctx.restore();
}

// a screen in a dark room: bezel, face, emitted light, spill. content(ctx, x, y, w, h) draws inside.
function monitor(ctx, cx, cy, sw, I, content, { stand = true, emit = 0.22 } = {}) {
  const sh = sw * 0.5625, x = cx - sw / 2, y = cy - sh / 2;
  // spill on the wall behind + bloom of the face
  glowAt(ctx, cx, cy, sw * 1.5, sw * 1.05, 0.10 * I);
  if (stand) {
    ctx.fillStyle = '#08090a';
    ctx.beginPath(); ctx.moveTo(cx - sw * 0.06, y + sh); ctx.lineTo(cx + sw * 0.06, y + sh); ctx.lineTo(cx + sw * 0.09, y + sh + sw * 0.16); ctx.lineTo(cx - sw * 0.09, y + sh + sw * 0.16); ctx.fill();
    ctx.fillRect(cx - sw * 0.2, y + sh + sw * 0.155, sw * 0.4, sw * 0.018);
    ctx.fillStyle = la(0.05 * I); ctx.fillRect(cx - sw * 0.2, y + sh + sw * 0.155, sw * 0.4, 1.5);
  }
  M.rrect(ctx, x - sw * 0.018, y - sw * 0.018, sw * 1.036, sh + sw * 0.036, sw * 0.012);
  ctx.fillStyle = '#0b0c0e'; ctx.fill();
  ctx.strokeStyle = la(0.07 * I); ctx.lineWidth = 1.5; ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, sw, sh); ctx.clip();
  if (content) content(ctx, x, y, sw, sh);
  ctx.fillStyle = la(emit * I); ctx.globalCompositeOperation = 'lighter'; ctx.fillRect(x, y, sw, sh);
  ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(0.30 * I);
  ctx.drawImage(SPR.rectGlow, cx - sw, cy - sh * 1.0, sw * 2, sh * 2);
  ctx.restore();
}

function desk(ctx, y, cx, I, w = W) {
  const g = ctx.createLinearGradient(0, y, 0, H);
  g.addColorStop(0, '#0a0b0d'); g.addColorStop(1, '#040405');
  ctx.fillStyle = g; ctx.fillRect(0, y, w, H - y);
  ctx.fillStyle = la(0.06 * I); ctx.fillRect(0, y, w, 1.5);
  glowAt(ctx, cx, y + 40, 700, 160, 0.10 * I);
}

function headphones(ctx, x, y, s, rim, back = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  if (back > 0) glowAt(ctx, 0, -60, 420, 300, back);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#030304'; ctx.lineWidth = 26;
  ctx.beginPath(); ctx.arc(0, 0, 150, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
  ctx.strokeStyle = la(rim); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, -2, 162, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
  for (const sx of [-1, 1]) {
    const ex = sx * 150 * Math.cos(Math.PI * 0.08), ey = 150 * Math.sin(Math.PI * 0.08) + 30;
    ctx.fillStyle = '#030304'; M.rrect(ctx, ex - 46, ey - 40, 92, 130, 34); ctx.fill();
    ctx.strokeStyle = la(rim * 0.8); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(ex, ey + 10, 44, Math.PI * 1.15, Math.PI * 1.75); ctx.stroke();
    ctx.fillStyle = '#030304'; ctx.fillRect(ex - 8, ey - 70, 16, 40);
  }
  ctx.restore();
}

function fader(ctx, u, pos, { blurBack = true, I = 1 } = {}) {
  fill(ctx, '#060708');
  glowAt(ctx, W * 0.5, H * 0.1, 900, 500, 0.10 * I);
  // other faders, out of focus
  if (blurBack) {
    ctx.save(); ctx.filter = 'blur(7px)';
    for (const [fx, fp] of [[0.18, 0.42], [0.32, 0.61], [0.68, 0.35], [0.82, 0.55]]) {
      const X = W * fx;
      ctx.fillStyle = '#020203'; ctx.fillRect(X - 10, H * 0.08, 20, H * 0.84);
      ctx.fillStyle = '#2a2d32'; M.rrect(ctx, X - 52, H * (0.8 - 0.6 * fp) - 26, 104, 52, 8); ctx.fill();
      ctx.fillStyle = la(0.18); ctx.fillRect(X - 50, H * (0.8 - 0.6 * fp) - 26, 100, 2);
    }
    ctx.filter = 'none'; ctx.restore();
  }
  const X = W * 0.5;
  // groove + scale
  ctx.fillStyle = '#010101'; M.rrect(ctx, X - 14, H * 0.06, 28, H * 0.9, 14); ctx.fill();
  ctx.strokeStyle = la(0.06); ctx.lineWidth = 1; ctx.stroke();
  for (let k = 0; k <= 20; k++) {
    const yy = H * 0.12 + (H * 0.76) * (k / 20);
    const big = k % 5 === 0;
    ctx.fillStyle = la(big ? 0.28 : 0.12);
    ctx.fillRect(X + 60, yy, big ? 46 : 24, 1.5); ctx.fillRect(X - 60 - (big ? 46 : 24), yy, big ? 46 : 24, 1.5);
  }
  // cap
  const cy = H * (0.82 - 0.66 * pos);
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; M.rrect(ctx, X - 92, cy - 40 + 14, 184, 84, 12); ctx.fill();
  const g = ctx.createLinearGradient(0, cy - 40, 0, cy + 40);
  g.addColorStop(0, '#9aa1aa'); g.addColorStop(0.12, '#5b6068'); g.addColorStop(0.5, '#2b2e33'); g.addColorStop(0.55, '#16181b'); g.addColorStop(1, '#3a3e44');
  ctx.fillStyle = g; M.rrect(ctx, X - 90, cy - 40, 180, 80, 12); ctx.fill();
  ctx.fillStyle = la(0.85); ctx.fillRect(X - 86, cy - 1, 172, 2.5);
  ctx.fillStyle = la(0.35); ctx.fillRect(X - 84, cy - 39, 168, 1.5);
  glowAt(ctx, X - 30, cy - 38, 120, 18, 0.25 * I);
}

// a real image (pre-graded sprite) as a print floating in the dark
function photoPrint(ctx, img, cx, cy, h, a = 1, light = 0) {
  const w = h * img.width / img.height;
  ctx.save(); ctx.globalAlpha = clamp(a);
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(cx - w / 2 + 18, cy - h / 2 + 24, w, h);
  ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  if (light > 0) {
    const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
    g.addColorStop(0, la(0.0)); g.addColorStop(clamp(light), la(0.10)); g.addColorStop(clamp(light + 0.25), la(0.0));
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
  }
  ctx.restore();
}

// ------------------------------------------------------------------ SZENE 1: SCHWARZBILD (b0-20)
const MON = { cx: W * 0.5, cy: H * 0.43, sw: 700 };

function s01(ctx) { fill(ctx, C.deep); }

function standbyLED(ctx, u, a = 1) {
  const k = springU(u, 5, SPRING.snappy);
  if (k <= 0) return;
  const x = MON.cx + MON.sw * 0.47, y = MON.cy + MON.sw * 0.5625 / 2 + MON.sw * 0.009;
  const pulse = 0.85 + 0.15 * Math.sin((u - 5) * 2.2);
  ctx.fillStyle = la(0.95 * a * k * pulse); ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill();
  glowAt(ctx, x, y, 34, 34, 0.5 * a * k * pulse);
}

function s02(ctx, u) {
  fill(ctx, C.deep);
  standbyLED(ctx, u);
}

function bootScreen(ctx, x, y, w, h, I) {
  const g = ctx.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, w * 0.7);
  g.addColorStop(0, `rgba(214,222,234,${0.78 * I})`); g.addColorStop(1, `rgba(176,188,204,${0.70 * I})`);
  ctx.fillStyle = '#000'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
}

function dawStart(ctx, x, y, w, h, u) {    // the empty project as it looks on the small screen
  daw(ctx, x, y, w, h, { lanes: 8, bars: 16, laneReveal: (i) => prog(u, 11 + i * 0.2, 11.5 + i * 0.2), play: 0, caret: u < 12 || Math.floor((u - 12) * 2) % 2 === 0 });
}

function s03(ctx, u) {
  fill(ctx, '#040405');
  const k = u - 7.5;
  const s = lz(1.0, 1.07, prog(u, 7.5, 11));
  ctx.save(); camera(ctx, s, ...hand(u, 2, 3));
  const wake = E.outExpo(prog(k, 0, 0.45)), open = E.outExpo(prog(k, 0.35, 1.3));
  const flick = 1 - 0.45 * bump(k, 1.55, 0.12) - 0.3 * bump(k, 1.9, 0.08);
  const I = (0.15 + 0.85 * open) * flick;
  // desk + keyboard catch the light
  desk(ctx, MON.cy + MON.sw * 0.5625 / 2 + MON.sw * 0.17, MON.cx, I * open);
  const sw = MON.sw, sh = sw * 0.5625, x = MON.cx - sw / 2, y = MON.cy - sh / 2;
  // bezel (only once the light reaches it)
  M.rrect(ctx, x - 12, y - 12, sw + 24, sh + 24, 8); ctx.fillStyle = '#0b0c0e'; ctx.fill();
  ctx.strokeStyle = la(0.07 * open); ctx.lineWidth = 1.5; ctx.stroke();
  // the line, then the face
  const lw = sw * wake, lh = Math.max(2, sh * open);
  ctx.save(); ctx.beginPath(); ctx.rect(MON.cx - lw / 2, MON.cy - lh / 2, lw, lh); ctx.clip();
  const toApp = prog(k, 2.2, 3.2);
  bootScreen(ctx, x, y, sw, sh, I * (1 - toApp));
  if (toApp > 0) { ctx.globalAlpha = toApp; dawStart(ctx, x, y, sw, sh, 11); ctx.globalAlpha = 1; }
  ctx.restore();
  glowAt(ctx, MON.cx, MON.cy, sw * 1.6, sw * 1.1, 0.12 * I * open);
  standbyLED(ctx, u, 1 - open);
  ctx.restore();
  vignette(ctx, 0.6);
}

function s04(ctx, u) {
  fill(ctx, '#050506');
  const s = lz(1.0, 1.035, prog(u, 11, 14));
  ctx.save(); camera(ctx, s, ...hand(u, 2.5, 5));
  const m = 40;
  daw(ctx, m, m * 0.6, W - 2 * m, H - 1.2 * m, {
    lanes: 8, bars: 16,
    laneReveal: (i) => E.outCubic(prog(u, 11 + i * 0.2, 11.6 + i * 0.2)),
    play: 0.002, caret: u < 12 || Math.floor((u - 12) * 2) % 2 === 0,
  });
  // glass: a soft reflection across the screen
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, la(0.035)); g.addColorStop(0.4, la(0.0)); g.addColorStop(1, la(0.015));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  vignette(ctx, 0.5);
}

function pianoKey(ctx, x, w, top, bottom, press, light, blur) {
  // a white key seen from the front and a little above: top surface + front lip
  const d = press * 22;
  ctx.save();
  if (blur) ctx.filter = `blur(${blur}px)`;
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, `rgba(${Math.round(150 * light)},${Math.round(156 * light)},${Math.round(166 * light)},1)`);
  g.addColorStop(0.55, `rgba(${Math.round(205 * light)},${Math.round(211 * light)},${Math.round(220 * light)},1)`);
  g.addColorStop(1, `rgba(${Math.round(232 * light)},${Math.round(236 * light)},${Math.round(242 * light)},1)`);
  M.rrect(ctx, x, top + d, w, bottom - top, 10); ctx.fillStyle = g; ctx.fill();
  // front lip
  const lip = ctx.createLinearGradient(0, bottom + d, 0, bottom + d + 90);
  lip.addColorStop(0, `rgba(${Math.round(120 * light)},${Math.round(126 * light)},${Math.round(136 * light)},1)`);
  lip.addColorStop(1, 'rgba(10,10,12,1)');
  ctx.fillStyle = lip; M.rrect(ctx, x, bottom + d - 6, w, 96 - d * 0.6, 8); ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${0.35 * light})`; ctx.fillRect(x + 8, bottom + d - 4, w - 16, 2);
  const sp = ctx.createLinearGradient(x, 0, x + w, 0);
  sp.addColorStop(0, 'rgba(255,255,255,0)'); sp.addColorStop(0.18, `rgba(255,255,255,${0.10 * light})`); sp.addColorStop(0.3, 'rgba(255,255,255,0)');
  ctx.fillStyle = sp; M.rrect(ctx, x, top + d, w, bottom - top, 10); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x + w - 6, top + d, 6, bottom - top);
  ctx.restore();
}

function s05(ctx, u) {
  fill(ctx, '#030304');
  const s = lz(1.04, 1.0, E.outCubic(prog(u, 14, 16)));
  ctx.save(); camera(ctx, s, ...hand(u, 1.5, 9));
  const press = E.outCubic(prog(u, 13.96, 14.1)) * (1 - 0.15 * E.inOutSine(prog(u, 15, 16)));
  const kw = 600, gap = 14, top = H * 0.08, bottom = H * 0.74;
  const x1 = W / 2 - kw / 2;
  glowAt(ctx, W * 0.25, -100, 1100, 700, 0.18);
  pianoKey(ctx, x1 - kw - gap, kw, top, bottom, 0, 0.62, 7);
  pianoKey(ctx, x1 + kw + gap, kw, top, bottom, 0, 0.55, 7);
  pianoKey(ctx, x1, kw, top, bottom, press, 0.9 - 0.18 * press, 0);
  // black keys at the back, between
  ctx.save(); ctx.filter = 'blur(3px)';
  for (const bx of [x1 - gap / 2 - 95, x1 + kw + gap / 2 - 95]) {
    const g = ctx.createLinearGradient(0, -20, 0, H * 0.45);
    g.addColorStop(0, '#000'); g.addColorStop(1, '#15171a');
    ctx.fillStyle = g; M.rrect(ctx, bx, -40, 190, H * 0.46, 10); ctx.fill();
    ctx.fillStyle = 'rgba(226,234,245,0.18)'; ctx.fillRect(bx + 14, H * 0.42, 162, 2);
  }
  ctx.filter = 'none'; ctx.restore();
  // a cold key light from the upper left, grazing
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, 'rgba(226,234,245,0.07)'); g.addColorStop(0.6, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  vignette(ctx, 0.7, 0.3);
}

function roomWide(ctx, u, { cx = W * 0.54, cy = H * 0.44, sw = 380, I = 0.7, flick = 0, keys = false, hp = false, seedCam = 11, push = [1, 1.08], u0 = 16, u1 = 20, drift = 2 } = {}) {
  fill(ctx, '#040405');
  const s = lz(push[0], push[1], E.inOutSine(prog(u, u0, u1)));
  ctx.save(); camera(ctx, s, ...hand(u, drift, seedCam));
  const fl = 1 + flick * noise1(u * 2.3, 4);
  const sh = sw * 0.5625;
  // the back wall takes the light
  glowAt(ctx, cx, cy - sh * 0.2, sw * 2.6, sw * 1.6, 0.09 * I * fl);
  desk(ctx, cy + sh / 2 + sw * 0.17, cx, I * fl * 0.8);
  monitor(ctx, cx, cy, sw, I * fl, (c, x, y, w, h) => daw(c, x, y, w, h, { lanes: 8, bars: 16, play: 0.3, clips: [] }), { emit: 0.16 });
  if (hp) headphones(ctx, cx + sw * 0.85, cy + sh / 2 + sw * 0.12, 0.36, 0.22 * I * fl);
  if (keys) {
    ctx.save(); ctx.filter = 'blur(4px)'; ctx.globalAlpha = 0.9;
    ctx.drawImage(SPR.keys, -200, H - 150, 2400 * 0.9, 300 * 0.9);
    ctx.filter = 'none'; ctx.restore();
  }
  ctx.restore();
  vignette(ctx, 0.62, 0.35);
}

function s06(ctx, u) {
  roomWide(ctx, u, { cx: W * 0.5, cy: H * 0.42, sw: 420, I: 0.75 });
  const a = prog(u, 16.5, 17.5) * (1 - prog(u, 19.0, 19.8));
  ttext(ctx, 'Jeder hat einen Traum.', W / 2, H * 0.83, { size: 72, weight: 300, color: C.white, track: 0.02, alpha: a * 0.95 });
}

// ------------------------------------------------------------------ SZENE 2: DER ANFANG (b20-56)
function facade(ctx, u, { z = 1, lit = 1, fx = null, fy = null, glow = 1 }) {
  const [wx, wy, ww, wh] = winRect(...FAC.lit);
  const tx = fx ?? (wx + ww / 2), ty = fy ?? (wy + wh / 2);
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-tx, -ty);
  ctx.drawImage(SPR.facade, 0, 0);
  // the lit window
  const g = ctx.createLinearGradient(0, wy, 0, wy + wh);
  g.addColorStop(0, `rgba(170,182,198,${0.55 * lit})`); g.addColorStop(0.7, `rgba(214,223,236,${0.9 * lit})`); g.addColorStop(1, `rgba(232,238,246,${0.95 * lit})`);
  ctx.fillStyle = g; ctx.fillRect(wx, wy, ww, wh);
  ctx.fillStyle = `rgba(5,6,7,${0.55 * lit})`; ctx.fillRect(wx + ww * 0.08, wy + wh * 0.62, ww * 0.84, wh * 0.06);   // the desk edge
  ctx.fillStyle = '#0d0f12'; ctx.fillRect(wx + ww / 2 - 2, wy, 4, wh); ctx.fillRect(wx, wy + wh * 0.38 - 2, ww, 4);
  ctx.fillStyle = la(0.10 * lit); ctx.fillRect(wx - 14, wy + wh + 10, ww + 28, 3);
  glowAt(ctx, wx + ww / 2, wy + wh / 2, ww * 1.6, wh * 1.3, 0.22 * lit * glow);
  ctx.restore();
}

function s07(ctx, u) {
  fill(ctx, '#050506');
  const p = prog(u, 20, 30);
  const z = lz(0.76, 2.1, E.inOutSine(p)) * lz(1, 3.2, E.inExpo(prog(u, 28.6, 30)));
  const d = hand(u, 3, 21);
  ctx.save(); ctx.translate(d[0], d[1]);
  facade(ctx, u, { z, lit: 0.95, glow: 1 });
  ctx.restore();
  // the push-through: the window's light takes the frame
  const thr = E.inQuad(prog(u, 29.2, 30));
  if (thr > 0) { ctx.fillStyle = `rgba(200,210,224,${0.3 * thr})`; ctx.fillRect(0, 0, W, H); }
  vignette(ctx, 0.6, 0.38);
  // location super
  const a = E.outCubic(prog(u, 21, 22)) * (1 - prog(u, 27, 28));
  const sx = 120, sy = H - 118;
  ctx.fillStyle = `rgba(167,172,178,${0.7 * a})`; ctx.fillRect(sx, sy - 56, 64 * E.outCubic(prog(u, 21, 22.2)), 2);
  ttext(ctx, 'BRANDENBURG AN DER HAVEL', sx, sy + (1 - E.outCubic(prog(u, 21, 22))) * 10, { size: 40, weight: 500, fam: UI, color: C.white, track: 0.3, align: 'left', alpha: a * 0.92 });
}

function s08(ctx, u) {
  roomWide(ctx, u, { cx: W * 0.38, cy: H * 0.45, sw: 640, I: 0.8, hp: true, push: [1.0, 1.06], u0: 30, u1: 36, seedCam: 31, drift: 3 });
  // arrival from the window's light
  const a = 1 - E.outCubic(prog(u, 30, 30.7));
  if (a > 0) { ctx.fillStyle = `rgba(200,210,224,${0.3 * a})`; ctx.fillRect(0, 0, W, H); }
}

function waveClip(ctx, x, y, w, h, upto) {
  const cw = VIZ.clipwave, n = cw.length;
  ctx.fillStyle = 'rgba(214,221,230,0.85)';
  const bw = w / n;
  for (let i = 0; i < n; i++) {
    if (i / n > upto) break;
    const [lo, hi] = cw[i];
    const a = Math.max(Math.abs(lo), Math.abs(hi));
    const bh = Math.max(1, a * h * 0.44);
    ctx.fillRect(x + i * bw, y + h / 2 - bh, Math.max(1, bw * 0.7), bh * 2);
  }
}

function s09(ctx, u) {
  fill(ctx, '#050506');
  const p = prog(u, 36, 42);
  const play = lerp(0.04, 0.62, p);
  const s = lz(1.0, 1.12, E.inOutSine(p));
  // follow the playhead a little
  const m = 40, w = W - 2 * m, hdr = w * 0.12, px = m + hdr + (w - hdr) * play;
  const [hx, hy, hr] = hand(u, 2.5, 41);
  ctx.save(); camera(ctx, s, hx, hy, hr, lerp(W / 2, px, 0.35), H / 2);
  daw(ctx, m, m * 0.6, w, H - 1.2 * m, {
    lanes: 8, bars: 16, play,
    clips: [{ lane: 2, x0: 0.04, x1: Math.max(0.045, play), hi: true, wave: (c, x, y, ww, hh) => waveClip(c, x, y, (ww / Math.max(0.001, play - 0.04)) * 0.58, hh, (play - 0.04) / 0.58) }],
  });
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, la(0.035)); g.addColorStop(0.4, la(0.0)); g.addColorStop(1, la(0.015));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  vignette(ctx, 0.5);
}

function scopeFrame(t) {
  const fr = Math.floor(t * 25 + 1e-6) - VIZ.scope.from_frame;
  const F = VIZ.scope.frames;
  return F[clamp(fr, 0, F.length - 1)];
}

function scopeLine(ctx, pts, amp, cy, w, alpha = 1) {
  const n = pts.length, x0 = (W - w) / 2;
  const path = new Path2D();
  for (let i = 0; i < n; i++) {
    const edge = Math.sin(Math.PI * i / (n - 1)) ** 0.6;     // taper at both ends
    const x = x0 + (w * i) / (n - 1), y = cy - pts[i] * amp * edge;
    if (i) path.lineTo(x, y); else path.moveTo(x, y);
  }
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = la(0.05 * alpha); ctx.lineWidth = 26; ctx.stroke(path);
  ctx.strokeStyle = la(0.12 * alpha); ctx.lineWidth = 9; ctx.stroke(path);
  ctx.strokeStyle = la(0.85 * alpha); ctx.lineWidth = 2.2; ctx.stroke(path);
  ctx.restore();
}

function s10(ctx, u, t) {
  fill(ctx, '#030304');
  const flat = 1 - 0.93 * E.inOutSine(prog(u, 46.5, 51.5));
  const s = lz(1.0, 1.06, prog(u, 42, 52));
  ctx.save(); camera(ctx, s, ...hand(u, 2, 51));
  glowAt(ctx, W / 2, H / 2, W * 0.55, 160, 0.06);
  scopeLine(ctx, scopeFrame(t), H * 0.26 * flat, H / 2, W * 0.86, 1);
  ctx.restore();
  vignette(ctx, 0.55);
}

function s11(ctx, u, t) {
  fill(ctx, '#030304');
  const build = E.inQuad(prog(u, 52, 56));
  const pts = scopeFrame(t);
  ctx.save(); camera(ctx, lz(1.06, 1.1, prog(u, 52, 56)), ...hand(u, 1.5, 61));
  glowAt(ctx, W / 2, H / 2, W * (0.4 + 0.3 * build), 60 + 120 * build, 0.08 + 0.25 * build);
  scopeLine(ctx, pts, H * 0.26 * 0.07, H / 2, W * (0.86 + 0.1 * build), 0.6 + 0.4 * build);
  ctx.restore();
  vignette(ctx, 0.55);
}

// ------------------------------------------------------------------ SZENE 3: DER WEG (b56-100)
function projectClips(seed, lanes, bars, until, fill = 0.75) {
  const r = mulberry32(seed), clips = [];
  for (let lane = 0; lane < lanes; lane++) {
    let x = r() * 0.08;
    while (x < 1) {
      const len = 0.04 + r() * 0.16;
      if (r() < fill) clips.push({ lane, x0: x, x1: Math.min(1, x + len), seed: Math.floor(r() * 1e6), midi: r() < 0.35, d: 0.6 + r() * 0.5, at: x * until });
      x += len + r() * 0.06;
    }
  }
  return clips;
}
let CLIPS12 = null, CLIPS31 = null;

function s12(ctx, u) {
  fill(ctx, '#050506');
  const p = prog(u, 56, 60);
  const pan = lerp(0, -W * 0.55, E.inOutSine(p));
  ctx.save(); camera(ctx, lz(1.18, 1.1, p), ...hand(u, 2.5, 71));
  ctx.translate(pan, 0);
  const clips = CLIPS12.map((c) => {
    const appear = 56 + c.at;
    const k = springU(u, appear, SPRING.snappy);
    return { ...c, a: clamp(k * 1.5), s: clamp(0.6 + 0.4 * k, 0, 1.08) };
  }).filter((c) => c.a > 0);
  daw(ctx, 40, 24, W * 1.6, H - 48, { lanes: 10, bars: 24, play: lerp(0.05, 0.55, p), clips });
  ctx.restore();
  vignette(ctx, 0.5);
}

function s13(ctx, u) {
  ctx.save(); camera(ctx, lz(1.0, 1.05, prog(u, 60, 64)), ...hand(u, 2, 81));
  fader(ctx, u, 0.06 + 0.86 * E.inOutCubic(prog(u, 60.3, 63.4)));
  ctx.restore();
  vignette(ctx, 0.6);
}

// the real releases: 2024 alone, then the long way, then 2026 (dates from Spotify)
const TL = { y: H * 0.80, rowHit: [68, 68.5, 69, 69.5, 70, 70.5, 71] };
function s14(ctx, u) {
  fill(ctx, '#050506');
  // one continuous world: 2024 at x 0..W, 2025 passes at 1.1 W, 2026 at 2.2 W
  const camX = kf(u, [[64, 0], [66.4, 60], [67.9, W * 2.2], [72, W * 2.2 + 40]], E.inOutCubic);
  const [hx, hy, hr] = hand(u, 2, 91);
  ctx.save(); camera(ctx, lz(1.0, 1.04, prog(u, 64, 72)), hx, hy, hr);
  ctx.translate(-camX, 0);
  // the path and the light travelling it
  ctx.fillStyle = 'rgba(167,172,178,0.45)'; ctx.fillRect(camX - 200, TL.y, W + 400, 1.5);
  for (let x = Math.floor((camX - 200) / 100) * 100; x < camX + W + 200; x += 100) ctx.fillRect(x, TL.y - (x % 500 === 0 ? 10 : 4), 1.5, x % 500 === 0 ? 20 : 8);
  glowAt(ctx, camX + W * 0.5, TL.y, 300, 26, 0.55);
  glowAt(ctx, camX + W * 0.5, TL.y, 46, 46, 0.85);
  // years, large and faint
  for (const [x, yr] of [[W * 0.06, '2024'], [W * 1.12, '2025'], [W * 2.2 + W * 0.06, '2026']]) {
    ttext(ctx, yr, x, H * 0.30, { size: 220, weight: 200, color: C.silver, track: 0.02, align: 'left', alpha: 0.12 });
  }
  // 2024: Die Geisterbahn
  {
    const c = COVERS[0], on = E.outCubic(prog(u, 64.05, 64.8));
    const size = 460, x = W * 0.31, y = H * 0.46;
    ctx.save(); ctx.globalAlpha = 0.15 + 0.85 * on;
    ctx.drawImage(SPR.coversG[c.k], x - size / 2, y - size / 2 + (1 - on) * 20, size, size);
    ctx.restore();
    glowAt(ctx, x, y, size * 0.9, size * 0.9, 0.07 * on);
    ttext(ctx, c.title, x + size / 2 + 60, y - 4, { size: 58, weight: 500, color: C.white, track: 0.1, align: 'left', alpha: on });
    ttext(ctx, c.date, x + size / 2 + 60, y + 60, { size: 38, weight: 400, fam: UI, color: '#d2d6db', track: 0.08, align: 'left', alpha: on * 0.9 });
    ctx.fillStyle = `rgba(226,234,245,${0.9 * on})`; ctx.beginPath(); ctx.arc(x, TL.y, 5, 0, Math.PI * 2); ctx.fill();
  }
  // 2026: seven releases in four months
  const row = COVERS.slice(1), size = 230, gap = 30, rowW = row.length * size + (row.length - 1) * gap;
  const x0 = W * 2.2 + W / 2 - rowW / 2, y = H * 0.50;
  row.forEach((c, i) => {
    const k = springU(u, TL.rowHit[i], SPRING.snappy);
    if (k <= 0) return;
    const x = x0 + i * (size + gap);
    ctx.save(); ctx.globalAlpha = clamp(k * 1.4);
    ctx.drawImage(SPR.coversG[c.k], x, y - size / 2 + (1 - k) * 40, size, size);
    ctx.restore();
    const flash = Math.exp(-Math.max(0, u - TL.rowHit[i]) * 3);
    glowAt(ctx, x + size / 2, y, size * 0.85, size * 0.85, 0.12 * flash);
    ttext(ctx, c.date, x + size / 2, y + size / 2 + 52, { size: 28, weight: 400, fam: UI, color: '#d2d6db', track: 0.04, alpha: clamp(k) * 0.9 });
    if (c.sub) ttext(ctx, c.sub, x + size / 2, y + size / 2 + 92, { size: 24, weight: 500, fam: UI, color: C.white, track: 0.3, alpha: clamp(k) * 0.9 });
    ctx.fillStyle = `rgba(226,234,245,${0.85 * clamp(k)})`; ctx.beginPath(); ctx.arc(x + size / 2, TL.y, 4, 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();
  vignette(ctx, 0.5);
}

function s15(ctx, u) {
  fill(ctx, '#050506');
  const p = prog(u, 72, 80);
  ctx.save(); camera(ctx, lz(1.0, 1.06, E.inOutSine(p)), -60 * p, 0, -0.004 * p);
  const tw = 560, th = 315, gap = 30;
  const x0 = W / 2 - (3 * tw + 2 * gap) / 2, y0 = H * 0.47 - (2 * th + gap) / 2;
  YT.forEach((k, i) => {
    const x = x0 + (i % 3) * (tw + gap), y = y0 + Math.floor(i / 3) * (th + gap);
    const on = 72 + i * 0.9;
    const lit = E.outCubic(prog(u, on, on + 0.35));
    const flash = Math.exp(-Math.max(0, u - on) * 2.5) * (u >= on ? 1 : 0);
    ctx.save(); ctx.globalAlpha = 0.32 + 0.6 * lit;
    ctx.drawImage(SPR.ytG[k], x, y, tw, th);
    ctx.restore();
    ctx.strokeStyle = la(0.10 + 0.25 * flash); ctx.lineWidth = 1.5; ctx.strokeRect(x, y, tw, th);
    glowAt(ctx, x + tw / 2, y + th / 2, tw * 0.75, th * 0.75, 0.10 * flash);
  });
  ctx.restore();
  vignette(ctx, 0.55);
  const a = E.outCubic(prog(u, 72.5, 73.5)) * (1 - prog(u, 79, 79.8));
  ctx.fillStyle = `rgba(167,172,178,${0.7 * a})`; ctx.fillRect(120, H - 174, 64, 2);
  ttext(ctx, 'YOUTUBE · SEIT 2022', 120, H - 118, { size: 40, weight: 500, fam: UI, color: C.white, track: 0.3, align: 'left', alpha: a * 0.92 });
}

function s16(ctx, u) {
  fill(ctx, '#040405');
  // three rows over the full height: two far rows out of focus, one near row sharp and fast
  const rows = [[0.16, 230, 900, 5, 0.38, 0], [0.84, 230, 1050, 5, 0.38, 3], [0.5, 440, 2600, 0, 0.95, 5]];
  for (const [fy, size, speed, blur, alpha, sh] of rows) {
    const off = -(u - 80) * speed * 0.4;
    const span = 10 * (size + 50);
    ctx.save(); if (blur) ctx.filter = `blur(${blur}px)`;
    ctx.globalAlpha = alpha;
    for (let i = 0; i < 10; i++) {
      const c = COVERS[(i + sh) % 8];
      const x = (((i * (size + 50) + off) % span) + span) % span - size;
      if (x > W) continue;
      ctx.drawImage(SPR.coversG[c.k], x, H * fy - size / 2, size, size);
    }
    ctx.filter = 'none'; ctx.restore();
  }
  // everything collapses into one line of light (into the name)
  const col = E.inCubic(prog(u, 83, 84));
  if (col > 0) {
    ctx.fillStyle = `rgba(4,4,5,${col})`; ctx.fillRect(0, 0, W, H);
    glowAt(ctx, W / 2, H / 2, W * 0.6, 30 + 40 * (1 - col), 0.6 * col);
    ctx.fillStyle = la(0.9 * col); ctx.fillRect(W * 0.1, H / 2 - 1, W * 0.8, 2);
  }
  vignette(ctx, 0.55);
}

function s17(ctx, u) {
  fill(ctx, '#030304');
  const s = lz(1.0, 1.05, prog(u, 84, 90));
  ctx.save(); camera(ctx, s, ...hand(u, 1.5, 111));
  const size = 220, track = lerp(0.34, 0.44, E.outCubic(prog(u, 84, 90)));
  const f = font(size, 200, DISPLAY);
  const word = 'JASON';
  const L = layout(ctx, word, f, track * size);
  const x0 = W / 2 - L.width / 2, base = H / 2 + size * 0.36;
  // the line it grows from
  const line = 1 - E.outCubic(prog(u, 84, 85.5));
  if (line > 0) { ctx.fillStyle = la(0.9 * line); ctx.fillRect(W * 0.1 + W * 0.3 * (1 - line), H / 2 - 1, W * 0.8 * line, 2); }
  ctx.font = f; ctx.letterSpacing = '0px'; ctx.textAlign = 'center';
  L.glyphs.forEach((g, i) => {
    const t0 = 84 + i * 0.5;
    const draw = E.inOutCubic(prog(u, t0, t0 + 0.9));
    if (draw <= 0) return;
    const fillA = E.outCubic(prog(u, t0 + 0.6, t0 + 1.4));
    const gx = x0 + g.cx;
    ctx.save();
    ctx.setLineDash([1600, 1600]); ctx.lineDashOffset = 1600 * (1 - draw);
    ctx.strokeStyle = la(0.9); ctx.lineWidth = 1.6;
    ctx.strokeText(g.ch, gx, base);
    ctx.setLineDash([]);
    ctx.fillStyle = la(0.92 * fillA); ctx.fillText(g.ch, gx, base);
    ctx.restore();
  });
  glowAt(ctx, W / 2, H / 2, W * 0.45, 200, 0.10 * E.outCubic(prog(u, 85, 87)));
  ctx.restore();
  const out = E.inCubic(prog(u, 89.3, 90));
  if (out > 0) { ctx.fillStyle = `rgba(3,3,4,${out})`; ctx.fillRect(0, 0, W, H); }
  vignette(ctx, 0.5);
}

function s18(ctx, u) {
  fill(ctx, '#030304');
  const p = prog(u, 90, 94);
  ctx.save(); camera(ctx, lz(1.0, 1.07, E.inOutSine(p)), ...hand(u, 2, 121));
  glowAt(ctx, W * 0.42, H * 0.3, 900, 700, 0.07);
  const a = E.outCubic(prog(u, 90, 91.2));
  photoPrint(ctx, SPR.photoG, W / 2, H / 2, H * 0.86, a, lerp(-0.3, 1.1, p));
  ctx.restore();
  // its light collapses toward the logo
  const c = E.inCubic(prog(u, 93.2, 94));
  if (c > 0) { glowAt(ctx, W / 2, H / 2, W * (0.7 - 0.4 * c), H * (0.6 - 0.3 * c), 0.6 * c); ctx.fillStyle = `rgba(3,3,4,${0.8 * c})`; ctx.fillRect(0, 0, W, H); }
  vignette(ctx, 0.6);
}

function logoDraw(ctx, cx, cy, w, a = 1, sweep = -1) {
  const img = SPR.logoA, h = w * img.height / img.width;
  ctx.save(); ctx.globalAlpha = clamp(a);
  ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  ctx.restore();
  if (sweep > -0.5 && sweep < 1.5) {
    const sc = SPR.scratch, g = sc.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'copy';
    g.drawImage(img, 0, 0, sc.width, sc.height);
    g.globalCompositeOperation = 'source-in';
    const gr = g.createLinearGradient(0, 0, sc.width, sc.height);
    const c0 = sweep - 0.12, c1 = sweep, c2 = sweep + 0.12;
    gr.addColorStop(clamp(c0), 'rgba(255,255,255,0)'); gr.addColorStop(clamp(c1), 'rgba(255,255,255,0.85)'); gr.addColorStop(clamp(c2), 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, sc.width, sc.height);
    g.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(a) * 0.7;
    ctx.drawImage(sc, cx - w / 2, cy - h / 2, w, h);
    ctx.restore();
  }
}

function s19(ctx, u) {
  fill(ctx, '#030304');
  const lock = springU(u, 96, SPRING.snappy);
  const pre = E.inCubic(prog(u, 94, 96));
  const s = lz(1.0, 1.035, prog(u, 96, 100));
  ctx.save(); camera(ctx, s, ...hand(u, 1.2, 131));
  // before the lock: the light of the photo, gathering
  if (u < 96) { glowAt(ctx, W / 2, H / 2, W * (0.3 - 0.22 * pre), 26 + 40 * (1 - pre), 0.25 + 0.6 * pre); ctx.fillStyle = la(0.8 * pre); ctx.fillRect(W / 2 - W * 0.3 * (1 - pre), H / 2 - 1, W * 0.6 * (1 - pre), 2); }
  if (u >= 96) {
    const sc = 1.06 - 0.06 * lock;
    glowAt(ctx, W / 2, H * 0.47, W * 0.42, H * 0.36, 0.06 + 0.22 * Math.exp(-(u - 96) * 2.6));
    logoDraw(ctx, W / 2, H / 2, 1060 * sc, clamp(lock * 1.4), lerp(-0.3, 1.4, prog(u, 96.6, 98.6)));
  }
  ctx.restore();
  vignette(ctx, 0.55);
}

// ------------------------------------------------------------------ SZENE 4: DIE ANDERE SEITE (b100-144)
function s20(ctx, u) {
  roomWide(ctx, u, { cx: W * 0.5, cy: H * 0.45, sw: 300, I: 0.6, flick: 0.05, push: [1.0, 1.0], u0: 100, u1: 108, seedCam: 141, drift: 0.8 });
}

function s21(ctx, u) {
  fill(ctx, '#050506');
  const loopU = (u - 108) % 4;
  const play = 0.25 * (loopU / 4);              // one bar of four, over and over
  const s = lz(1.04, 1.12, prog(u, 108, 116));
  const [hx, hy, hr] = hand(u, 2.5, 151);
  ctx.save(); camera(ctx, s, hx, hy, hr - 0.01, W * 0.35, H * 0.45);
  ctx.transform(1, -0.03, 0, 1, 0, 40);
  daw(ctx, 40, 40, W * 1.05, H - 80, {
    lanes: 6, bars: 4, loop: [0, 0.25], play,
    laneReveal: (i) => (i < 3 ? 1 : 0.35),
    clips: [{ lane: 0, x0: 0, x1: 0.25, seed: 5, d: 0.95, hi: true }, { lane: 1, x0: 0, x1: 0.25, midi: true, seed: 9 },
      { lane: 2, x0: 0.0625, x1: 0.19, seed: 13, d: 0.55 }],
  });
  // the jump back: a short flash where the playhead returns
  const jump = Math.exp(-loopU * 6);
  glowAt(ctx, 40 + W * 1.05 * 0.12, H * 0.5, 60, H * 0.5, 0.25 * jump);
  ctx.restore();
  vignette(ctx, 0.6);
}

function s22(ctx, u, t) {
  fill(ctx, '#030304');
  const s = lz(1.0, 1.06, prog(u, 116, 124));
  ctx.save(); camera(ctx, s, ...hand(u, 1.2, 161));
  const tickPhase = ((t - 40.6) % 1 + 1) % 1;
  const colon = tickPhase < 0.5 ? 1 : 0.18;
  const size = 300, y = H / 2 + size * 0.36;
  const col = '#9aa0a8';
  glowAt(ctx, W / 2, H / 2, 700, 260, 0.06);
  ctx.font = font(size, 200, UI); ctx.textAlign = 'center'; ctx.fillStyle = col;
  ctx.fillText('03', W / 2 - size * 0.62, y);
  ctx.fillText('47', W / 2 + size * 0.62, y);
  ctx.fillStyle = `rgba(154,160,168,${colon})`; ctx.fillText(':', W / 2, y - size * 0.04);
  // reflection on a glossy desk
  ctx.save(); ctx.translate(0, 2 * y + 30); ctx.scale(1, -1);
  ctx.globalAlpha = 0.07; ctx.fillStyle = col;
  ctx.fillText('03', W / 2 - size * 0.62, y); ctx.fillText('47', W / 2 + size * 0.62, y);
  ctx.restore();
  const g = ctx.createLinearGradient(0, y + 30, 0, H);
  g.addColorStop(0, 'rgba(3,3,4,0.2)'); g.addColorStop(0.5, 'rgba(3,3,4,0.95)');
  ctx.fillStyle = g; ctx.fillRect(0, y + 30, W, H - y);
  ctx.restore();
  vignette(ctx, 0.6);
}

function s23(ctx, u) {
  fill(ctx, '#020203');
  const p = prog(u, 124, 134);
  const z = lz(1.0, 1.12, E.inOutSine(p));
  const d = hand(u, 2, 171);
  ctx.save(); ctx.translate(d[0], d[1]);
  ctx.globalAlpha = E.outCubic(prog(u, 124, 125)) * (1 - E.inCubic(prog(u, 133.3, 134)));
  cover(ctx, SPR.photoDark, 0, 0, W, H, { fx: 0.5, fy: 0.24, zoom: z });
  ctx.globalAlpha = 1;
  ctx.restore();
  // cold light from the screen, at the right; the left falls into shadow
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(0.45, 'rgba(0,0,0,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  glowAt(ctx, W * 0.95, H * 0.45, W * 0.5, H * 0.7, 0.06);
  vignette(ctx, 0.7, 0.3);
}

function s24(ctx, u) {
  fill(ctx, '#040405');
  facade(ctx, u, { z: lz(0.74, 0.76, prog(u, 134, 138)), lit: 0.85, glow: 0.9 });
  vignette(ctx, 0.6, 0.38);
  fadeBlack(ctx, E.inCubic(prog(u, 137, 138)));
}

function s25(ctx, u) {
  fill(ctx, '#020203');
  const grow = E.inExpo(prog(u, 141.5, 144));
  const base = 0.10 + 0.06 * Math.sin(u * 1.3);
  const I = base + 0.9 * grow;
  const cx = W * 0.52, cy = H * 0.47, w = 260 + 1500 * grow, h = 150 + 700 * grow;
  // a reflection in a window pane: wavering, faint
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 24; i++) {
    const yy = cy - h / 2 + (h * i) / 24;
    const off = 7 * noise1(u * 1.8 + i * 0.37, 191) * (1 - grow);
    ctx.fillStyle = la(0.12 * I); ctx.fillRect(cx - w / 2 + off, yy, w, h / 24 + 0.5);
  }
  ctx.restore();
  glowAt(ctx, cx, cy, w * 1.3, h * 1.5, 0.25 * I);
  vignette(ctx, 0.7, 0.3);
}

// ------------------------------------------------------------------ SZENE 5: DER MOMENT (b144-188)
function rms(t) { const r = VIZ.rms; return r[clamp(Math.floor(t * 25), 0, r.length - 1)]; }
function kickEnv(u, every = 1, from = -1e9) {   // 1 on the beat, decays: picture pulses with the kick
  if (u < from) return 0;
  const k = ((u - from) % every + every) % every;
  return Math.exp(-k * 5);
}

function s26(ctx, u, t) {
  const p = prog(u, 144, 148);
  const water = H * 0.76;
  const sky = ctx.createLinearGradient(0, 0, 0, water);
  sky.addColorStop(0, '#050608'); sky.addColorStop(0.7, '#0f1218'); sky.addColorStop(1, '#1a1f28');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  const rise = E.outCubic(p);
  const pulse = kickEnv(u, 2, 144);
  const [hx, hy, hr] = hand(u, 2.5, 201);
  ctx.save(); camera(ctx, lz(1.08, 1.0, p), hx, hy, hr);
  glowAt(ctx, W * 0.5, water, W * 0.9, H * 0.22, 0.10 + 0.06 * pulse);
  const layers = [[SPR.sky1, 0.25, 1], [SPR.sky2, 0.5, 1], [SPR.sky3, 0.85, 1]];
  for (const [img, par, a] of layers) {
    const y = water - img.height + 30 + (1 - rise) * 260 * par;
    const x = -300 - (u - 144) * 18 * par;
    ctx.globalAlpha = a; ctx.drawImage(img, x, y); ctx.globalAlpha = 1;
  }
  // the river: dark water with the city's lights in streaks
  ctx.fillStyle = '#030405'; ctx.fillRect(-100, water, W + 200, H - water + 100);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const r = mulberry32(211);
  for (let i = 0; i < 90; i++) {
    const x = r() * W, len = 40 + r() * 180, a = 0.05 + r() * 0.14;
    const wob = 6 * noise1(u * 1.5 + i, 213);
    ctx.fillStyle = la(a * (0.7 + 0.6 * pulse)); ctx.fillRect(x + wob, water + 8 + r() * 30, 2 + r() * 3, len);
  }
  ctx.restore();
  ctx.fillStyle = la(0.12); ctx.fillRect(-100, water, W + 200, 1.5);
  ctx.restore();
  vignette(ctx, 0.55, 0.38);
}

function s27(ctx, u) {
  fill(ctx, '#040405');
  const pulse = kickEnv(u, 2, 148);
  const [hx, hy, hr] = hand(u, 2, 221);
  ctx.save(); camera(ctx, lz(1.0, 1.08, prog(u, 148, 152)), hx, hy, hr + 0.04 * prog(u, 148, 152));
  glowAt(ctx, W * 0.5, H * 0.38, 900, 520, 0.14 + 0.28 * pulse);
  headphones(ctx, W * 0.5, H * 0.58, 2.1, 0.35 + 0.5 * pulse);
  ctx.restore();
  vignette(ctx, 0.6);
}

function s28(ctx, u) {
  fill(ctx, '#030304');
  const pulse = kickEnv(u, 2, 152);
  const z = lz(1.04, 1.12, prog(u, 152, 154));
  cover(ctx, SPR.photoG, 0, 0, W, H, { fx: 0.5, fy: 0.3, zoom: z });
  glowAt(ctx, W * 0.5, H * 0.1, W * 0.6, H * 0.4, 0.12 + 0.25 * pulse);
  vignette(ctx, 0.65, 0.32);
}

function s29(ctx, u) {
  const [hx, hy, hr] = hand(u, 3, 231);
  ctx.save(); camera(ctx, lz(1.04, 1.1, prog(u, 154, 156)), hx, hy, hr - 0.02);
  fader(ctx, u, 0.08 + 0.85 * E.outExpo(prog(u, 154.1, 155.4)), { I: 1.3 });
  ctx.restore();
  vignette(ctx, 0.6);
}

function s30(ctx, u) {
  fill(ctx, '#040405');
  const i = clamp(Math.floor(u - 156), 0, 3);
  const c = COVERS[[7, 2, 1, 4][i]];
  const k = u - 156 - i;
  const size = 760 * lz(1.0, 1.06, k);
  glowAt(ctx, W / 2, H / 2, size, size * 0.8, 0.10 * Math.exp(-k * 4));
  ctx.drawImage(SPR.coversG[c.k], W / 2 - size / 2, H / 2 - size / 2, size, size);
  vignette(ctx, 0.6);
}

function s31(ctx, u) {
  fill(ctx, '#050506');
  const p = prog(u, 160, 168);
  const z = lz(1.7, 0.92, E.inOutSine(p));
  ctx.save(); camera(ctx, z, ...hand(u, 3 + 4 * p, 241));
  daw(ctx, -W * 0.1, -H * 0.1, W * 1.2, H * 1.2, { lanes: 16, bars: 32, play: lerp(0.02, 0.98, E.inQuad(p)), clips: CLIPS31 });
  ctx.restore();
  // the light becomes blinding toward the drop, then a breath of black
  const white = E.inCubic(prog(u, 164, 167.75));
  if (white > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = la(0.85 * white); ctx.fillRect(0, 0, W, H); ctx.restore(); }
  if (u >= 167.75) fill(ctx, '#000000');
  vignette(ctx, 0.5);
}

function card(ctx, u, lines, u0, { size = 92, weight = 500, track = 0.12 } = {}) {
  fill(ctx, '#030304');
  const k = u - u0;
  const s = 1.0 + 0.012 * kickEnv(u, 1, u0) + 0.01 * k;
  ctx.save(); camera(ctx, s);
  const lh = size * 1.18, y0 = H / 2 - (lines.length - 1) * lh / 2 + size * 0.36;
  lines.forEach((ln, i) => ttext(ctx, ln, W / 2, y0 + i * lh, { size, weight, color: C.white, track }));
  ctx.restore();
  vignette(ctx, 0.5);
}

function s32(ctx, u) { card(ctx, u, ['DU KENNST DEN NAMEN.'], 168, { size: 112 }); }
function s34(ctx, u) { card(ctx, u, ['DU KENNST DIE MUSIK.'], 174, { size: 112 }); }
function s37(ctx, u) { card(ctx, u, ['ABER KENNST DU', 'DIE GESCHICHTE DAHINTER?'], 184, { size: 96, track: 0.1 }); }

function s33(ctx, u) {
  fill(ctx, '#030304');
  const slam = springU(u, 171, SPRING.snappy);
  const pulse = kickEnv(u, 1, 171);
  ctx.save(); M.shake(ctx, u, 171, 10, 7, 0.15);
  glowAt(ctx, W / 2, H * 0.46, W * 0.55, H * 0.5, 0.15 + 0.45 * pulse);
  logoDraw(ctx, W / 2, H / 2, 1080 * (1.18 - 0.18 * slam), clamp(slam * 1.5));
  ctx.restore();
  vignette(ctx, 0.5);
}

function s35(ctx, u) {
  fill(ctx, '#030304');
  const s = lz(1.0, 1.05, prog(u, 177, 181));
  ctx.save(); camera(ctx, s);
  const size = 400, gap = 24, cols = 4;
  const x0 = W / 2 - (cols * size + (cols - 1) * gap) / 2, y0 = H / 2 - (2 * size + gap) / 2;
  const active = Math.floor((u - 177) * 2) % 8;
  const loud = kickEnv(u, 0.5, 177);
  COVERS.forEach((c, i) => {
    const x = x0 + (i % cols) * (size + gap), y = y0 + Math.floor(i / cols) * (size + gap);
    const on = i === active ? 1 : 0;
    const k = springU(u, 177 + i * 0.06, SPRING.snappy);
    ctx.save(); ctx.globalAlpha = clamp(k * 1.3) * (0.55 + 0.45 * on * (0.6 + 0.4 * loud));
    ctx.drawImage(SPR.coversC[c.k], x, y, size, size);
    ctx.restore();
    if (on) glowAt(ctx, x + size / 2, y + size / 2, size * 0.8, size * 0.8, 0.12 * loud);
  });
  ctx.restore();
  vignette(ctx, 0.5);
}

function s36(ctx, u) {
  fill(ctx, '#030304');
  const pulse = kickEnv(u, 1, 181);
  const z = lz(1.0, 1.1, prog(u, 181, 184));
  cover(ctx, SPR.photoLight, 0, 0, W, H, { fx: 0.5, fy: 0.3, zoom: z });
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  glowAt(ctx, W * 0.5, H * 0.05, W * 0.8, H * 0.55, 0.25 + 0.35 * pulse);
  glowAt(ctx, W * 0.5, H * 0.5, W * 0.9, H * 0.9, 0.06 + 0.12 * E.inCubic(prog(u, 182.5, 184)));
  ctx.restore();
  vignette(ctx, 0.5, 0.35);
}

// ------------------------------------------------------------------ SZENE 6: DER TITEL (b188-212.5)
function s38(ctx, u) {
  fill(ctx, '#020203');
  const s = lz(1.0, 1.03, prog(u, 188, 212));
  ctx.save(); camera(ctx, s);
  const cy = H * 0.47;
  // the streak: a line that opens the frame (the monitor's gesture, once more)
  const open = E.outExpo(prog(u, 188, 188.6));
  const fadeStreak = 1 - 0.55 * E.inOutSine(prog(u, 190, 194));
  const titleOut = E.inOutSine(prog(u, 200, 200.8));
  const settle = E.inOutCubic(prog(u, 189.0, 190.6));
  const sw = W * lerp(0.86, 0.34, settle) * open;
  const ly = cy + 104 * settle;
  if (open > 0 && u < 201) {
    const a = fadeStreak * (1 - titleOut);
    glowAt(ctx, W / 2, ly, sw * 0.6, 34, 0.6 * a);
    glowAt(ctx, W / 2, ly, sw * 0.35, 120, 0.12 * a * (1 - settle));
    ctx.fillStyle = la(0.95 * a); ctx.fillRect(W / 2 - sw / 2, ly - 1, sw, 2);
  }
  // the title, revealed by the light opening vertically
  const rev = E.outCubic(prog(u, 188.25, 189.6));
  if (rev > 0 && titleOut < 1) {
    const size = 150;
    ctx.save(); ctx.beginPath(); ctx.rect(0, cy - size * 0.8 * rev, W, size * 1.6 * rev); ctx.clip();
    ttext(ctx, 'JASON REMIX', W / 2, cy + size * 0.36, { size, weight: 300, color: C.white, track: 0.3, alpha: 1 - titleOut });
    ctx.restore();
    const sub = E.outCubic(prog(u, 196, 197.2));
    ttext(ctx, 'DER WEG HINTER DER MUSIK', W / 2, cy + 196 + (1 - sub) * 10, { size: 58, weight: 400, color: '#d2d6db', track: 0.28, alpha: sub * (1 - titleOut) });
  }
  // a documentary about Jason Bürger
  const doc = E.outCubic(prog(u, 200.6, 201.6)) * (1 - E.inCubic(prog(u, 204.0, 204.8)));
  ttext(ctx, 'EINE DOKUMENTATION ÜBER JASON BÜRGER.', W / 2, cy + 20, { size: 58, weight: 400, color: C.white, track: 0.12, alpha: doc });
  // date + platform
  const d = E.outCubic(prog(u, 205, 205.4)) * (1 - E.inCubic(prog(u, 211, 212.3)));
  ttext(ctx, 'AB SOMMER 2027', W / 2, cy + 10, { size: 108, weight: 500, color: C.white, track: 0.16, alpha: d });
  ctx.fillStyle = `rgba(167,172,178,${0.6 * d})`; ctx.fillRect(W / 2 - 40, cy + 76, 80, 2);
  ttext(ctx, 'EXKLUSIV AUF YOUTUBE', W / 2, cy + 156, { size: 54, weight: 500, color: '#d2d6db', track: 0.26, alpha: d });
  ctx.restore();
  vignette(ctx, 0.5);
}

// ------------------------------------------------------------------ the cut
const SHOTS = [
  [0, 5, s01], [5, 7.5, s02], [7.5, 11, s03], [11, 14, s04], [14, 16, s05], [16, 20, s06],
  [20, 30, s07], [30, 36, s08], [36, 42, s09], [42, 52, s10], [52, 56, s11],
  [56, 60, s12], [60, 64, s13], [64, 72, s14], [72, 80, s15], [80, 84, s16], [84, 90, s17], [90, 94, s18], [94, 100, s19],
  [100, 108, s20], [108, 116, s21], [116, 124, s22], [124, 134, s23], [134, 138, s24], [138, 144, s25],
  [144, 148, s26], [148, 152, s27], [152, 154, s28], [154, 156, s29], [156, 160, s30], [160, 168, s31],
  [168, 171, s32], [171, 174, s33], [174, 177, s34], [177, 181, s35], [181, 184, s36], [184, 188, s37],
  [188, 1e9, s38],
];
function shotAt(u) {
  for (const s of SHOTS) if (u < s[1]) return s;
  return SHOTS[SHOTS.length - 1];
}

// motion-blur samples per shot: more where things move fast, few where the frame is still
const FAST = new Set([s12, s14, s16, s29, s31, s33]);
const STILL = new Set([s01, s02, s20, s22, s32, s34, s37, s38]);

// grain + bloom amount per moment
function bloomAt(u) {
  if (u < 7.5) return 0.4;
  if (u >= 168 && u < 188) return 0.55;
  if (u >= 188) return 0.6;
  return 0.7;
}

M.film({
  fonts: [font(100, 200, DISPLAY), font(100, 300, DISPLAY), font(100, 400, DISPLAY), font(100, 500, DISPLAY),
    font(40, 200, UI), font(40, 400, UI), font(40, 500, UI)],
  images: {
    photo: 'assets/real/jason_foto_biografie.jpg',
    logo: 'assets/real/logo_jason.png',
    cv_geisterbahn: 'assets/real/covers/die_geisterbahn.jpg', cv_zeitgeist: 'assets/real/covers/zeitgeist.jpg',
    cv_monster: 'assets/real/covers/monster_2.jpg', cv_laura: 'assets/real/covers/weite_welt.jpg',
    cv_insel: 'assets/real/covers/eine_insel.jpg', cv_sommernacht: 'assets/real/covers/sommernacht.jpg',
    cv_feeling: 'assets/real/covers/feeling.jpg', cv_holmich: 'assets/real/covers/hol_mich.jpg',
    yt_holmichraus: 'assets/real/youtube/JcmztlDK5jA.jpg', yt_apologize: 'assets/real/youtube/9JBFk2RXUD4.jpg',
    yt_hinundher: 'assets/real/youtube/roB0hbpUr88.jpg', yt_sommernacht: 'assets/real/youtube/HfO-w2XM5LE.jpg',
    yt_outnow: 'assets/real/youtube/kmLAklNSWxg.jpg', yt_morgenkinder: 'assets/real/youtube/zkRQBR8YACE.jpg',
  },
  hits: HITS,
  samples: (t) => {
    const [, , fn] = shotAt(M.U(t));
    return FAST.has(fn) ? 10 : STILL.has(fn) ? 2 : 5;
  },
  async init(ctx, IMG) {
    VIZ = await fetch('audio/viz.json').then((r) => r.json());
    SPR.glow = glowSprite(226, 234, 245);
    SPR.rectGlow = rectGlowSprite();
    SPR.noise = [noiseTile(11), noiseTile(23), noiseTile(37)];
    SPR.facade = facadeSprite();
    SPR.keys = keysSprite();
    SPR.sky1 = skylineSprite(301, 0, 260, 420, '#0a0c10', 0.06, [1400]);
    SPR.sky2 = skylineSprite(302, 0, 320, 560, '#07080b', 0.05, [2300]);
    SPR.sky3 = skylineSprite(303, 0, 420, 700, '#030304', 0.035, null);
    SPR.photoG = graded(IMG.photo, 'grayscale(0.92) contrast(1.08) brightness(0.92)');
    SPR.photoDark = graded(IMG.photo, 'grayscale(0.95) contrast(1.12) brightness(0.72)');
    SPR.photoLight = graded(IMG.photo, 'grayscale(0.6) contrast(1.15) brightness(1.08)');
    SPR.logoA = lumaAlpha(IMG.logo);
    SPR.scratch = canvas(768, 512);
    SPR.coversG = {}; SPR.coversC = {};
    for (const c of COVERS) {
      SPR.coversG[c.k] = graded(IMG[c.img], 'grayscale(1) contrast(1.06) brightness(0.86)', 640, 640);
      SPR.coversC[c.k] = graded(IMG[c.img], 'none', 640, 640);
    }
    SPR.ytG = {};
    for (const k of YT) SPR.ytG[k] = graded(IMG[k], 'grayscale(1) contrast(1.05) brightness(0.8)', 960, 540);
    CLIPS12 = projectClips(1201, 10, 24, 3.6, 0.7);
    CLIPS31 = projectClips(3101, 16, 32, 1, 0.92).map((c) => ({ ...c, a: 1 }));
    SPR.b1 = canvas(480, 270); SPR.b2 = canvas(240, 135);
  },
  draw(ctx, u, t) {
    const [, , fn] = shotAt(u);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.filter = 'none';
    fn(ctx, u, t);
  },
  post(ctx, u, t) {
    // bloom: bright parts, blurred at low resolution, added back
    const amt = bloomAt(u);
    if (amt > 0) {
      const b1 = SPR.b1.getContext('2d'), b2 = SPR.b2.getContext('2d');
      b1.globalCompositeOperation = 'copy'; b1.filter = 'brightness(0.75) contrast(3.2)';
      b1.drawImage(ctx.canvas, 0, 0, 480, 270); b1.filter = 'none';
      b2.globalCompositeOperation = 'copy'; b2.filter = 'blur(5px)'; b2.drawImage(SPR.b1, 0, 0, 240, 135); b2.filter = 'none';
      b1.filter = 'blur(3px)'; b1.drawImage(SPR.b1, 0, 0); b1.filter = 'none';
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.28 * amt; ctx.drawImage(SPR.b1, 0, 0, W, H);
      ctx.globalAlpha = 0.40 * amt; ctx.drawImage(SPR.b2, 0, 0, W, H);
      ctx.restore();
    }
    // film grain: three seeded tiles, a new offset every frame
    const fi = Math.floor(t * 25 + 1e-6);
    const tile = SPR.noise[fi % 3];
    const ox = -Math.floor(hash01(fi, 3) * 512), oy = -Math.floor(hash01(fi, 5) * 512);
    ctx.save();
    ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.16;
    for (let y = oy; y < H; y += 512) for (let x = ox; x < W; x += 512) ctx.drawImage(tile, x, y);
    ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.022;
    for (let y = oy; y < H; y += 512) for (let x = ox; x < W; x += 512) ctx.drawImage(tile, x, y);
    ctx.restore();
  },
});
