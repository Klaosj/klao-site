// capture.mjs — snapshot Aje's real Next steps screen (built-in example idea) as DOM + CSS + fonts.
//
//   AJE_URL            a running Aje web app (default http://localhost:3230; `cd <Aje>/web && npx next dev -p 3230`)
//   PLAYWRIGHT_MODULE  path to playwright's index.mjs (e.g. <Aje>/web/node_modules/playwright/index.mjs)
//   OUT_DIR            where to write (default work/capture)
//
// State: a fresh browser profile (empty localStorage) → "See an example first" (Aje's seeded example idea,
// "Dental LINE receptionist (example)") → Next steps → "Choose another test" → "Talk to 5 clinic owners"
// (the example's reviewed test). No model or database call is made: every request that is not this
// localhost app is aborted and every /api/* call is answered with {} (the example is seeded client-side).
//
// For each cut it writes:
//   <cut>/app.html   the live `.app` subtree (scripts and the fixed dock / toast removed, ids prefixed)
//   <cut>/aje.css    the app's own stylesheet, media queries resolved at that viewport, selectors scoped
//                    to `.vp-<cut>` (html/body/:root map onto that box with the same specificity), rules that
//                    match nothing in this state dropped, animations/keyframes dropped (the sting re-times them)
//   <cut>/vp.json    the viewport box: size, the body's sky gradient + the fixed glow layer as computed px,
//                    and element geometry at the scroll positions the sting uses
//   <cut>/ref-*.png  real screenshots of those states (DPR 2) for the fidelity diff
//   fonts/*.woff2 + fonts.css   the app's next/font files (DM Sans, Geist, IBM Plex Sans Thai)
import fs from 'node:fs';
import path from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const BASE = process.env.AJE_URL || 'http://localhost:3230';
const OUT = process.env.OUT_DIR || 'work/capture';
const HOST = new URL(BASE).host;

const CUTS = {
  // 16:9 window + the 1:1 name strip: desktop layout (the header shows the idea name only above 960 px)
  d: { w: 1280, h: 900, scrolls: [0, 270] },
  // 1:1 card window: the phone layout at 320 px (iPhone SE width), two scroll positions
  p: { w: 320, h: 568, scrolls: [315, 893] },
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });
fs.mkdirSync(path.join(OUT, 'fonts'), { recursive: true });
const report = { blocked: [], api: [] };

