/* NOIRE - JavaScript off. Section 17 says every word stays readable. */
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox']
  });
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('file://' + process.argv[2], { waitUntil: 'load' });
  await page.waitForTimeout(900);
  const r = await page.evaluate(() => {
    const txt = document.body.innerText.replace(/\s+/g, ' ').trim();
    const empty = [...document.querySelectorAll('[data-t],[data-th]')].filter(e => !e.textContent.trim());
    return {
      words: txt.split(' ').length,
      loader: !!document.getElementById('load'),
      emptyCopy: empty.length,
      emptyKeys: empty.slice(0, 6).map(e => e.getAttribute('data-t') || e.getAttribute('data-th')),
      h1: (document.getElementById('a1h') || {}).textContent,
      placeholder: (document.getElementById('nlMail') || {}).placeholder,
      posters: document.querySelectorAll('.pl img').length,
      dossierWords: (document.getElementById('dossier') || {}).innerText ?
        document.getElementById('dossier').innerText.split(/\s+/).length : 0
    };
  });
  console.log('no-js     ', JSON.stringify(r));
  await page.evaluate(() => document.getElementById('ds-intro').scrollIntoView());
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, '..', 'shots', 'nojs-dossier.png') });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, '..', 'shots', 'nojs-top.png') });
  await browser.close();
})();
