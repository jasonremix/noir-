const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + process.argv[2], { waitUntil: 'load' });
  await page.waitForTimeout(5000);
  for (const [id, frac, name] of [['a6', 0.30, 'retail-a'], ['a6', 0.44, 'retail-b'], ['a6', 0.60, 'retail-c']]) {
    await page.evaluate(([i, f]) => { const el = document.getElementById(i);
      window.scrollTo(0, el.getBoundingClientRect().top + window.pageYOffset + (el.offsetHeight - window.innerHeight) * f); }, [id, frac]);
    await page.waitForTimeout(1600);
    await page.screenshot({ path: path.join(__dirname, '..', 'shots', name + '.png') });
  }
  console.log('shops in DOM:', await page.evaluate(() => document.querySelectorAll('#shops .shop img').length),
              '| makers:', await page.evaluate(() => document.querySelectorAll('#makers .shop img').length),
              '| none-line hidden:', await page.evaluate(() => document.getElementById('shopsNone').hidden),
              '| errors:', errs.length, errs.slice(0,3).join(' | '));
  await browser.close();
})();
