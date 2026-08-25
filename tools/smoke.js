/* NOIRE - render the built page in a real browser and report what happens. */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const PAGE = process.argv[2] || path.join(ROOT, 'dist', 'web', 'index.html');
const SHOTS = path.join(ROOT, 'shots');

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
           '--ignore-gpu-blocklist', '--no-sandbox']
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();

  const errors = [], warnings = [], failed = [];
  page.on('console', m => {
    if (m.type() === 'error') errors.push(m.text());
    if (m.type() === 'warning') warnings.push(m.text());
  });
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  page.on('requestfailed', r => failed.push(r.url().slice(0, 90) + ' — ' + (r.failure() || {}).errorText));

  await page.goto('file://' + PAGE, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(4500);

  const probe = async () => page.evaluate(() => ({
    gl: document.documentElement.classList.contains('gl'),
    g: (window.__probe && window.__probe().g) || null,
    depth: (document.getElementById('hudN') || {}).textContent,
    price: (document.getElementById('pNow') || {}).textContent,
    draft: (document.getElementById('draftT') || {}).textContent,
    canvasW: (document.getElementById('gl') || {}).width,
    lang: document.documentElement.lang
  }));

  console.log('initial   ', JSON.stringify(await probe()));

  /* the middle of each act's sticky window, not the seam between two */
  const stops = await page.evaluate(() => Array.from(document.querySelectorAll('.act')).map(el => {
    const top = el.getBoundingClientRect().top + window.pageYOffset;
    return Math.round(top + (el.offsetHeight - window.innerHeight) * 0.62);
  }));
  for (let i = 0; i < stops.length; i++) {
    await page.evaluate(y => window.scrollTo(0, y), stops[i]);
    await page.waitForTimeout(1400);
    const p = await probe();
    console.log('act ' + (i + 1) + '     ', JSON.stringify(p));
    await page.screenshot({ path: path.join(SHOTS, 'act' + (i + 1) + '.png') });
  }

  /* language switch must rebuild everything without throwing */
  await page.click('[data-lang="fr"]');
  await page.waitForTimeout(1200);
  console.log('fr        ', JSON.stringify(await probe()));
  await page.screenshot({ path: path.join(SHOTS, 'lang-fr.png') });
  await page.click('[data-lang="de"]');
  await page.waitForTimeout(800);

  /* legal overlay */
  await page.click('[data-legal="product"]');
  await page.waitForTimeout(600);
  const ov = await page.evaluate(() => ({
    open: !document.getElementById('ov').hidden,
    focus: document.activeElement && document.activeElement.id,
    gaps: document.querySelectorAll('#ovBody .todo').length
  }));
  console.log('overlay   ', JSON.stringify(ov));
  await page.screenshot({ path: path.join(SHOTS, 'legal.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  console.log('esc closed', JSON.stringify(await page.evaluate(() => ({
    open: !document.getElementById('ov').hidden,
    focus: document.activeElement && (document.activeElement.dataset || {}).legal
  }))));

  /* portrait */
  await page.setViewportSize({ width: 414, height: 896 });
  await page.waitForTimeout(1600);
  await page.evaluate(() => { const a = document.getElementById('a7'); window.scrollTo(0, a.getBoundingClientRect().top + window.pageYOffset + (a.offsetHeight - window.innerHeight) * 0.62); });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: path.join(SHOTS, 'portrait.png') });
  console.log('portrait  ', JSON.stringify(await probe()));

  console.log('\nconsole errors :', errors.length);
  errors.slice(0, 14).forEach(e => console.log('   !', e.slice(0, 220)));
  console.log('failed requests:', failed.length);
  failed.slice(0, 8).forEach(e => console.log('   x', e));

  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
