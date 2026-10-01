// verify-ui.mjs — fidelity check: render the rebuilt viewport box (capture DOM + scoped CSS + fonts) alone, at the
// live page's size and DPR 2, and diff it against the real app's screenshot of the same state.
//   node tools/verify-ui.mjs <capture-dir> <work-dir>      (PLAYWRIGHT_MODULE as in capture.mjs)
import fs from 'node:fs';
import path from 'node:path';
import { vpMarkup, VP_RUNTIME_CSS } from './vp.mjs';

const [CAP, WORK] = process.argv.slice(2);
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
fs.mkdirSync(WORK, { recursive: true });
fs.cpSync(path.join(CAP, 'fonts'), path.join(WORK, 'fonts'), { recursive: true });

const cases = [['d', 270], ['d', 0], ['p', 315], ['p', 893]];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const [cut, scroll] of cases) {
  const vp = JSON.parse(fs.readFileSync(path.join(CAP, cut, 'vp.json'), 'utf8'));
  const page = await (await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2 })).newPage();
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${fs.readFileSync(path.join(CAP, 'fonts.css'), 'utf8')}</style>
<style>${fs.readFileSync(path.join(CAP, cut, 'aje.css'), 'utf8')}</style><style>html,body{margin:0;background:#000}${VP_RUNTIME_CSS}</style></head>
<body>${vpMarkup(CAP, cut, { scroll })}<script>
for (const s of document.querySelectorAll('.vp-scroller')) { const y = +s.dataset.scroll; s.style.transform = 'translateY(' + (-y) + 'px)'; const h = s.querySelector('header.top'); if (h) h.style.transform = 'translateY(' + y + 'px)'; }
</script></body></html>`;
  const file = path.join(WORK, `verify-${cut}-${scroll}.html`);
  fs.writeFileSync(file, html);
  await page.goto('file://' + path.resolve(file));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const out = path.join(WORK, `rebuilt-${cut}-${scroll}.png`);
  await page.locator(`.vp-${cut}`).screenshot({ path: out });
  console.log(cut, scroll, 'fonts:', await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family + ' ' + f.weight).join(', ')));
  await page.close();
}
await browser.close();
