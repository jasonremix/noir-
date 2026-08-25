/* NOIRE - the same page with WebGL switched off: the picture version must
   come up and every word must still be readable. */
const { chromium } = require('playwright');
const path = require('path');

const PAGE = process.argv[2];
(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--disable-webgl', '--disable-webgl2', '--no-sandbox']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });

  await page.goto('file://' + PAGE, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const a5 = await page.evaluate(() => {
    const el = document.getElementById('a5');
    window.scrollTo(0, el.getBoundingClientRect().top + window.pageYOffset + el.offsetHeight * 0.4);
  });
  await page.waitForTimeout(1200);
  const state = await page.evaluate(() => ({
    gl: document.documentElement.classList.contains('gl'),
    postersVisible: document.querySelectorAll('.pl img').length,
    firstPosterBox: (() => { const r = document.querySelector('.pl img').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })(),
    loaderPresent: !!document.getElementById('load'),
    headlineText: document.getElementById('a5h').textContent.trim().slice(0, 40),
    price: document.getElementById('pNow').textContent,
    depth: document.getElementById('hudN').textContent
  }));
  console.log('fallback  ', JSON.stringify(state));
  await page.screenshot({ path: path.join(__dirname, '..', 'shots', 'fallback.png'), fullPage: false });
  for (const id of ['a1', 'a7']) {
    await page.evaluate(i => { const el = document.getElementById(i);
      window.scrollTo(0, el.getBoundingClientRect().top + window.pageYOffset + el.offsetHeight * 0.4); }, id);
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(__dirname, '..', 'shots', 'fallback-' + id + '.png') });
  }
  console.log('errors    ', errors.length, errors.slice(0, 5).join(' | '));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
