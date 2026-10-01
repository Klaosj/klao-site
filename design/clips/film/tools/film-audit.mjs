// film-audit.mjs <film-16x9|film-1x1> <en|th> — what the film itself sets on screen, frame by frame.
//   node design/clips/film/tools/film-audit.mjs film-16x9 en
// Needs the cut's media/ staged (tools/build.sh stage). Seeks the paused GSAP timeline to each of the 1200 frames
// in Chrome (Playwright through the repo's scripts/qa-lib.mjs; GSAP loads from its CDN) and checks:
//   1. Text size. For every element with its own text: computed font-size × the product of ancestor transform
//      scales, on frames where it is readable (effective opacity ≥ 0.5). A line holding Thai is held to the Thai
//      minimum, any other line to the Latin one. Minimums (in composition px) are frame.md's 13 / 12 px at the
//      display scale: 16:9 shown ≥ 1040 px wide (≥ 24 / 23 px), 1:1 shown 390 px wide on a 390 px phone
//      (≥ 36 / 34 px), and for the 1:1 the stricter stand-in until the film sheet exists, the project sheet's
//      square video box, 358.8 px at 390 (≥ 39.13 / 36.12 px).
//   2. Words. Every block's text is a run of its locale's column of spec 2026-10-01 §3.1.
//   3. "simulated data" / "ข้อมูลจำลอง". Cafénista's kicker carries it, is fully opaque on every frame of the
//      Cafénista beat (28.0–36.0 s, frames 840–1079), and is never fainter than any other Cafénista element.
//   4. Sting size. Each window, whenever it is visible, is at least the floor (16:9 ≥ 1651 × 941, 1.045× the
//      1580 × 900 master; 1:1 ≥ 994 × 994, 0.92× the 1080 × 1080 master), and its video's intrinsic size is the
//      window's size (shown 1:1, no browser scaling).
//   5. Edges. No text box comes within 12 px of the frame edge (the square's band above the docked window is
//      84 px, so its kicker's box sits 14–18 px from the top), and no text sits inside a clipping ancestor other
//      than the frame itself (so no Thai mark can be cut off by a box).
// Prints a summary; exits 1 on any failure.
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [cut, loc] = process.argv.slice(2);
if (!['film-16x9', 'film-1x1'].includes(cut) || !['en', 'th'].includes(loc)) {
  console.error('usage: node design/clips/film/tools/film-audit.mjs <film-16x9|film-1x1> <en|th>');
  process.exit(2);
}
const FILM = fileURLToPath(new URL('../', import.meta.url));
const REPO = fileURLToPath(new URL('../../../../', import.meta.url));
const dir = join(FILM, cut);
const { loadChromium } = await import(new URL('../../../../scripts/qa-lib.mjs', import.meta.url).href);
if (!existsSync(join(dir, 'media', 'gonai.mp4'))) {
  console.error(`${cut}/media/ is not staged: run bash design/clips/film/tools/build.sh stage`);
  process.exit(2);
}

/* §3.1, this locale's column: the cells a block's text must be a run of */
const spec = readFileSync(join(REPO, 'docs/superpowers/specs/2026-10-01-film-og-design.md'), 'utf8');
const table = spec.slice(spec.indexOf('### 3.1'), spec.indexOf('### 3.2'));
const cells = table
  .split('\n')
  .filter((l) => l.startsWith('| ') && !l.startsWith('| Beat') && !l.startsWith('|---'))
  .map((l) => l.split('|').map((c) => c.trim()))
  .map((c) => (loc === 'en' ? c[2] : c[3]));

const sixteen = cut === 'film-16x9';
const MIN = sixteen ? { th: 24, latin: 23 } : { th: 36, latin: 34 };
const STANDIN = sixteen ? null : { th: 13 / (358.8 / 1080), latin: 12 / (358.8 / 1080) };
const FLOOR = sixteen ? { w: 1651, h: 941 } : { w: 994, h: 994 };

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.mp4': 'video/mp4', '.m4a': 'audio/mp4', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
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
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => {
  window.__timelines = {};
});
await page.goto(`http://localhost:${server.address().port}/index.html?locale=${loc}`, { waitUntil: 'networkidle' });
await page.evaluate(() => window.FILM.ready);
await page.evaluate(() => Promise.all([...document.querySelectorAll('video')].map((v) => (v.readyState >= 1 ? 0 : new Promise((r) => v.addEventListener('loadedmetadata', r, { once: true }))))));