for (const [cut, cfg] of Object.entries(CUTS)) {
  const dir = path.join(OUT, cut);
  fs.mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: cfg.w, height: cfg.h }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.host !== HOST) { report.blocked.push(u.href); return route.abort(); }
    if (u.pathname.startsWith('/api/')) { report.api.push(u.pathname); return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); }
    return route.continue();
  });
  const hideDev = () => page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await page.goto(BASE + '/app', { waitUntil: 'networkidle' });
  await hideDev();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: /See an example/ }).first().click();
  await page.waitForTimeout(1500);
  // desktop: the dock's "Next steps"; phone: the same item in the mobile dock grid
  await page.getByRole('button', { name: /^Next steps/ }).last().click();
  await page.waitForTimeout(1500);
  await page.locator('summary', { hasText: 'Choose another test' }).click();
  await page.waitForTimeout(500);
  await page.locator('button[aria-pressed]', { hasText: 'Talk to 5 clinic owners' }).click();
  await page.waitForTimeout(1800);
  await page.mouse.move(cfg.w - 2, cfg.h - 2);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2500); // the app's entrances settle; nothing animates after this
  await hideDev();

  // reference screenshots + geometry per scroll position
  const geo = {};
  for (const s of cfg.scrolls) {
    await page.evaluate((y) => window.scrollTo(0, y), s);
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(dir, `ref-s${s}.png`) });
    geo[s] = await page.evaluate(() => {
      const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom].map((n) => Math.round(n * 100) / 100); };
      const card = [...document.querySelectorAll('article.quest.focus')].find((a) => !a.closest('[hidden]'));
      const q = (s) => card && card.querySelector(s);
      return {
        scrollY: window.scrollY, top: r(document.querySelector('header.top')), brand: r(document.querySelector('.top .brand')),
        mk: r(document.querySelector('.top .brand .mk')), vn: r(document.querySelector('.top .vn')), hlink: r(document.querySelector('.top .hlink')),
        lang: r(document.querySelector('.top .lang-toggle')), ready: r(document.querySelector('.top .ready')), picker: r(document.querySelector('.quest-picker')),
        card: r(card), pick: r(q('.pick')), title: r(q('h3')), qtChip: r(q('.qt > .chip')), steps: r(q('.test-steps')), step: [...(card?.querySelectorAll('.test-steps li') || [])].map(r),
        feedback: r(q('.quest-feedback')), receipt: r(q('.quest-receipt')), result: r(q('.result')), chips: [...(card?.querySelectorAll('.result > span') || [])].map(r),
        note: r(q('.qnote')), act: r(q('.act')),
      };
    });
  }
  fs.writeFileSync(path.join(dir, 'geo.json'), JSON.stringify(geo, null, 1));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);

  // the viewport box: body background + the fixed glow layer, resolved to px at this viewport
  const vp = await page.evaluate(() => {
    const b = getComputedStyle(document.body), g = getComputedStyle(document.body, '::before');
    const vars = {};
    for (const k of ['--sky1', '--sky2', '--sky3', '--sky4', '--glow1', '--glow1b', '--glow2', '--glow2b', '--glow3', '--accent', '--accent-soft']) vars[k] = b.getPropertyValue(k).trim();
    return {
      width: innerWidth, height: innerHeight, tab: document.body.dataset.tab, lang: document.documentElement.lang, htmlClass: document.documentElement.className, vars,
      body: { backgroundColor: b.backgroundColor, backgroundImage: b.backgroundImage, backgroundSize: b.backgroundSize, backgroundPosition: b.backgroundPosition, backgroundRepeat: b.backgroundRepeat, backgroundAttachment: b.backgroundAttachment },
      glow: { position: g.position, inset: [g.top, g.right, g.bottom, g.left], zIndex: g.zIndex, backgroundImage: g.backgroundImage, backgroundSize: g.backgroundSize, backgroundPosition: g.backgroundPosition, backgroundRepeat: g.backgroundRepeat },
    };
  });
  fs.writeFileSync(path.join(dir, 'vp.json'), JSON.stringify(vp, null, 1));

  // the DOM: the live `.app` subtree. Fixed overlays (dock, toast, activity) are dropped: the sting's crops never
  // reach the viewport edges they pin to. Ids get the cut's prefix so two snapshots can share one page.
  const html = await page.evaluate((cut) => {
    const app = document.querySelector('.app').cloneNode(true);
    app.querySelectorAll('script, .dockwrap, .toast, .activity, nextjs-portal').forEach((n) => n.remove());
    const ids = new Set([...app.querySelectorAll('[id]')].map((n) => n.id));
    app.querySelectorAll('*').forEach((n) => {
      if (n.id) n.id = cut + '-' + n.id;
      for (const a of ['aria-labelledby', 'aria-describedby', 'aria-controls', 'for', 'href', 'xlink:href']) {
        const v = n.getAttribute(a); if (!v) continue;
        if (a === 'href' || a === 'xlink:href') { if (v.startsWith('#') && ids.has(v.slice(1))) n.setAttribute(a, '#' + cut + '-' + v.slice(1)); continue; }
        n.setAttribute(a, v.split(/\s+/).map((x) => (ids.has(x) ? cut + '-' + x : x)).join(' '));
      }
    });
    return app.outerHTML;
  }, cut);
  fs.writeFileSync(path.join(dir, 'app.html'), html);

  // the stylesheet, resolved for this viewport and scoped to `.vp-<cut>`
  const css = await page.evaluate((cut) => {
    const SCOPE = '.vp-' + cut;
    const sheet = [...document.styleSheets].find((s) => s.href && s.href.includes('/_next/static/chunks/'));
    const html = document.documentElement, body = document.body;
    const DYN = /:(hover|focus-visible|focus-within|focus|active|visited|target|checked|disabled|enabled|placeholder-shown|autofill|-webkit-autofill)(?![\w-])/g;
    const split = (s, seps) => { // split on top-level separators, ignoring (), [], quotes
      const out = []; let depth = 0, q = null, cur = '';
      for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (q) { cur += c; if (c === q && s[i - 1] !== '\\') q = null; continue; }
        if (c === '"' || c === "'") { q = c; cur += c; continue; }
        if (c === '(' || c === '[') depth++;
        if (c === ')' || c === ']') depth--;
        if (depth === 0 && seps(c, s, i)) { out.push(cur); cur = ''; continue; }
        cur += c;
      }
      out.push(cur); return out;
    };
    const stripPseudoEl = (s) => s.replace(/::?(before|after|backdrop|placeholder|selection|marker|file-selector-button|-webkit-[\w-]+|-moz-[\w-]+)(\([^)]*\))?/g, '');
    const matchesAny = (sel) => { try { const t = stripPseudoEl(sel).replace(DYN, ''); return !!document.querySelector(t.trim() || '*'); } catch { return false; } };
    // first compound of a complex selector
    const firstCompound = (sel) => {
      const m = split(sel.trim(), (c) => c === ' ' || c === '>' || c === '+' || c === '~');
      return m[0];
    };
    const spec = (compound) => { // (b, c) of a simple compound: classes/attrs/pseudo-classes, type selectors
      const t = compound.replace(/::?[\w-]+(\([^)]*\))?/g, (m) => (m.startsWith('::') ? '' : ' :pc'));
      const b = (t.match(/\.[\w-]+|\[[^\]]*\]| :pc/g) || []).length;
      const c = (t.match(/(^|[\s>+~])[a-zA-Z][\w-]*/g) || []).length;
      return { b, c };
    };
    const scopeSelector = (sel) => {
      sel = sel.trim();
      const fc = firstCompound(sel);
      const fcNoPseudo = stripPseudoEl(fc).replace(DYN, '');
      const rest = sel.slice(fc.length);
      const mentionsRoot = /(^|[^\w-])(html|body)(?![\w-])|:root/.test(fc);
      let els = [];
      try { els = [...document.querySelectorAll(fcNoPseudo || '*')]; } catch { return null; }
      const onlyRoot = els.length > 0 && els.every((e) => e === html || e === body);
      if (mentionsRoot || onlyRoot) {
        if (!els.some((e) => e === html || e === body)) return null;                  // html:lang(th), body[data-tab="spark"] …
        if (/::?(before|after)/.test(fc)) return null;                                // body::before glow: rebuilt in px on the box
        const { b, c } = spec(fcNoPseudo);
        const rep = (c > 0 ? 'div' : '') + SCOPE.repeat(b + 1);                        // same specificity + one class
        const tail = fc.slice(fcNoPseudo.length);                                      // keep :hover etc. (they never match)
        return rep + tail + rest.replace(/^\s*>\s*/, ' ');                              // html > x → descendant (the box wraps .app)
      }
      if (!matchesAny(sel)) return null;
      return SCOPE + ' ' + sel;
    };
    const out = [];
    const walk = (rules, sink) => {
      for (const r of rules) {
        if (r instanceof CSSFontFaceRule || r instanceof CSSKeyframesRule) continue;  // fonts: fonts.css · keyframes: the sting re-times
        if (r instanceof CSSPropertyRule) { sink.push(r.cssText); continue; }
        if (r instanceof CSSLayerStatementRule) { sink.push(r.cssText); continue; }
        if (r instanceof CSSLayerBlockRule) { const inner = []; walk(r.cssRules, inner); if (inner.length) sink.push('@layer ' + r.name + '{\n' + inner.join('\n') + '\n}'); continue; }
        if (r instanceof CSSMediaRule) { if (matchMedia(r.media.mediaText).matches) walk(r.cssRules, sink); continue; }
        if (r instanceof CSSSupportsRule) { if (CSS.supports(r.conditionText)) walk(r.cssRules, sink); continue; }
        if (r instanceof CSSStyleRule) {
          if (r.cssRules && r.cssRules.length) throw new Error('nested CSS not handled: ' + r.selectorText);
          const sels = split(r.selectorText, (c) => c === ',').map(scopeSelector).filter(Boolean);
          if (!sels.length) continue;
          const decl = r.style.cssText.replace(/(^|;)\s*(animation|transition)[\w-]*\s*:[^;]*/g, '$1').replace(/^;+\s*/, '');
          if (decl.trim()) sink.push(sels.join(',\n') + ' { ' + decl + ' }');
          continue;
        }
        sink.push('/* skipped: ' + r.constructor.name + ' */');
      }
    };
    walk(sheet.cssRules, out);
    return out.join('\n');
  }, cut);
  fs.writeFileSync(path.join(dir, 'aje.css'), `/* Aje web/src/app/globals.css + living.css + Tailwind v4 base, as compiled by the running app.\n   Resolved for a ${cfg.w}×${cfg.h} viewport, scoped to .vp-${cut}, unused rules dropped (tools/capture.mjs). */\n` + css + '\n');

  // fonts (once)
  if (cut === 'd') {
    const faces = await page.evaluate(() => {
      const sheet = [...document.styleSheets].find((s) => s.href && s.href.includes('/_next/static/chunks/'));
      return [...sheet.cssRules].filter((r) => r instanceof CSSFontFaceRule).map((r) => ({ text: r.cssText, base: sheet.href }));
    });
    const lines = ['/* The app\'s next/font faces (DM Sans · Geist · IBM Plex Sans Thai), files copied from the running app. */'];
    for (const f of faces) {
      let text = f.text;
      const urls = [...text.matchAll(/url\("([^"]+)"\)/g)].map((m) => m[1]);
      for (const u of urls) {
        const abs = new URL(u, f.base).href; const name = path.basename(new URL(abs).pathname);
        const file = path.join(OUT, 'fonts', name);
        if (!fs.existsSync(file)) { const res = await page.request.get(abs); fs.writeFileSync(file, await res.body()); }
        text = text.replace(u, 'fonts/' + name);
      }
      lines.push(text);
    }
    fs.writeFileSync(path.join(OUT, 'fonts.css'), lines.join('\n') + '\n');
  }
  await ctx.close();
}
fs.writeFileSync(path.join(OUT, 'requests.json'), JSON.stringify(report, null, 1));
console.log('blocked external:', report.blocked.length, '· /api answered locally:', [...new Set(report.api)].join(' '));
await browser.close();
