// White Edition QA matrix (spec §1 criterion 4, §11; master plan P5).
//
//   node scripts/qa-matrix.mjs [baseUrl] [--only=matrix,probes,pages]
//
// baseUrl defaults to http://localhost:3000. Query parameters on it (a Vercel
// share link's _vercel_share token, for instance) are carried onto every page
// it opens. Screenshots and summary.txt go to $QA_OUT (default /tmp/klao-qa).
// One line per combination; exits 1 when anything fails.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ANCHOR_IDS,
  CANVAS,
  CLS_BUDGET,
  LEN_BUDGET,
  SECTION_IDS,
  TEXT_IDS,
  VIEWPORT_HEIGHT,
  collect,
  contrastIssues,
  launch,
  overflowBleed,
  pageInit,
  readPerf,
  scrollThrough,
  themeState,
  watchErrors,
} from './qa-lib.mjs';

const args = process.argv.slice(2);
const base = new URL(args.find((a) => !a.startsWith('--')) ?? 'http://localhost:3000');
const parts = (args.find((a) => a.startsWith('--only='))?.slice('--only='.length) ?? 'matrix,probes,pages').split(',');
const OUT = process.env.QA_OUT || '/tmp/klao-qa';
mkdirSync(join(OUT, 'pages'), { recursive: true });

const lines = [];
let failures = 0;
let lenExceptions = 0; // M6 — R15 overages, tallied separately so they never silently vanish from the run's own summary.
// I5 — a base URL is often a Vercel share link (…?_vercel_share=<token>).
// Nothing printed by this script — a crash line, a preflight error, a URL —
// may carry that token verbatim: it is redacted centrally here so every
// caller of log()/report()/crashed() gets it for free, rather than trusting
// each call site to remember.
const redact = (s) => String(s).replace(/([?&]_vercel_share=)[^&#\s]+/gi, '$1…');
const log = (s) => {
  const safe = redact(s);
  console.log(safe);
  lines.push(safe);
};
const report = (label, problems, extra = '') => {
  if (problems.length) failures++;
  log(`${problems.length ? 'FAIL' : 'ok  '} ${label}${extra ? ' ' + extra : ''}`);
  for (const p of problems.slice(0, 8)) log(`     - ${p}`);
  if (problems.length > 8) log(`     - …and ${problems.length - 8} more`);
};
// A crashed probe (a timed-out click, say) must still land in summary.txt
// instead of aborting the whole run silently — the same contract runCombo
// already gives every matrix line.
const crashed = (label, e) => report(label, [`crashed: ${String(e?.message ?? e).split('\n')[0]}`]);

function urlFor(path) {
  const u = new URL(path, base);
  for (const [k, v] of base.searchParams) u.searchParams.set(k, v);
  return u.href;
}

async function preflight() {
  let res;
  try {
    res = await fetch(urlFor('/en'), { redirect: 'manual' });
  } catch {
    throw new Error(`Nothing answers at ${base.origin}. Start the site first (npm run build && npm run start), or pass a base URL.`);
  }
  if (/vercel\.com\/(sso|login)/.test(res.headers.get('location') ?? '')) {
    throw new Error('This deployment is behind Vercel Authentication. Pass a share link (…?_vercel_share=…) as the base URL — see README "Browser QA".');
  }
  // M4 — a non-redirect error status (a bare 401, a dev server already
  // crashed to 500) used to pass preflight silently and then produce
  // nothing but noise from every probe and combo.
  if (res.status >= 400) {
    throw new Error(`${redact(urlFor('/en'))} answered HTTP ${res.status}. Start the site first (npm run build && npm run start), or check the base URL / share link.`);
  }
}

async function newContext(browser, { width, theme, motion = true, scheme, blockStorage = false, js = true }) {
  const context = await browser.newContext({
    viewport: { width, height: VIEWPORT_HEIGHT[width] ?? 844 },
    reducedMotion: motion ? 'no-preference' : 'reduce',
    colorScheme: scheme,
    javaScriptEnabled: js,
  });
  if (blockStorage) {
    // Safari private windows and "block all cookies" make storage throw (Review Focus 2).
    await context.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw new DOMException('The operation is insecure.', 'SecurityError');
        },
      });
    });
  } else if (theme) {
    await context.addInitScript((t) => {
      try {
        localStorage.setItem('klao-theme', t);
      } catch {
        // Covered by the storage-blocked probe.
      }
    }, theme);
  }
  await context.addInitScript(pageInit);
  return context;
}

