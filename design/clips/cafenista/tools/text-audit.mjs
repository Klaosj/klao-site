// text-audit.mjs <cut-folder> <display-width-px> — frame.md's minimum text size, frame by frame.
//   node tools/text-audit.mjs sting-1x1 358.8      (the phone sheet's video box at a 390 viewport)
//   node tools/text-audit.mjs sting-16x9 894.39    (the desktop sheet's video box at 1440)
// The display width is the rendered width of `.sheet-clip` in the open project sheet (the box the
// video fills; not `.smedia`). Re-measure it whenever `.sheet-win` sizing in
// src/components/project-sheet.css changes.
//
// Seeks the paused GSAP timeline to each of the 150 frames and, for every element with its own text,
// takes computed font-size × effective CSS zoom × the product of ancestor transform scales. A run is
// "readable" when its effective opacity is ≥ 0.5, it is visible, its centre is inside the canvas and
// every clipping ancestor, and no other surface covers it. Prints, per run, the largest size and the
// smallest readable size in display px; exits 1 if any readable run is under 13 px Thai / 12 px Latin.
// Uses Playwright through the repo's scripts/qa-lib.mjs (installed Chrome); GSAP loads from its CDN.
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const [cutArg, widthArg] = process.argv.slice(2);
if (!cutArg || !Number(widthArg)) {
  console.error('usage: node tools/text-audit.mjs <cut-folder> <display-width-px>');
  process.exit(2);
}
const dir = resolve(cutArg);
const repo = fileURLToPath(new URL('../../../../', import.meta.url));
const { loadChromium } = await import(new URL('../../../../scripts/qa-lib.mjs', import.meta.url).href);

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png' };
const server = createServer((req, res) => {
  const file = join(dir, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((ok) => server.listen(0, ok));

const html = readFileSync(join(dir, 'index.html'), 'utf8');
const W = Number(html.match(/data-width="(\d+)"/)[1]);
const H = Number(html.match(/data-height="(\d+)"/)[1]);
const chromium = await loadChromium();
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.addInitScript(() => {
  window.__timelines = {};
});
await page.goto(`http://localhost:${server.address().port}/index.html`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

const runs = await page.evaluate(({ W, H }) => {
  const tl = window.__timelines.main;
  const ownText = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
  const els = [...document.querySelectorAll('#root *')].filter((el) => ownText(el));
  const scaleOf = (el) => {
    const t = getComputedStyle(el).transform;
    if (!t || t === 'none') return 1;
    const m = new DOMMatrix(t);
    return Math.hypot(m.a, m.b);
  };
  const surfaceOf = (el) => el.closest('#m-wrap, #a-wrap, #p-wrap, #h-wrap, #s-wrap, #shot');
  const opacityOf = (el) => {
    let o = 1;
    for (let a = el; a; a = a.parentElement) o *= parseFloat(getComputedStyle(a).opacity);
    return o;
  };
  const out = els.map((el) => ({ id: el.id || el.className, text: ownText(el), thai: /[฀-๿]/.test(ownText(el)), max: 0, maxF: -1, min: Infinity, minF: -1 }));
  for (let f = 0; f < 150; f++) {
    tl.seek(f / 30, false);
    els.forEach((el, i) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const b = range.getBoundingClientRect();
      const cx = b.left + b.width / 2;
      const cy = b.top + b.height / 2;
      let op = 1;
      let sc = 1;
      let shown = getComputedStyle(el).visibility === 'visible' && b.width > 0;
      for (let a = el; a && a !== document.documentElement; a = a.parentElement) {
        const cs = getComputedStyle(a);
        op *= parseFloat(cs.opacity);
        sc *= scaleOf(a);
        if (cs.display === 'none') shown = false;
        if (a !== el && (cs.overflow === 'hidden' || cs.overflow === 'clip')) {
          const ab = a.getBoundingClientRect();
          if (cx < ab.left || cx > ab.right || cy < ab.top || cy > ab.bottom) shown = false;
        }
      }
      if (!shown || op < 0.5 || cx < 0 || cx > W || cy < 0 || cy > H) return;
      const top = document.elementFromPoint(cx, cy);
      const mine = surfaceOf(el);
      const over = top && surfaceOf(top);
      if (over && over !== mine && opacityOf(over) > 0.05) return;
      const size = parseFloat(getComputedStyle(el).fontSize) * el.currentCSSZoom * sc;
      const r = out[i];
      if (size > r.max) [r.max, r.maxF] = [size, f];
      if (size < r.min) [r.min, r.minF] = [size, f];
    });
  }
  return out;
}, { W, H });
await browser.close();
server.close();

const s = Number(widthArg) / W;
let failures = 0;
console.log(`${dir.replace(repo, '')} ${W}x${H} · display ${widthArg} px · s = ${s.toFixed(5)} · needs Thai ≥ ${(13 / s).toFixed(2)} / Latin ≥ ${(12 / s).toFixed(2)} composition px`);
console.log('lang | run | largest (display px @frame) | smallest readable (display px @frame)');
for (const r of runs) {
  if (r.maxF < 0) continue; // never readable (outside every crop, or covered throughout)
  const need = r.thai ? 13 : 12;
  const bad = r.min * s + 1e-6 < need;
  if (bad) failures++;
  console.log(`${r.thai ? 'TH' : 'EN'} | ${r.id} "${r.text.slice(0, 48)}" | ${(r.max * s).toFixed(2)} @${r.maxF} | ${(r.min * s).toFixed(2)} @${r.minF}${bad ? '  UNDER MINIMUM' : ''}`);
}
console.log(failures ? `${failures} run(s) under the minimum` : 'every readable run clears the minimum');
process.exit(failures ? 1 : 0);
