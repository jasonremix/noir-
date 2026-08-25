/* NOIRE - the dossier: figures, the scale, the accordion, and whether the
   corridor really stops rendering once it is covered. */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });

  await page.goto('file://' + process.argv[2], { waitUntil: 'load' });
  await page.waitForTimeout(4000);

  const shots = ['ds-intro','ds-figures','ds-scale','ds-comp','ds-craft','ds-object','ds-care','ds-faq'];
  for (const id of shots) {
    await page.evaluate(i => document.getElementById(i).scrollIntoView({ block: 'start' }), id);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(__dirname, '..', 'shots', id + '.png') });
  }

  const state = await page.evaluate(() => ({
    figures: document.querySelectorAll('.fig').length,
    gaps: document.querySelectorAll('#dossier .todo').length,
    bands: document.querySelectorAll('.sc-band').length,
    mark: document.querySelector('.sc-mark') ? document.querySelector('.sc-mark').getAttribute('data-label') : null,
    steps: document.querySelectorAll('#steps li').length,
    rows: document.querySelectorAll('#objRows div').length,
    qa: document.querySelectorAll('.qa').length,
    idle: document.documentElement.classList.contains('in-dossier'),
    revealed: document.querySelectorAll('.dr.is-in').length,
    heroValue: (document.querySelector('.fig--hero .n') || {}).textContent
  }));
  console.log('dossier   ', JSON.stringify(state));

  // accordion
  await page.evaluate(() => document.getElementById('ds-faq').scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(500);
  await page.click('.qa:nth-child(6) > button');
  await page.waitForTimeout(800);
  console.log('accordion ', JSON.stringify(await page.evaluate(() => {
    const q = document.querySelector('.qa:nth-child(6)');
    return { open: q.getAttribute('data-open'), expanded: q.querySelector('button').getAttribute('aria-expanded'),
             height: q.querySelector('.ans').getBoundingClientRect().height > 10 };
  })));
  await page.screenshot({ path: path.join(__dirname, '..', 'shots', 'ds-faq-open.png') });

  // table view
  await page.evaluate(() => document.getElementById('ds-scale').scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(400);
  await page.click('#scToggle');
  await page.waitForTimeout(400);
  console.log('table     ', JSON.stringify(await page.evaluate(() => ({
    rows: document.querySelectorAll('#scTable tbody tr').length,
    here: (document.querySelector('#scTable tr[data-here] td') || {}).textContent
  }))));

  // language switch must repaint every computed thing
  await page.click('[data-lang="fr"]');
  await page.waitForTimeout(1000);
  console.log('fr        ', JSON.stringify(await page.evaluate(() => ({
    hero: (document.querySelector('.fig--hero span') || {}).textContent,
    q1: (document.querySelector('.qa > button span') || {}).textContent.slice(0, 46)
  }))));

  console.log('errors    ', errs.length, errs.slice(0, 5).join(' | '));
  await browser.close();
  process.exit(errs.length ? 1 : 0);
})();