async function open(context, path) {
  const page = await context.newPage();
  const errors = watchErrors(page);
  const res = await page.goto(urlFor(path), { waitUntil: 'load', timeout: 90_000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(400);
  return { page, errors, status: res?.status() ?? null };
}

async function runCombo(browser, c) {
  const name = `${c.width}-${c.locale}-${c.theme}-${c.motion ? 'mo' : 'rm'}`;
  // The system scheme is the opposite of the stored choice on purpose: the
  // stored choice must win (spec §6 Theme), so anything that reads
  // prefers-color-scheme directly shows up as the wrong background.
  const context = await newContext(browser, { ...c, scheme: c.theme === 'light' ? 'dark' : 'light' });
  try {
    const { page, errors } = await open(context, `/${c.locale}`);
    const scrollOverflow = await page.evaluate(scrollThrough);
    await page.waitForTimeout(c.motion ? 1500 : 300);
    const m = await page.evaluate(collect, {
      sectionIds: SECTION_IDS,
      anchorIds: ANCHOR_IDS,
      textIds: TEXT_IDS,
      phone: c.width < 734,
      thai: c.locale === 'th',
      reduced: !c.motion,
    });
    // M1 — read perf AFTER the scroll-through and its settle wait, not right
    // after load: layout-shift entries keep accumulating as lazy content
    // below the fold comes in, so an early read misses exactly the CLS
    // spec §9 exists to catch. window.__qa.cls only grows, so this is
    // always at least as accurate as the early read it replaces.
    const perf = await page.evaluate(readPerf);
    const contrast = await page.evaluate(contrastIssues); // I2 — the home matrix now checks contrast like every other page.
    await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
    const overflow = Math.max(m.overflow, scrollOverflow);
    const p = [];
    // R15 — a Thai or reduced-motion run that comes in long is REPORTED to
    // Klao with numbers, never "fixed" by cutting spacing, so it never
    // fails the combo. PR2's narrow widths (360, 320) have no LEN_BUDGET
    // entry at all: `m.len > undefined` is always false, so their length is
    // only ever printed via the `len=…vh` line below, on every locale.
    const budget = LEN_BUDGET[c.width];
    const overBudget = budget !== undefined && m.len > budget;
    const lenExempt = overBudget && (c.locale === 'th' || !c.motion);
    if (lenExempt) lenExceptions++; // M6 — counted so the final tally can't silently drop it.
    if (overBudget && !lenExempt) p.push(`page length ${m.len} screens > ${budget}`);
    if (overflow > 0) p.push(`horizontal overflow ${overflow}px${m.bleeders.length ? ': ' + m.bleeders.join(', ') : ''}`);
    for (const e of errors) p.push(`console: ${e}`);
    if (m.theme !== c.theme) p.push(`data-theme "${m.theme}", stored "${c.theme}"`);
    if (perf.firstFrameTheme !== c.theme) p.push(`first frame painted as "${perf.firstFrameTheme}" — flash of the wrong theme`);
    if (m.bg !== CANVAS[c.theme]) p.push(`canvas ${m.bg}, expected ${CANVAS[c.theme]}`);
    if (!m.js) p.push('html.js missing — the pre-paint script did not run');
    if (perf.cls > CLS_BUDGET) p.push(`CLS ${perf.cls} > ${CLS_BUDGET}`);
    for (const id of m.missing) p.push(`missing #${id}`);
    for (const id of m.empty) p.push(`#${id} has no text`);
    for (const x of m.hidden) p.push(`not fully visible: ${x}`);
    for (const x of m.smallText) p.push(`text under 14px: ${x}`);
    for (const x of m.smallTargets) p.push(`target under 24×24: ${x}`);
    for (const x of m.thaiBreaks) p.push(`Thai line starts with a dependent mark: ${x}`);
    for (const x of m.nwWraps) p.push(`keep-span wraps inside: ${x}`);
    for (const x of contrast) p.push(`contrast ${x}`);
    const lenNote = lenExempt ? ` [R15: over budget, report to Klao — do not cut spacing]` : '';
    report(name, p, `len=${m.len}vh${lenNote} overflow=${overflow} errors=${errors.length} cls=${perf.cls} lcp=${perf.lcp}ms`);
    log(`     sections ${Object.entries(m.sections).map(([k, v]) => `${k}=${v}`).join(' ')}`);
  } catch (e) {
    crashed(name, e);
  } finally {
    await context.close();
  }
}

async function probes(browser) {
  // Spec §6 Theme: with nothing stored, Auto follows the system scheme.
  for (const scheme of ['light', 'dark']) {
    const label = `probe auto-${scheme}`;
    const ctx = await newContext(browser, { width: 1440, scheme });
    try {
      const { page, errors } = await open(ctx, '/en');
      const s = await page.evaluate(themeState);
      const p = errors.map((e) => `console: ${e}`);
      if (s.theme !== 'auto') p.push(`data-theme "${s.theme}" with nothing stored`);
      if (s.bg !== CANVAS[scheme]) p.push(`canvas ${s.bg}, expected ${CANVAS[scheme]} (system ${scheme})`);
      report(label, p);
    } catch (e) {
      crashed(label, e);
    } finally {
      await ctx.close();
    }
  }

  // Review Focus 2: storage throws → auto, the toggle still works, nothing throws.
  {
    const label = 'probe storage-blocked';
    const ctx = await newContext(browser, { width: 1440, scheme: 'light', blockStorage: true });
    try {
      const { page, errors } = await open(ctx, '/en');
      const p = [];
      let s = await page.evaluate(themeState);
      if (s.theme !== 'auto' || s.bg !== CANVAS.light) p.push(`storage blocked: theme ${s.theme}, canvas ${s.bg}`);
      const dark = page.getByRole('radio', { name: /^dark$/i }).or(page.getByRole('button', { name: /^dark$/i })).first();
      let note = 'no visible "Dark" control — click skipped (P0 unit tests cover the toggle)';
      if (await dark.count()) {
        await dark.click();
        await page.waitForTimeout(300);
        s = await page.evaluate(themeState);
        note = `toggle → ${s.theme}`;
        if (s.theme !== 'dark' || s.bg !== CANVAS.dark) p.push(`toggle with storage blocked: theme ${s.theme}, canvas ${s.bg}`);
      }
      p.push(...errors.map((e) => `console: ${e}`));
      report(label, p, note);
    } catch (e) {
      crashed(label, e);
    } finally {
      await ctx.close();
    }
  }

  // Review Focus 3: bad hashes open nothing; a valid one opens; Back closes.
  {
    const label = 'probe sheet-urls';
    const ctx = await newContext(browser, { width: 1440, scheme: 'light' });
    try {
      const p = [];
      for (const hash of ['#work/', '#work/unknown', '#work/GoNai']) {
        const { page, errors } = await open(ctx, `/en${hash}`);
        if (await page.evaluate(() => !!document.querySelector('dialog[open]'))) p.push(`${hash} opened a sheet`);
        p.push(...errors.map((e) => `${hash} console: ${e}`));
        await page.close();
      }
      const { page, errors } = await open(ctx, '/en');
      const href = await page.evaluate(() => document.querySelector('a[href*="#work/"]')?.getAttribute('href') ?? null);
      const key = href ? href.split('#work/')[1] : 'gonai';
      const direct = await open(ctx, `/en#work/${key}`);
      await direct.page.waitForTimeout(400);
      if (!(await direct.page.evaluate(() => !!document.querySelector('dialog[open]')))) p.push(`#work/${key} loaded directly did not open its sheet`);
      p.push(...direct.errors.map((e) => `direct console: ${e}`));
      let note = `key=${key}`;
      if (href) {
        await page.locator(`a[href$="#work/${key}"]`).first().click();
        await page.waitForTimeout(600);
        const opened = await page.evaluate(() => !!document.querySelector('dialog[open]') && location.hash.startsWith('#work/'));
        if (!opened) p.push('clicking the row did not open a sheet with a #work/ hash');
        await page.goBack({ waitUntil: 'commit' });
        await page.waitForTimeout(600);
        if (await page.evaluate(() => !!document.querySelector('dialog[open]'))) p.push('Back did not close the sheet');
      } else {
        note += ' (rows are not <a href="#work/…"> — Back check skipped; P2 unit tests cover it)';
      }
      p.push(...errors.map((e) => `console: ${e}`));
      report(label, p, note);
    } catch (e) {
      crashed(label, e);
    } finally {
      await ctx.close();
    }
  }

  // CO-22 — LocaleToggle carries the band being read as the reading anchor,
  // not the URL hash (Klao decision (a), 2026-09-28), and it is a full page
  // load, not a client-side route change (P1 final fix wave, finding 9), so
  // the switch must still keep the stored theme and leave html.js set. Story
  // is the band checked because it has a distinctive child (.bd-seg,
  // StoryDetail's Short/Full control) to confirm the destination rendered.
  //
  // Lane B review I3 — the context must NOT be seeded with `theme` here: that
  // option installs an addInitScript that rewrites klao-theme on every new
  // document in the context, including the /th document the switch lands
  // on, which would make "theme kept" true no matter what the app does.
  // Dark is seeded for real, once, via a throwaway page opened and closed
  // before #story is ever loaded — the same one-time localStorage write a
  // visitor's own toggle click makes, without the click itself: a first
  // attempt clicked the real Dark toggle on the #story page directly, which
  // reliably set the theme but was also found to unsettle the reading-
  // anchor observer #story's own redirect relies on (it landed on
  // /th#contact instead of /th#story) — a page it never touches can't do
  // that. A mutation that resets the theme on navigation is still the only
  // way to make the "kept after the switch" assertion below pass.
  {
    const label = 'probe language-switch';
    const ctx = await newContext(browser, { width: 1440, scheme: 'light' });
    try {
      const seed = await ctx.newPage();
      await seed.goto(urlFor('/en'), { waitUntil: 'load' });
      await seed.evaluate(() => {
        try {
          localStorage.setItem('klao-theme', 'dark');
        } catch {
          // Covered by the storage-blocked probe.
        }
      });
      await seed.close();

      const { page, errors } = await open(ctx, '/en#story');
      await page.waitForTimeout(300); // lets the reading-anchor observer settle on #story
      const before = await page.evaluate(themeState);
      const link = page.locator('.lt-seg a[hreflang="th"]').first();
      if (!(await link.count())) {
        report(label, ['no Thai link found in the locale toggle (.lt-seg a[hreflang="th"])']);
      } else {
        const p = [];
        if (before.theme !== 'dark') p.push(`theme "${before.theme}" before the switch, expected "dark" (seeded via localStorage once)`);
        await link.click();
        await page.waitForURL(/\/th/, { waitUntil: 'load' });
        await page.waitForTimeout(300);
        const u = new URL(page.url());
        const landed = `${u.pathname}${u.hash}`;
        if (landed !== '/th#story') p.push(`landed on ${landed}, expected /th#story`);
        const s = await page.evaluate(themeState);
        if (!s.js) p.push('html.js missing after the switch');
        if (s.theme !== 'dark' || s.bg !== CANVAS.dark) {
          p.push(`theme "${s.theme}" (canvas ${s.bg}) after the switch, expected "dark" kept (canvas ${CANVAS.dark})`);
        }
        const segVisible = await page.evaluate(() => {
          const seg = document.querySelector('.bd-seg');
          return !!seg && seg.getClientRects().length > 0 && getComputedStyle(seg).visibility !== 'hidden';
        });
        if (!segVisible) p.push('.bd-seg is not visible after the switch');
        p.push(...errors.map((e) => `console: ${e}`));
        report(label, p, `landed=${landed}`);
      }
    } catch (e) {
      crashed(label, e);
    } finally {
      await ctx.close();
    }
  }

  // Review Focus 4: the server HTML alone shows every section; reveals only enhance.
  {
    const label = 'probe no-js';
    const ctx = await newContext(browser, { width: 1440, scheme: 'light', js: false });
    try {
      const p = [];
      const html = await (await ctx.request.get(urlFor('/en'))).text();
      for (const id of [...SECTION_IDS, ...ANCHOR_IDS]) if (!new RegExp(`\\sid="${id}"`).test(html)) p.push(`server HTML lacks #${id}`);
      const hiddenInline = html.match(/style="[^"]*opacity:\s*0(?:\.0+)?(?:;|")/g) ?? [];
      if (hiddenInline.length) p.push(`server HTML carries ${hiddenInline.length} inline opacity:0 style(s)`);
      if (!/id="faq"[\s\S]*?<details/.test(html)) p.push('server HTML has no <details> answers after #faq');
      const page = await ctx.newPage();
      await page.goto(urlFor('/en'), { waitUntil: 'load' });
      await page.screenshot({ path: join(OUT, 'probe-no-js.png'), fullPage: true });
      let note = '';
      try {
        // reduced: true — without JS nothing may be hidden anywhere, scenes included.
        const m = await page.evaluate(collect, { sectionIds: SECTION_IDS, anchorIds: [], textIds: TEXT_IDS, phone: false, thai: false, reduced: true });
        for (const x of m.hidden) p.push(`hidden without JS: ${x}`);
        for (const id of m.empty) p.push(`#${id} has no text without JS`);
        if (m.js) p.push('html.js is set although JavaScript is off');
      } catch {
        note = '(in-page checks unavailable with JS off — HTML checks only)';
      }
      report(label, p, note);
    } catch (e) {
      crashed(label, e);
    } finally {
      await ctx.close();
    }
  }

  // Global Constraints: ⌘K Ask Preview makes no model call and sends nothing.
  {
    const label = 'probe palette-no-network';
    const ctx = await newContext(browser, { width: 1440, scheme: 'light' });
    try {
      const { page, errors } = await open(ctx, '/en');
      const sent = [];
      page.on('request', (r) => sent.push(r));
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('klao:palette', { detail: { query: 'qa probe zebra' } })));
      await page.waitForTimeout(1000);
      const seen = await page.evaluate(() => !!document.querySelector('dialog[open], [role="dialog"]'));
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
      await page.keyboard.press('Escape');
      const p = sent
        .filter((r) => !['GET', 'HEAD'].includes(r.method()) || r.url().includes('zebra'))
        .map((r) => `sent ${r.method()} ${r.url().slice(0, 120)}`);
      p.push(...errors.map((e) => `console: ${e}`));
      report(label, p, seen ? 'palette opened' : 'palette not seen (P4 unit tests cover it)');
    } catch (e) {
      crashed(label, e);
    } finally {
      await ctx.close();
    }
  }
}

async function pages(browser) {
  // Standalone routes keep their layout but must read correctly in both themes.
  const extra = [];
  const discover = await browser.newContext();
  try {
    const xml = await (await discover.request.get(urlFor('/sitemap.xml'))).text();
    for (const re of [/<loc>[^<]*?(\/en\/work\/[^<]+)<\/loc>/, /<loc>[^<]*?(\/en\/writing\/[^<]+)<\/loc>/]) {
      const m = re.exec(xml);
      if (m) extra.push(m[1]);
    }
  } catch (e) {
    // M5 — a refused sitemap fetch used to abort the whole run before
    // summary.txt was written. Note it and carry on with the fixed PATHS.
    log(`     ! sitemap discovery skipped: ${redact(String(e?.message ?? e).split('\n')[0])}`);
  } finally {
    await discover.close();
  }
  const REAL_PATHS = ['/en/projects', '/th/projects', '/en/writing', '/th/writing', '/en/career', ...extra];
  // T12 — both locales: the root 404 is ONE static page (global-not-found.tsx)
  // whose pre-paint picks lang, the visible copy and the Thai tab title from
  // the URL, so /th is the half that can silently come out English.
  const MISSING_PATHS = ['/en/qa-missing-page', '/th/qa-missing-page'];

  // I4 — the 404 path is queued last across every width/theme, so a dev
  // crash it can trigger (routed to Lane A/T5 — every affected line carries
  // "not-found.tsx … doesn't have a root layout") can no longer mask the
  // real pages that already ran clean, including the entire dark half.
  // `serverDied` is set once, the first time a 5xx is confirmed to still be
  // failing on a fresh request — so every line after that point says so,
  // instead of implying it is still as meaningful as the lines before it.
  let serverDied = false;
  async function runPage(width, theme, path, { isMissing = false } = {}) {
    const label = `page ${path} ${width} ${theme}`;
    const ctx = await newContext(browser, { width, theme, scheme: theme === 'light' ? 'dark' : 'light' });
    try {
      const { page, errors, status } = await open(ctx, path);
      const p = [];
      if (isMissing) {
        if (status !== 404) p.push(`HTTP ${status}, expected exactly 404 (a soft-404 — a 200 on an unmatched path — would otherwise pass)`);
      } else if (status >= 400) {
        p.push(`HTTP ${status}`);
      }
      for (const e of errors) if (!(isMissing && /404/.test(e))) p.push(`console: ${e}`);
      const s = await page.evaluate(themeState);
      if (s.bg !== CANVAS[theme]) p.push(`canvas ${s.bg}, expected ${CANVAS[theme]}`);
      // The canvas alone can pass by accident (light stored, light default);
      // the stored choice and html.js must both survive hydration too.
      if (s.theme !== theme) p.push(`data-theme "${s.theme}", stored "${theme}"`);
      if (!s.js) p.push('html.js missing — the pre-paint script did not run or was wiped');
      if (isMissing) {
        const want = path.split('/')[1] === 'th' ? 'th' : 'en';
        const nf = await page.evaluate(() => ({
          lang: document.documentElement.lang,
          h1: [...document.querySelectorAll('h1')].filter((h) => h.getClientRects().length).map((h) => h.textContent.trim()),
          title: document.title,
        }));
        if (nf.lang !== want) p.push(`lang "${nf.lang}", expected "${want}"`);
        if (nf.h1.length !== 1) p.push(`${nf.h1.length} visible h1, expected 1 (one locale copy)`);
        else if (/[฀-๿]/.test(nf.h1[0]) !== (want === 'th')) p.push(`visible copy "${nf.h1[0]}" is not ${want}`);
        if (!nf.h1.length || !nf.title.startsWith(nf.h1[0])) p.push(`tab title "${nf.title}" does not match the visible heading`);
      }
      const ov = await page.evaluate(overflowBleed); // I1 — same combined measure as the home matrix, named element(s) included.
      if (ov.overflow > 0) p.push(`horizontal overflow ${ov.overflow}px${ov.bleeders.length ? ': ' + ov.bleeders.join(', ') : ''}`);
      if (path === '/en/career') {
        const u = new URL(page.url());
        if (u.pathname !== '/en' || u.hash !== '#career') p.push(`landed on ${u.pathname}${u.hash}, expected /en#career (C7 redirect)`);
      } else {
        for (const x of await page.evaluate(contrastIssues)) p.push(`contrast ${x}`);
      }
      const file = `${path.replace(/^\//, '').replace(/\//g, '_')}-${width}-${theme}.png`;
      await page.screenshot({ path: join(OUT, 'pages', file), fullPage: true });
      report(label, p);
      if (status >= 500 && !serverDied) {
        let stillDown = false;
        try {
          stillDown = (await fetch(urlFor('/en'))).status >= 500;
        } catch {
          stillDown = true;
        }
        if (stillDown) {
          serverDied = true;
          log(`     ! server stopped answering after ${path} — later page lines are not meaningful`);
        }
      }
    } catch (e) {
      crashed(label, e);
    } finally {
      await ctx.close();
    }
  }

  for (const width of [1440, 390]) {
    for (const theme of ['light', 'dark']) {
      for (const path of REAL_PATHS) await runPage(width, theme, path);
    }
  }
  for (const width of [1440, 390]) {
    for (const theme of ['light', 'dark']) {
      for (const path of MISSING_PATHS) await runPage(width, theme, path, { isMissing: true });
    }
  }
}

try {
  await preflight();
} catch (e) {
  console.error(redact(e.message));
  process.exit(1);
}
const browser = await launch();
try {
  if (parts.includes('matrix')) {
    log(`# matrix — ${base.origin}`);
    for (const width of [1440, 390]) {
      for (const locale of ['en', 'th']) {
        for (const theme of ['light', 'dark']) {
          for (const motion of [true, false]) await runCombo(browser, { width, locale, theme, motion });
        }
      }
    }
    // PR2 — two narrow QA lines (360×780, 320×568), EN/TH, light, motion on.
    // They run every check the wide combos do except the length budget,
    // which LEN_BUDGET has no entry for at these widths on purpose: the
    // spec's budget is set at 390, so a narrow line only ever prints its
    // length (in the `len=…vh` part of the report line below).
    for (const width of [360, 320]) {
      for (const locale of ['en', 'th']) await runCombo(browser, { width, locale, theme: 'light', motion: true });
    }
  }
  if (parts.includes('probes')) {
    log('# probes');
    await probes(browser);
  }
  if (parts.includes('pages')) {
    log('# standalone pages');
    await pages(browser);
  }
} finally {
  await browser.close();
}
log(failures ? `\n${failures} check group(s) failed — screenshots in ${OUT}` : `\nall green — screenshots in ${OUT}`);
// M6 — R15 exceptions never fail the run, but the tail line and summary.txt
// still say how many there were, so a run that is "all green" only because
// every overage was a reportable one is never confused with a clean run.
if (lenExceptions) log(`${lenExceptions} length exception(s) to report to Klao (R15) — see the [R15: …] lines above`);
writeFileSync(join(OUT, 'summary.txt'), lines.join('\n') + '\n');
process.exitCode = failures ? 1 : 0;
