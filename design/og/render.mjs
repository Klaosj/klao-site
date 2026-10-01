// render.mjs — the two share cards (spec 2026-10-01 §5): design/og/og-{en,th}.html → public/og/og-{en,th}.png.
//   node design/og/render.mjs              stills, then render + checks
//   node design/og/render.mjs stills       only re-take the three end stills from public/clips/<key>.mp4
//   node design/og/render.mjs render       only render + checks (OUT=<dir> writes the PNGs there instead)
//
// Renderer: the Google Chrome installed on the Mac (Playwright's channel 'chrome', as `npm run qa` uses; CHROME=<binary>
// overrides), headless, driven through Playwright (scripts/qa-lib.mjs finds it outside the repo; no new dependency),
// at 1200×630, device scale 1. The cards load straight from disk, so New
// York comes from /System/Library/Fonts by path (never copied, never committed) and Anuphan from the film's
// committed woff2 by relative path. HyperFrames can emit a single 1200×630 PNG, but it serves the folder over http,
// where neither path loads: both faces fell back to monospace (one-frame snapshot, 2026-10-01).
//
// Checks (any failure exits 1 and writes nothing to public/og):
//   1. Faces. Chrome's own report of the fonts that drew each headline line (CDP CSS.getPlatformFontsForNode):
//      EN only New York, loaded from the file; TH Anuphan for every Thai glyph, the system font (SF) for the Latin,
//      nothing else (no Thai system fallback). The Thai in the TH labels is Anuphan too.
//   2. Stills. Each image decoded and drawn 1:1 (its natural size is its box), so Chrome never resamples it.
//   3. Copy. Every line of text on the card is a run of spec §3.1 for that locale, and the seven strings the card
//      must carry are all there ("simulated data" / "ข้อมูลจำลอง" included).
//   4. Safe area. Every text run and frame sits inside the middle 80% (x 120–1080, y 63–567), and no label runs
//      past its own frame's width.
//   5. Size. The PNG header says 1200×630.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OG = fileURLToPath(new URL('./', import.meta.url));
const REPO = fileURLToPath(new URL('../../', import.meta.url));
const OUT = process.env.OUT || join(REPO, 'public', 'og');
const CHROME = process.env.CHROME; // optional: a Chrome binary to use instead of the installed Google Chrome
const KEYS = ['gonai', 'aje', 'cafenista'];
const STILL = { w: 304, h: 173 }; // the frame's box in card.css; the stills are scaled to it exactly
const SAFE = { x0: 120, y0: 63, x1: 1080, y1: 567 };
const MUST = {
  en: ['Business developer who', 'builds his own tools.', 'Suwichak Jarunopratamp', 'klao-site.vercel.app', 'GoNai · Live', 'Aje · Working prototype', 'Cafénista · Prototype · simulated data'],
  th: ['นัก Business Development', 'ที่สร้างเครื่องมือใช้เอง', 'Suwichak Jarunopratamp', 'klao-site.vercel.app', 'GoNai · เปิดใช้งานแล้ว', 'Aje · Prototype ใช้งานได้', 'Cafénista · Prototype · ข้อมูลจำลอง'],
};
const steps = process.argv.slice(2).length ? process.argv.slice(2) : ['stills', 'render'];

/* Each sting's finished last frame (its 5 s hold), from the committed web clip, Lanczos-scaled to cover the frame
   and centre-cropped to it. -sseof lands in the hold; -update 1 keeps overwriting, so the file ends as the last
   frame. */
function stills() {
  mkdirSync(join(OG, 'assets'), { recursive: true });
  for (const key of KEYS) {
    const out = join(OG, 'assets', `${key}-end.png`);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-sseof', '-0.5', '-i', join(REPO, 'public', 'clips', `${key}.mp4`), '-update', '1',
      '-vf', `scale=${STILL.w}:${STILL.h}:force_original_aspect_ratio=increase:flags=lanczos+accurate_rnd+full_chroma_int,crop=${STILL.w}:${STILL.h},format=rgb24`, out]);
    console.log(`still  assets/${key}-end.png  ${STILL.w}×${STILL.h}  from public/clips/${key}.mp4 (last frame)`);
  }
}