const res = await page.evaluate(
  ({ W, H }) => {
    const tl = window.__timelines.main;
    const THAI = /[฀-๿]/;
    const own = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
    const els = [...document.querySelectorAll('#root *')].filter((el) => own(el));
    const block = (el) => el.closest('.ln, p, h1, h2'); // a display line (.ln) is its own block
    const scaleOf = (el) => {
      const t = getComputedStyle(el).transform;
      if (!t || t === 'none') return 1;
      const m = new DOMMatrix(t);
      return Math.hypot(m.a, m.b);
    };
    const opacityOf = (el) => {
      let o = 1;
      for (let a = el; a && a !== document.documentElement; a = a.parentElement) o *= parseFloat(getComputedStyle(a).opacity);
      return o;
    };
    // static facts: the words, and clipping ancestors
    const blocks = [...new Set(els.map(block).filter(Boolean))].map((b) => ({ id: b.id || b.className, text: b.textContent.replace(/\s+/g, ' ').trim() }));
    const clipped = els
      .filter((el) => {
        for (let a = el.parentElement; a && a.id !== 'root'; a = a.parentElement) {
          const o = getComputedStyle(a).overflow;
          if (o === 'hidden' || o === 'clip') return true;
        }
        return false;
      })
      .map((el) => own(el));
    const runs = els.map((el) => ({ el, text: own(el), thai: THAI.test(block(el)?.textContent || own(el)), min: Infinity, minF: -1, max: 0, edge: Infinity, edgeF: -1 }));
    const caf = document.getElementById('a-cafenista');
    const cafKick = caf.querySelector('.a-kick');
    const cafOthers = [caf.querySelector('.a-q'), caf.querySelector('.win')];
    const label = { text: cafKick.textContent, minInBeat: Infinity, minInBeatF: -1, fainter: [] };
    const wins = [...document.querySelectorAll('.win')].map((w) => {
      const v = w.querySelector('video');
      return { id: w.parentElement.id, w, v, minW: Infinity, minH: Infinity, seen: 0, video: `${v.videoWidth}x${v.videoHeight}`, box: `${w.offsetWidth}x${w.offsetHeight}` };
    });
    for (let f = 0; f < 1200; f++) {
      tl.seek(f / 30, false);
      for (const r of runs) {
        const op = opacityOf(r.el);
        if (op < 0.05) continue;
        const range = document.createRange();
        range.selectNodeContents(r.el);
        const b = range.getBoundingClientRect();
        if (b.width === 0) continue;
        const edge = Math.min(b.left, b.top, W - b.right, H - b.bottom);
        if (edge < r.edge) [r.edge, r.edgeF] = [edge, f];
        if (op < 0.5) continue;
        let sc = 1;
        for (let a = r.el; a && a !== document.documentElement; a = a.parentElement) sc *= scaleOf(a);
        const size = parseFloat(getComputedStyle(r.el).fontSize) * sc;
        if (size < r.min) [r.min, r.minF] = [size, f];
        if (size > r.max) r.max = size;
      }
      const ko = opacityOf(cafKick);
      if (f >= 840 && f < 1080 && ko < label.minInBeat) [label.minInBeat, label.minInBeatF] = [ko, f];
      const other = Math.max(...cafOthers.map(opacityOf));
      if (other > 0.01 && ko + 1e-6 < other) label.fainter.push(f);
      for (const x of wins) {
        if (opacityOf(x.w) < 0.01) continue;
        const b = x.w.getBoundingClientRect();
        x.seen++;
        x.minW = Math.min(x.minW, b.width);
        x.minH = Math.min(x.minH, b.height);
      }
    }
    return {
      blocks,
      clipped,
      runs: runs.map(({ text, thai, min, minF, max, edge, edgeF }) => ({ text, thai, min, minF, max, edge, edgeF })),
      label: { ...label, fainter: label.fainter.length ? `${label.fainter.length} frames (first ${label.fainter[0]})` : 'none' },
      wins: wins.map(({ id, minW, minH, seen, video, box }) => ({ id, minW, minH, seen, video, box })),
    };
  },
  { W, H },
);
await browser.close();
server.close();

let fail = 0;
const bad = (msg) => {
  fail++;
  console.log(`  ✗ ${msg}`);
};
console.log(`${cut} · ${loc} · ${W}×${H} · 1200 frames`);
if (errors.length) bad(`page errors: ${errors.join(' | ')}`);

console.log(`1. text size (readable = effective opacity ≥ 0.5) · minimum Thai ${MIN.th} / Latin ${MIN.latin} px${STANDIN ? ` · stand-in ${STANDIN.th.toFixed(2)} / ${STANDIN.latin.toFixed(2)} px` : ''}`);
const read = res.runs.filter((r) => r.minF >= 0);
for (const kind of ['th', 'latin']) {
  const rs = read.filter((r) => (kind === 'th' ? r.thai : !r.thai));
  if (!rs.length) continue;
  const lo = rs.reduce((a, b) => (b.min < a.min ? b : a));
  console.log(`   smallest ${kind === 'th' ? 'Thai-line' : 'Latin-line'} run: ${lo.min.toFixed(2)} px @frame ${lo.minF} "${lo.text.slice(0, 40)}"`);
  for (const r of rs) {
    if (r.min + 1e-6 < MIN[kind]) bad(`"${r.text.slice(0, 40)}" ${r.min.toFixed(2)} px @${r.minF} < ${MIN[kind]}`);
    if (STANDIN && r.min + 1e-6 < STANDIN[kind]) console.log(`   note: "${r.text.slice(0, 40)}" ${r.min.toFixed(2)} px is under the stand-in ${STANDIN[kind].toFixed(2)}`);
  }
}

console.log('2. words: every block is a run of §3.1 (this locale)');
for (const b of res.blocks) if (!cells.some((c) => c.includes(b.text))) bad(`#${b.id} "${b.text}" is not in §3.1`);
console.log(`   ${res.blocks.length} blocks checked`);

console.log('3. Cafénista label');
const want = loc === 'en' ? 'simulated data' : 'ข้อมูลจำลอง';
if (!res.label.text.includes(want)) bad(`kicker "${res.label.text}" lacks "${want}"`);
console.log(`   kicker "${res.label.text}" · lowest opacity over frames 840–1079: ${res.label.minInBeat.toFixed(4)} @${res.label.minInBeatF} · frames where it is fainter than the question or window: ${res.label.fainter}`);
if (res.label.minInBeat < 0.99) bad('the label fades during the Cafénista beat');
if (res.label.fainter !== 'none') bad('the label is fainter than other Cafénista content');

console.log(`4. sting windows (floor ${FLOOR.w}×${FLOOR.h})`);
for (const x of res.wins) {
  console.log(`   ${x.id}: box ${x.box}, video ${x.video}, smallest visible ${x.minW.toFixed(1)}×${x.minH.toFixed(1)} over ${x.seen} frames`);
  if (x.minW + 1e-6 < FLOOR.w || x.minH + 1e-6 < FLOOR.h) bad(`${x.id} shown below the floor`);
  if (x.video !== x.box) bad(`${x.id} video ${x.video} is not the window's ${x.box}`);
}

console.log('5. edges and clipping');
const tight = res.runs.filter((r) => r.edgeF >= 0).reduce((a, b) => (b.edge < a.edge ? b : a));
console.log(`   closest text to a frame edge: ${tight.edge.toFixed(1)} px @frame ${tight.edgeF} "${tight.text.slice(0, 40)}"`);
if (tight.edge < 12) bad('text within 12 px of the frame edge');
if (res.clipped.length) bad(`text inside a clipping box: ${res.clipped.join(' | ')}`);
else console.log('   no text inside a clipping box');

console.log(fail ? `${fail} failure(s)` : 'all checks pass');
process.exit(fail ? 1 : 0);