/* spec §3.1, one locale's column, split into its cells' runs (a cell's " / " separates lines) */
function specRuns(loc) {
  const spec = readFileSync(join(REPO, 'docs/superpowers/specs/2026-10-01-film-og-design.md'), 'utf8');
  const table = spec.slice(spec.indexOf('### 3.1'), spec.indexOf('### 3.2'));
  return table.split('\n')
    .filter((l) => l.startsWith('| ') && !l.startsWith('| Beat'))
    .map((l) => l.split('|').map((c) => c.trim())[loc === 'en' ? 2 : 3])
    .flatMap((c) => c.split(' / '));
}

async function render() {
  const { loadChromium } = await import(pathToFileURL(join(REPO, 'scripts', 'qa-lib.mjs')).href);
  const chromium = await loadChromium();
  const browser = await chromium.launch(CHROME ? { executablePath: CHROME, headless: true } : { channel: 'chrome', headless: true });
  const fails = [];
  const shots = {};
  try {
    for (const loc of ['en', 'th']) {
      const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
      await page.goto(pathToFileURL(join(OG, `og-${loc}.html`)).href);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() => [...document.images].every((i) => i.complete));
      const bad = (msg) => fails.push(`og-${loc}: ${msg}`);

      // 1. faces
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('DOM.enable');
      await cdp.send('CSS.enable');
      const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
      const fontsOf = async (selector) => {
        const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector });
        const out = [];
        for (const nodeId of nodeIds) out.push((await cdp.send('CSS.getPlatformFontsForNode', { nodeId })).fonts);
        return out;
      };
      const isNewYork = (f) => /New York/.test(f.familyName) && f.isCustomFont;
      const isAnuphan = (f) => /Anuphan/.test(f.familyName) && f.isCustomFont;
      const isSystem = (f) => !f.isCustomFont && /^(\.SF|System Font|SF Pro)/.test(f.familyName);
      // Chrome names a variable instance with its axis values in hex: New York at 600 reads "..._wght258..." (at the
      // default 400 the value is left out, so a missing value fails too).
      const wght = (f) => { const h = /_wght([0-9A-F]+)0000/.exec(f.postScriptName); return h ? parseInt(h[1], 16) : null; };
      const say = (f) => `${f.familyName}${f.isCustomFont ? ' (file)' : ''}${wght(f) ? ` wght ${wght(f)}` : ''} ×${f.glyphCount}`;
      const faces = [];
      for (const [i, fonts] of (await fontsOf('.title .ln')).entries()) {
        faces.push(`line ${i + 1}: ${fonts.map(say).join(', ')}`);
        if (loc === 'en' && !fonts.every(isNewYork)) bad(`headline line ${i + 1} is not all New York: ${JSON.stringify(fonts)}`);
        if (loc === 'en' && fonts.some((f) => wght(f) !== 600)) bad(`headline line ${i + 1} is not New York 600: ${JSON.stringify(fonts)}`);
        if (loc === 'th' && !(fonts.some(isAnuphan) && fonts.every((f) => isAnuphan(f) || isSystem(f)))) bad(`headline line ${i + 1} is not Anuphan (+ SF for Latin): ${JSON.stringify(fonts)}`);
      }
      if (loc === 'th') {
        for (const [i, fonts] of (await fontsOf('.label')).entries()) {
          faces.push(`label ${i + 1}: ${fonts.map(say).join(', ')}`);
          if (!(fonts.some(isAnuphan) && fonts.every((f) => isAnuphan(f) || isSystem(f)))) bad(`label ${i + 1}'s Thai is not Anuphan: ${JSON.stringify(fonts)}`);
        }
      }
      const weight = await page.evaluate(() => getComputedStyle(document.querySelector('.title')).fontWeight);
      if (weight !== '600') bad(`headline weight is ${weight}, not 600`);

      // 2–4. stills, copy, safe area (all measured in the page)
      const m = await page.evaluate(() => {
        const box = (r) => ({ x0: Math.round(r.left), y0: Math.round(r.top), x1: Math.round(r.right), y1: Math.round(r.bottom) });
        const textBox = (el) => { const r = document.createRange(); r.selectNodeContents(el); return box(r.getBoundingClientRect()); };
        return {
          imgs: [...document.images].map((i) => ({ src: i.getAttribute('src'), nw: i.naturalWidth, nh: i.naturalHeight, w: i.getBoundingClientRect().width, h: i.getBoundingClientRect().height })),
          lines: document.querySelector('.card').innerText.split('\n').map((s) => s.trim()).filter(Boolean),
          runs: [...document.querySelectorAll('.title .ln, .name, .url, .label')].map((el) => ({ text: el.textContent, ...textBox(el) })),
          frames: [...document.querySelectorAll('.frame, .mark')].map((el) => ({ text: el.className, ...box(el.getBoundingClientRect()) })),
          labels: [...document.querySelectorAll('.app')].map((app) => ({ app: box(app.getBoundingClientRect()), label: textBox(app.querySelector('.label')) })),
        };
      });
      for (const i of m.imgs) {
        if (!i.nw) bad(`${i.src} did not load`);
        else if (i.nw !== i.w || i.nh !== i.h) bad(`${i.src} is ${i.nw}×${i.nh} but drawn ${i.w}×${i.h} (not 1:1)`);
      }
      const runs = specRuns(loc);
      for (const line of m.lines) if (!runs.some((r) => r.includes(line))) bad(`"${line}" is not a run of spec §3.1 (${loc})`);
      for (const s of MUST[loc]) if (!m.lines.includes(s)) bad(`missing "${s}"`);
      for (const b of [...m.runs, ...m.frames]) {
        if (b.x0 < SAFE.x0 || b.y0 < SAFE.y0 || b.x1 > SAFE.x1 || b.y1 > SAFE.y1) bad(`"${b.text}" (${b.x0},${b.y0})–(${b.x1},${b.y1}) leaves the middle 80%`);
      }
      for (const { app, label } of m.labels) if (label.x1 > app.x1) bad(`a label runs ${label.x1 - app.x1} px past its frame`);

      shots[loc] = await page.screenshot({ type: 'png' });
      console.log(`og-${loc}  ${faces.join(' · ')}`);
      console.log(`og-${loc}  copy ${m.lines.length} lines, all §3.1 · stills ${m.imgs.map((i) => `${i.nw}×${i.nh}`).join(' ')} at 1:1 · ` +
        `ink box x ${Math.min(...m.runs.map((b) => b.x0))}–${Math.max(...m.runs.map((b) => b.x1))}, y ${Math.min(...m.runs.map((b) => b.y0))}–${Math.max(...m.runs.map((b) => b.y1), ...m.frames.map((b) => b.y1))}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }

  // 5. size, then write
  for (const [loc, png] of Object.entries(shots)) {
    const w = png.readUInt32BE(16), h = png.readUInt32BE(20);
    if (w !== 1200 || h !== 630) fails.push(`og-${loc}: PNG is ${w}×${h}, not 1200×630`);
  }
  if (fails.length) {
    console.error(`\n${fails.length} check(s) failed, nothing written:\n  ${fails.join('\n  ')}`);
    process.exit(1);
  }
  mkdirSync(OUT, { recursive: true });
  for (const [loc, png] of Object.entries(shots)) {
    writeFileSync(join(OUT, `og-${loc}.png`), png);
    console.log(`wrote  ${join(OUT, `og-${loc}.png`).replace(REPO, '')}  1200×630  ${png.length} B`);
  }
}

for (const step of steps) {
  if (step === 'stills') stills();
  else if (step === 'render') await render();
  else { console.error(`unknown step: ${step} (stills | render)`); process.exit(2); }
}
