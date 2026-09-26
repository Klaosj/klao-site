# White Edition — P5 Cleanup, docs, QA matrix and ship gates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the last dark-theme leftovers, document the new Notion schema, prove the finished page against the spec's QA matrix locally and on a Vercel preview, and walk the ship gates (push, Notion migration, merge, unpublish, résumé) with Klao's OK at each one.

**Architecture:** Three strands. (1) Cleanup guarded by tests: a legacy-token guard whose scan widens task by task, a dead-module guard, and a C7 page-order test. (2) Docs pinned by a docs-contract test (property names, env vars, no "instant"). (3) A Playwright QA matrix in `scripts/` — itself self-tested against planted faults — run on the local production build and then on the preview, followed by gate tasks that stop and wait for Klao.

**Tech Stack:** Node 22 · Next.js 15.5 (App Router, ISR 1 h) · Tailwind CSS v4.3 · Vitest 3 · Playwright 1.62 loaded from outside the repo (`PLAYWRIGHT_PATH` or the `~/.npm/_npx` cache) driving installed Chrome (`channel: 'chrome'`) · Lighthouse via `npx` · `gh` CLI · Notion MCP (only at Gate b, only with Klao's OK).

**Spec:** docs/superpowers/specs/2026-09-25-white-edition-design.md · Master plan (contracts, global constraints): docs/superpowers/plans/2026-09-25-white-edition.md

## Global Constraints

Inherits every line of the master plan's Global Constraints. Phase-specific additions:

- **No redesign in P5.** Token swaps reproduce what P0's repoint already rendered. The only deliberate visual changes are the four listed in Task 5's mapping table (404 background, 404 button, code block, quote rule), each because the mechanical swap would render wrong.
- **No new dependencies.** QA loads Playwright from outside the repo; `package.json` gains two scripts and nothing else.
- **QA artefacts live in `/tmp/klao-qa/`** (screenshots, `summary.txt`, Lighthouse JSON). Never commit them.
- **Every gate is a STOP.** End the turn, send Klao the gate message, wait. Continue only on an explicit OK for *that* gate ("ok", "ลุย", "ตาม recommendation", "1A 2B"). An OK for one gate is not an OK for the next. Nothing is pushed, merged, published, or written to Notion, Vercel or GitHub outside a gate.
- **Personal files stay outside the repo.** The résumé `.docx` never enters it; only the rebuilt PDF does, and only after Klao has read the text diff.
- **Stage exact paths.** `git add <paths>` / `git rm <paths>` only — never `git add -A` or `git add .` (a stray, unapproved working tree must not ride along).
- **Docs must match code.** `tests/docs-contract.test.ts` pins the Notion property names (C5), env vars and the banned words; a doc edit that breaks it is wrong, not the test.
- **Waiting uses the Monitor tool** with an until-loop (foreground `sleep` is blocked in Claude Code).

## Review Focus

Re-verify all five master Review Focus lines end to end on the running site, then on the preview:

| # | Master Review Focus | Checked by |
|---|---|---|
| 1 | Pre-migration Notion renders a sensible page (no crash, no empty section) | QA matrix `#<id> has no text` check (Task 2) run in Task 12 (fixture mode) and **Task 13 Gate a** on the preview, which reads the live, not-yet-migrated Notion with `NOTION_DB_STORY`/`NOTION_DB_FAQ` unset; re-run after migration in **Task 14 Gate b** |
| 2 | Storage blocked → theme `auto`, toggle works, nothing throws | Probe `storage-blocked` (Task 2) in Task 12 and Gate a; manual Safari "Block all cookies" pass in Gate a |
| 3 | Bad sheet URLs open nothing; Back closes; a valid hash opens | Probe `sheet-urls` (Task 2) in Task 12 and Gate a; manual Back button in Safari and Firefox in Gate a |
| 4 | No JavaScript: every section's content present, reveals only enhance | Probe `no-js` (Task 2) in Task 12 and Gate a; manual Safari "Disable JavaScript" in Gate a |
| 5 | Thai edge text never throws or drops characters | P0 `keepRuns` unit tests inside `npm run check` (Task 12); TH combinations' `thaiBreaks`/`nwWraps` checks (Task 1–2) in Task 12 and Gate a; manual Safari `/th` pass in Gate a (Safari breaks Thai differently from Chrome) |

---

## Files

| Path | Action | Task |
|---|---|---|
| `scripts/qa-lib.mjs` | Create — Playwright loader, constants, in-page check functions | 1 |
| `scripts/qa-selftest.mjs` | Create — proves each check catches its fault | 1 |
| `scripts/qa-matrix.mjs` | Create — 16-combination runner, probes, standalone pages | 2 |
| `package.json` | Modify — scripts `qa`, `qa:self` | 2 |
| `tests/no-dead-modules.test.ts` | Create | 3 |
| `src/components/sections/ClientsBand.tsx` | Modify — plain `h2.t-h2`, C1 tokens | 3 |
| `src/components/motion/MaskedHeading.tsx`, `tests/masked-heading.test.tsx`, other orphans the guard lists | Delete | 3 |
| `tests/setup.ts` | Modify — drop the Space Grotesk mock if P0 left it | 3 |
| `tests/home-order.test.tsx` | Modify (P2 created it) — exact C7 sequence | 4 |
| `tests/no-legacy-tokens.test.ts` | Create (5), widen scan (6, 7) | 5–7 |
| `src/app/[locale]/{career,projects,writing}/page.tsx`, `src/app/[locale]/work/[slug]/page.tsx`, `src/app/[locale]/writing/[slug]/page.tsx`, `src/app/not-found.tsx`, `src/app/[locale]/not-found.tsx` | Modify — C1 names | 5 |
| `src/components/{PostBody,ProjectCard,SectionLabel,CopyEmail,LocaleToggle}.tsx`, `src/components/project-frame.css` | Modify — whichever still exist | 6 |
| `src/app/globals.css` | Modify — delete the legacy repoint | 7 |
| `docs/NOTION_SETUP.md` | Modify | 8, 11 |
| `tests/docs-contract.test.ts` | Create (8), extend (9, 10) | 8–10 |
| `docs/DEPLOY.md`, `.env.example`, `README.md` | Modify | 9 |
| `design/white-edition/README.md` | Create | 10 |
| `public/suwichak-jarunopratamp-resume.pdf` | Replace (Gate e) | 17 |

Prerequisite: you are on `feat/white-edition` with P0–P4 committed and `npm run check` + `npm run build` green. Confirm first:

```bash
cd "/Users/suvichakjarunopratamp/Desktop/Klao Workspace/Personal/klao-site"
git branch --show-current          # feat/white-edition
git status --short                 # empty; if not, STOP and report the stray files — don't build on them
```

---

### Task 1: QA checks library, proven by a self-test

**Files:** Create `scripts/qa-lib.mjs` · Create `scripts/qa-selftest.mjs`
**Interfaces:** Consumes: C3 `.nw`, C7 section ids, C9 `.rv` and `.t-*` classes, spec §5.1 canvas colours · Produces: `loadChromium()`, `launch()`, `watchErrors(page)`, `pageInit()`, `readPerf()`, `scrollThrough()`, `themeState()`, `collect(opts)`, `contrastIssues()`, constants `SECTION_IDS`, `ANCHOR_IDS`, `TEXT_IDS`, `LEN_BUDGET`, `CANVAS`, `CLS_BUDGET`

A check that can't fail gives false confidence, so the checks are proven against two inline pages first: a clean one (every check must stay quiet) and a dirty one with one planted fault per check. No server is needed.

- [ ] **Step 1: Write the failing self-test** — `scripts/qa-selftest.mjs`:

```js
// Proves every White Edition QA check catches the fault it exists for, and
// stays quiet on a clean page. A check that can't fail is worse than none.
// No server needed: both pages are inline HTML.
//   node scripts/qa-selftest.mjs        (npm run qa:self)
import { collect, contrastIssues, launch, watchErrors } from './qa-lib.mjs';

const OPTS = {
  sectionIds: ['top', 'tour', 'signature', 'work', 'career', 'story', 'faq', 'contact'],
  anchorIds: [],
  textIds: ['top', 'signature', 'work', 'career', 'story', 'faq', 'contact'],
  phone: true,
  thai: true,
  reduced: true,
};

const HEAD = `<!doctype html><html lang="th"><head><meta charset="utf-8"><style>
  body { margin: 0; font: 17px/1.6 sans-serif; color: #1a1c20; background: #fff; }
  section { padding: 24px 20px; }
  h1 { font-size: 22px; }
  .nw { display: inline-block; white-space: nowrap; }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .btn { display: inline-flex; align-items: center; min-height: 44px; padding: 0 22px; }
  summary { min-height: 44px; }
</style></head><body><main>`;
const TAIL = '</main><footer><p>Footer line for the page</p></footer></body></html>';

const CLEAN = `${HEAD}
<section id="top"><h1>ผมสร้าง<span class="nw">เครื่องมือ</span>ที่ใช้เอง</h1><p>Hero copy long enough to count as text.</p><a class="btn" href="#work">Projects</a></section>
<section id="tour"><p>Tour</p></section>
<section id="signature"><h2 class="rv">The idea, then the app.</h2><p>Signature copy long enough to count.</p></section>
<section id="work"><p>Read <a href="#x">this inline link</a> inside a sentence, which is allowed.</p></section>
<section id="career"><p>Career copy long enough to count as text.</p></section>
<section id="story"><p>Story copy long enough to count as text.</p><span class="sr-only">tiny hidden label</span><svg width="40" height="12" aria-hidden="true"><text x="0" y="10" font-size="8">8px</text></svg><p aria-hidden="true" style="font-size:11px">decoration</p></section>
<section id="faq"><details><summary>A question people ask?</summary><p>The answer.</p></details><p>FAQ copy long enough to count as text.</p></section>
<section id="contact"><p>Contact copy long enough to count as text.</p></section>
${TAIL}`;

// One planted fault per check. #faq is missing on purpose.
const DIRTY = `${HEAD}
<script>console.error('qa self-test: planted error');</script>
<section id="top"><h1>ก<br>่าน</h1><p>Hero copy long enough to count as text.</p></section>
<section id="tour"><p>Tour</p></section>
<section id="signature"><h2 class="rv" style="opacity:0">Hidden headline</h2><p>Signature copy long enough to count.</p></section>
<section id="work"><p><a href="#x">Standalone link</a></p><p>Read <a href="#y">this inline link</a> inside a sentence, which is allowed.</p><button style="width:12px;height:12px;padding:0;border:0" aria-label="tiny"></button></section>
<section id="career"><p style="font-size:12px">Tiny caption text for the check</p><p style="color:#cccccc">Low contrast line of text</p></section>
<section id="story"><p style="width:120px"><span class="nw" style="display:inline;white-space:normal">เครื่องมือ นอกเวลางาน สุดสัปดาห์</span></p><div style="width:900px;height:4px"></div></section>
<section id="contact"><p>Hi</p></section>
${TAIL}`;

async function measure(browser, html) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  try {
    const page = await context.newPage();
    const errors = watchErrors(page);
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    const m = await page.evaluate(collect, OPTS);
    const contrast = await page.evaluate(contrastIssues);
    return { ...m, contrast, errors };
  } finally {
    await context.close();
  }
}

const results = [];
const check = (ok, what) => results.push([ok, what]);

const browser = await launch();
try {
  const clean = await measure(browser, CLEAN);
  for (const k of ['missing', 'empty', 'hidden', 'smallText', 'smallTargets', 'thaiBreaks', 'nwWraps', 'contrast', 'errors']) {
    check(clean[k].length === 0, `clean page raises no ${k}${clean[k].length ? ': ' + clean[k].join(' | ') : ''}`);
  }
  check(clean.overflow === 0, `clean page has no horizontal overflow (${clean.overflow}px)`);

  const dirty = await measure(browser, DIRTY);
  check(dirty.missing.includes('faq'), 'a missing section (#faq) is caught');
  check(dirty.empty.includes('contact'), 'a section without text (#contact) is caught');
  check(dirty.hidden.some((x) => x.includes('Hidden headline')), 'an opacity-0 .rv under reduced motion is caught');
  check(dirty.smallText.some((x) => x.includes('Tiny caption')), '12px text on a phone is caught');
  check(dirty.smallTargets.some((x) => x.includes('Standalone link')), 'a short link that is not inside a sentence is caught');
  check(dirty.smallTargets.some((x) => x.startsWith('12×12')), 'a 12×12 button is caught');
  check(!dirty.smallTargets.some((x) => x.includes('this inline link')), 'a link inside a sentence is allowed');
  check(dirty.thaiBreaks.length > 0, 'a Thai line that starts with a tone mark is caught');
  check(dirty.nwWraps.length > 0, 'a keep-span that wraps inside is caught');
  check(dirty.contrast.some((x) => x.includes('Low contrast')), 'low-contrast text is caught');
  check(dirty.overflow > 0, 'horizontal overflow is caught');
  check(dirty.errors.some((x) => x.includes('planted error')), 'a console error is caught');
} finally {
  await browser.close();
}

for (const [ok, what] of results) console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
const failed = results.filter(([ok]) => !ok).length;
console.log(failed ? `\nself-test FAILED (${failed} of ${results.length})` : `\nself-test ok (${results.length} checks)`);
process.exitCode = failed ? 1 : 0;
```

- [ ] **Step 2: Run it and see it fail**

Run: `node scripts/qa-selftest.mjs`
Expected: `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…/scripts/qa-lib.mjs'`

- [ ] **Step 3: Implement** — `scripts/qa-lib.mjs`:

```js
// White Edition QA — shared pieces (spec §1 criterion 4, §11; master plan P5).
//
// Playwright is deliberately NOT a project dependency (Global Constraints: no
// new dependencies); loadChromium() finds a copy outside the repo instead.
//
// pageInit, readPerf, scrollThrough, themeState, collect and contrastIssues
// run INSIDE the page. Playwright serialises each function's source, so they
// must not reach for anything else in this module — every input arrives as
// an argument, and helpers are declared inside the function that uses them.
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** C7 page order, minus #toolbox (an anchor inside #career, checked separately). */
export const SECTION_IDS = ['top', 'tour', 'signature', 'work', 'career', 'story', 'faq', 'contact'];
/** Anchors that must exist but are not measured as sections. */
export const ANCHOR_IDS = ['toolbox'];
/** Sections that must carry readable text even on pre-migration Notion (Review Focus 1). #tour is mostly pictures. */
export const TEXT_IDS = ['top', 'signature', 'work', 'career', 'story', 'faq', 'contact'];
/** Spec §1 criterion 3, in viewport heights, keyed by viewport width. */
export const LEN_BUDGET = { 1440: 8.6, 390: 12 };
/** Spec §5.1 canvas, exactly as getComputedStyle reports it. */
export const CANVAS = { light: 'rgb(255, 255, 255)', dark: 'rgb(10, 11, 13)' };
/** Spec §9. CLS is enforced; LCP is only reported — a local, unthrottled run is not Lighthouse. */
export const CLS_BUDGET = 0.05;

/** Finds Playwright: $PLAYWRIGHT_PATH, then a resolvable `playwright`, then any copy npx cached. */
export async function loadChromium() {
  const candidates = [];
  if (process.env.PLAYWRIGHT_PATH) candidates.push(pathToFileURL(process.env.PLAYWRIGHT_PATH).href);
  candidates.push('playwright');
  const npx = join(homedir(), '.npm', '_npx');
  if (existsSync(npx)) {
    for (const dir of readdirSync(npx)) {
      const entry = join(npx, dir, 'node_modules', 'playwright', 'index.mjs');
      if (existsSync(entry)) candidates.push(pathToFileURL(entry).href);
    }
  }
  for (const spec of candidates) {
    try {
      const mod = await import(spec);
      const chromium = mod.chromium ?? mod.default?.chromium;
      if (chromium) return chromium;
    } catch {
      // Not here — try the next candidate.
    }
  }
  throw new Error(
    'Playwright not found. Set PLAYWRIGHT_PATH to …/node_modules/playwright/index.mjs, ' +
      'or run `npx playwright --version` once so ~/.npm/_npx holds a copy.',
  );
}

/** Installed Chrome by default (QA_CHANNEL=bundled uses Playwright's own Chromium). */
export async function launch() {
  const chromium = await loadChromium();
  const channel = process.env.QA_CHANNEL === 'bundled' ? undefined : process.env.QA_CHANNEL || 'chrome';
  return chromium.launch({ channel });
}

/**
 * Collects console errors and uncaught exceptions. Vercel injects its
 * feedback toolbar (vercel.live) into preview deployments; messages whose
 * source is a Vercel host are its noise, not ours, and are ignored.
 */
export function watchErrors(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const source = msg.location()?.url ?? '';
    if (/^https:\/\/([a-z0-9-]+\.)*vercel\.(live|com)\//.test(source)) return;
    errors.push(msg.text().replace(/\s+/g, ' ').slice(0, 160));
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${String(err?.message ?? err).slice(0, 160)}`));
  return errors;
}

/** Init script: LCP/CLS observers, and the theme the first painted frame had. */
export function pageInit() {
  window.__qa = { lcp: 0, cls: 0 };
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__qa.lcp = e.renderTime || e.loadTime || e.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__qa.cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {
    // Entry type unsupported: both numbers stay 0 and print as such.
  }
  // Once <body> exists the whole <head> — including the pre-paint theme
  // script — has run, so the first frame with a body is the first frame a
  // visitor can see. A theme set later (by hydration) shows up as a mismatch:
  // the flash spec §1 criterion 1 forbids.
  const probe = () => {
    if (!document.body) {
      requestAnimationFrame(probe);
      return;
    }
    window.__qaFirstFrameTheme = document.documentElement.getAttribute('data-theme') || 'auto';
  };
  requestAnimationFrame(probe);
}

export function readPerf() {
  const qa = window.__qa || { lcp: 0, cls: 0 };
  return {
    lcp: Math.round(qa.lcp),
    cls: Number(qa.cls.toFixed(3)),
    firstFrameTheme: window.__qaFirstFrameTheme || 'unrecorded',
  };
}

/** Scrolls the whole page so reveals fire and lazy images load; returns the worst sideways overflow seen. */
export async function scrollThrough() {
  const de = document.documentElement;
  const step = Math.round(window.innerHeight * 0.6);
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  let worst = 0;
  for (let y = 0; y <= de.scrollHeight; y += step) {
    window.scrollTo({ top: y, behavior: 'instant' });
    await wait(120);
    worst = Math.max(worst, de.scrollWidth - de.clientWidth);
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
  await wait(200);
  return worst;
}

/** The applied theme and canvas colour (body, or <html> when body is transparent). */
export function themeState() {
  const de = document.documentElement;
  const body = getComputedStyle(document.body).backgroundColor;
  return {
    theme: de.getAttribute('data-theme') || 'auto',
    bg: body === 'rgba(0, 0, 0, 0)' ? getComputedStyle(de).backgroundColor : body,
    js: de.classList.contains('js'),
  };
}

/**
 * Every in-page measurement of spec §1 criterion 4 and §11.
 * opts: { sectionIds, anchorIds, textIds, phone: boolean, thai: boolean, reduced: boolean }
 */
export function collect(opts) {
  const de = document.documentElement;
  const vh = window.innerHeight;
  const bodyBg = getComputedStyle(document.body).backgroundColor;
  const out = {
    len: Number((de.scrollHeight / vh).toFixed(2)),
    overflow: Math.max(0, de.scrollWidth - de.clientWidth),
    theme: de.getAttribute('data-theme') || 'auto',
    bg: bodyBg === 'rgba(0, 0, 0, 0)' ? getComputedStyle(de).backgroundColor : bodyBg,
    js: de.classList.contains('js'),
    sections: {},
    missing: [],
    empty: [],
    hidden: [],
    smallText: [],
    smallTargets: [],
    thaiBreaks: [],
    nwWraps: [],
  };

  const describe = (el) => {
    const cls =
      typeof el.className === 'string'
        ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((c) => '.' + c).join('')
        : '';
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
    return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${cls} "${text}"`;
  };
  const opacity = (el) => {
    let o = 1;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
    return o;
  };
  const rendered = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  // Not on screen for anyone: decorative, inert, hidden, a closed dialog, or
  // the body of a closed <details> (its <summary> still counts).
  const offstage = (el) =>
    el.closest('svg, [aria-hidden="true"], [inert], [hidden], dialog:not([open])') !== null ||
    (el.closest('details:not([open])') !== null && el.closest('summary') === null);
  // Screen-reader-only text (Tailwind's sr-only, the prototype's .vh, or a
  // clipped 1-px box) is exempt from the visual size rules.
  const srOnly = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      if (n.classList.contains('sr-only') || n.classList.contains('vh')) return true;
      const cs = getComputedStyle(n);
      if (cs.clipPath === 'inset(50%)' || cs.clip === 'rect(0px, 0px, 0px, 0px)') return true;
      if ((cs.position === 'absolute' || cs.position === 'fixed') && n.getBoundingClientRect().width <= 1) return true;
    }
    return false;
  };

  for (const id of opts.sectionIds) {
    const el = document.getElementById(id);
    if (!el) {
      out.missing.push(id);
      continue;
    }
    out.sections[id] = Number((el.getBoundingClientRect().height / vh).toFixed(2));
    if (opts.textIds.includes(id) && (el.innerText || '').trim().length < 20) out.empty.push(id);
    if (opacity(el) < 0.99) out.hidden.push('#' + id);
  }
  for (const id of opts.anchorIds) if (!document.getElementById(id)) out.missing.push(id);
  const footers = document.querySelectorAll('footer');
  if (footers.length) {
    out.sections.footer = Number((footers[footers.length - 1].getBoundingClientRect().height / vh).toFixed(2));
  }

  // Reveals: under reduced motion nothing may stay hidden, scenes included;
  // with motion on, the scroll-through that ran before this must have
  // revealed every one (they fire once, at 85 % of the viewport), while the
  // tour and the Signature scrub own their opacity mid-animation.
  for (const el of document.querySelectorAll('.rv')) {
    if (!rendered(el) || offstage(el)) continue;
    if (!opts.reduced && el.closest('#tour, #signature')) continue;
    if (opacity(el) < 0.99) out.hidden.push(describe(el));
  }

  if (opts.phone) {
    const seen = new Set();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!n.nodeValue.trim() || !el || seen.has(el)) continue;
      seen.add(el);
      if (el.closest('script, style, noscript, template') || offstage(el) || srOnly(el) || !rendered(el)) continue;
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size < 13.99) out.smallText.push(`${size}px ${describe(el)}`);
    }
  }

  // WCAG 2.5.8: 24×24 minimum, except links inside a sentence.
  const inSentence = (a) => {
    const block = a.parentElement;
    if (!block) return false;
    const own = (a.textContent || '').replace(/\s+/g, ' ').trim();
    const all = (block.textContent || '').replace(/\s+/g, ' ').trim();
    return all.length > own.length + 2;
  };
  const TARGETS =
    'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="tab"], [role="radio"], [role="switch"], [tabindex]:not([tabindex="-1"])';
  for (const el of document.querySelectorAll(TARGETS)) {
    if (offstage(el) || srOnly(el) || !rendered(el) || opacity(el) < 0.05) continue;
    const cs = getComputedStyle(el);
    if (cs.pointerEvents === 'none') continue;
    if (el.tagName === 'A' && cs.display === 'inline' && inSentence(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 23.5 || r.height < 23.5) out.smallTargets.push(`${Math.round(r.width)}×${Math.round(r.height)} ${describe(el)}`);
  }

  const range = document.createRange();
  const lineCount = (rects) => {
    const tops = [...rects].filter((r) => r.width > 0).map((r) => r.top).sort((a, b) => a - b);
    let lines = tops.length ? 1 : 0;
    for (let i = 1; i < tops.length; i++) if (tops[i] - tops[i - 1] > 8) lines++;
    return lines;
  };
  for (const span of document.querySelectorAll('.nw')) {
    if (!rendered(span) || offstage(span)) continue;
    range.selectNodeContents(span);
    if (lineCount(range.getClientRects()) > 1) out.nwWraps.push(describe(span));
  }

  if (opts.thai) {
    // Following vowels, above/below vowels and tone marks can't begin a Thai line.
    const DEPENDENT = /[ะ-ฺๅ-๎]/;
    const HEADS = 'h1, h2, h3, .t-hero, .t-h2, .t-title, .t-panel, .t-faq';
    const heads = [...document.querySelectorAll(HEADS)].filter((h) => !h.parentElement?.closest(HEADS));
    for (const h of heads) {
      if (!rendered(h) || offstage(h) || srOnly(h)) continue;
      let lineTop = null;
      const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
      for (let t = walker.nextNode(); t; t = walker.nextNode()) {
        const s = t.nodeValue;
        for (let i = 0; i < s.length; i++) {
          range.setStart(t, i);
          range.setEnd(t, i + 1);
          const r = range.getClientRects()[0];
          if (!r || (!r.width && !r.height)) continue;
          if (lineTop === null) {
            lineTop = r.top;
            continue;
          }
          if (r.top > lineTop + r.height * 0.5) {
            lineTop = r.top;
            if (DEPENDENT.test(s[i])) {
              out.thaiBreaks.push(`"…${s.slice(Math.max(0, i - 6), i)}|${s.slice(i, i + 6)}…" in ${describe(h)}`);
            }
          }
        }
      }
    }
  }
  return out;
}

/** WCAG 1.4.3 text contrast inside <main>; skips text over pictures or gradients. */
export function contrastIssues() {
  const parse = (s) => {
    const m = /^rgba?\(([^)]+)\)$/.exec(s);
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  const lum = (c) => {
    const f = (v) => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const bodyBg = parse(getComputedStyle(document.body).backgroundColor);
  const base = bodyBg && bodyBg.a >= 1 ? bodyBg : parse(getComputedStyle(document.documentElement).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
  const backdrop = (el) => {
    const layers = [];
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage !== 'none') return null; // pictures and gradients can't be judged from colours
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) {
        layers.push(c);
        if (c.a >= 1) break;
      }
    }
    let acc = base.a >= 1 ? base : { r: 255, g: 255, b: 255, a: 1 };
    for (const layer of layers.reverse()) acc = over(layer, acc);
    return acc;
  };
  const out = [];
  const root = document.querySelector('main') || document.body;
  for (const el of root.querySelectorAll('*')) {
    const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim());
    if (!ownText || !el.getClientRects().length) continue;
    if (el.closest('svg, [aria-hidden="true"], .sr-only, dialog:not([open])')) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
    const bg = backdrop(el);
    const fg0 = parse(cs.color);
    if (!bg || !fg0) continue;
    const fg = over(fg0, bg);
    const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a);
    const ratio = (hi + 0.05) / (lo + 0.05);
    const size = parseFloat(cs.fontSize);
    const need = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700) ? 3 : 4.5;
    if (ratio < need) {
      out.push(`${ratio.toFixed(2)}:1 (needs ${need}) ${el.tagName.toLowerCase()} "${(el.textContent || '').trim().slice(0, 40)}"`);
    }
  }
  return out;
}
```

- [ ] **Step 4: Run and pass**

Run: `node scripts/qa-selftest.mjs && npx eslint scripts`
Expected: 22 lines starting `ok  `, then `self-test ok (22 checks)`; ESLint prints nothing. (On this machine Playwright is found in `~/.npm/_npx` automatically; to pin it: `PLAYWRIGHT_PATH=/Users/suvichakjarunopratamp/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs node scripts/qa-selftest.mjs`.)
If a *clean* check fails, the check is too strict; if a *dirty* check fails, it can't see its fault — fix `qa-lib.mjs`, never the fixture.

- [ ] **Step 5: Commit**

```bash
git add scripts/qa-lib.mjs scripts/qa-selftest.mjs
git commit -F - <<'EOF'
test(qa): self-tested checks for the White Edition QA matrix

Each check proves it catches a planted fault and stays quiet on a clean
page before it is trusted with the real site.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
```

---

### Task 2: QA matrix runner and npm scripts

**Files:** Create `scripts/qa-matrix.mjs` · Modify `package.json`
**Interfaces:** Consumes: `scripts/qa-lib.mjs` (Task 1), C2 (`localStorage['klao-theme']`, `<html data-theme>`, `html.js`), C6 (`#work/<key>`), C7 ids, C8 (`klao:palette` event) · Produces: `npm run qa [baseUrl] [--only=matrix,probes,pages]`, `npm run qa:self`, `/tmp/klao-qa/*.png`, `/tmp/klao-qa/pages/*.png`, `/tmp/klao-qa/summary.txt`

- [ ] **Step 1: Write the failing check**

The check is the command the rest of the plan relies on: `npm run qa:self`.

- [ ] **Step 2: Run it and see it fail**

Run: `npm run qa:self`
Expected: `npm error Missing script: "qa:self"`

- [ ] **Step 3: Implement**

In `package.json`, replace
```json
    "check": "tsc --noEmit && eslint . && vitest run"
```
with
```json
    "check": "tsc --noEmit && eslint . && vitest run",
    "qa": "node scripts/qa-matrix.mjs",
    "qa:self": "node scripts/qa-selftest.mjs"
```

Create `scripts/qa-matrix.mjs`:

```js
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
  collect,
  contrastIssues,
  launch,
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
const log = (s) => {
  console.log(s);
  lines.push(s);
};
const report = (label, problems, extra = '') => {
  if (problems.length) failures++;
  log(`${problems.length ? 'FAIL' : 'ok  '} ${label}${extra ? ' ' + extra : ''}`);
  for (const p of problems.slice(0, 8)) log(`     - ${p}`);
  if (problems.length > 8) log(`     - …and ${problems.length - 8} more`);
};

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
}

async function newContext(browser, { width, theme, motion = true, scheme, blockStorage = false, js = true }) {
  const context = await browser.newContext({
    viewport: { width, height: width === 1440 ? 900 : 844 },
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
  await page.goto(urlFor(path), { waitUntil: 'load', timeout: 90_000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(400);
  return { page, errors };
}

async function runCombo(browser, c) {
  const name = `${c.width}-${c.locale}-${c.theme}-${c.motion ? 'mo' : 'rm'}`;
  // The system scheme is the opposite of the stored choice on purpose: the
  // stored choice must win (spec §6 Theme), so anything that reads
  // prefers-color-scheme directly shows up as the wrong background.
  const context = await newContext(browser, { ...c, scheme: c.theme === 'light' ? 'dark' : 'light' });
  try {
    const { page, errors } = await open(context, `/${c.locale}`);
    const perf = await page.evaluate(readPerf);
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
    await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
    const overflow = Math.max(m.overflow, scrollOverflow);
    const p = [];
    if (m.len > LEN_BUDGET[c.width]) p.push(`page length ${m.len} screens > ${LEN_BUDGET[c.width]}`);
    if (overflow > 0) p.push(`horizontal overflow ${overflow}px`);
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
    report(name, p, `len=${m.len}vh overflow=${overflow} errors=${errors.length} cls=${perf.cls} lcp=${perf.lcp}ms`);
    log(`     sections ${Object.entries(m.sections).map(([k, v]) => `${k}=${v}`).join(' ')}`);
  } catch (e) {
    report(name, [`crashed: ${String(e.message).split('\n')[0]}`]);
  } finally {
    await context.close();
  }
}

async function probes(browser) {
  // Spec §6 Theme: with nothing stored, Auto follows the system scheme.
  for (const scheme of ['light', 'dark']) {
    const ctx = await newContext(browser, { width: 1440, scheme });
    try {
      const { page, errors } = await open(ctx, '/en');
      const s = await page.evaluate(themeState);
      const p = errors.map((e) => `console: ${e}`);
      if (s.theme !== 'auto') p.push(`data-theme "${s.theme}" with nothing stored`);
      if (s.bg !== CANVAS[scheme]) p.push(`canvas ${s.bg}, expected ${CANVAS[scheme]} (system ${scheme})`);
      report(`probe auto-${scheme}`, p);
    } finally {
      await ctx.close();
    }
  }

  // Review Focus 2: storage throws → auto, the toggle still works, nothing throws.
  {
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
      report('probe storage-blocked', p, note);
    } finally {
      await ctx.close();
    }
  }

  // Review Focus 3: bad hashes open nothing; a valid one opens; Back closes.
  {
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
      report('probe sheet-urls', p, note);
    } finally {
      await ctx.close();
    }
  }

  // Review Focus 4: the server HTML alone shows every section; reveals only enhance.
  {
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
      report('probe no-js', p, note);
    } finally {
      await ctx.close();
    }
  }

  // Global Constraints: ⌘K Ask Preview makes no model call and sends nothing.
  {
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
      report('probe palette-no-network', p, seen ? 'palette opened' : 'palette not seen (P4 unit tests cover it)');
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
  } finally {
    await discover.close();
  }
  const PATHS = ['/en/projects', '/th/projects', '/en/writing', '/th/writing', '/en/career', '/en/qa-missing-page', ...extra];
  for (const width of [1440, 390]) {
    for (const theme of ['light', 'dark']) {
      for (const path of PATHS) {
        const label = `page ${path} ${width} ${theme}`;
        const ctx = await newContext(browser, { width, theme, scheme: theme === 'light' ? 'dark' : 'light' });
        try {
          const { page, errors } = await open(ctx, path);
          const p = [];
          const missingPage = path.endsWith('/qa-missing-page');
          for (const e of errors) if (!(missingPage && /404/.test(e))) p.push(`console: ${e}`);
          const s = await page.evaluate(themeState);
          if (s.bg !== CANVAS[theme]) p.push(`canvas ${s.bg}, expected ${CANVAS[theme]}`);
          const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
          if (overflow) p.push(`horizontal overflow ${overflow}px`);
          if (path === '/en/career') {
            const u = new URL(page.url());
            if (u.pathname !== '/en' || u.hash !== '#career') p.push(`landed on ${u.pathname}${u.hash}, expected /en#career (C7 redirect)`);
          } else {
            for (const x of await page.evaluate(contrastIssues)) p.push(`contrast ${x}`);
          }
          const file = `${path.replace(/^\//, '').replace(/\//g, '_')}-${width}-${theme}.png`;
          await page.screenshot({ path: join(OUT, 'pages', file), fullPage: true });
          report(label, p);
        } catch (e) {
          report(label, [`crashed: ${String(e.message).split('\n')[0]}`]);
        } finally {
          await ctx.close();
        }
      }
    }
  }
}

try {
  await preflight();
} catch (e) {
  console.error(e.message);
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
writeFileSync(join(OUT, 'summary.txt'), lines.join('\n') + '\n');
process.exitCode = failures ? 1 : 0;
```

- [ ] **Step 4: Run and pass**

```bash
npm run qa:self                       # self-test ok (22 checks)
npx eslint scripts package.json       # no output
node --check scripts/qa-matrix.mjs    # no output
```
Then exercise the runner once against the dev server. Start it with the Bash tool's `run_in_background: true`: `npm run dev`. Wait until `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/en` prints `200`, then:

```bash
npm run qa
```
Expected: 16 matrix lines (`ok  1440-en-light-mo len=…vh overflow=0 errors=0 cls=… lcp=…ms`, each followed by a `sections top=… tour=… … footer=…` line), 6 probe lines, 28 or more page lines, and `/tmp/klao-qa/summary.txt` written. The runner is done when it completes and prints every line. A `FAIL` line here is a finding about P0–P4 work, not about the script: note it, fix it in the component that owns it (superpowers:systematic-debugging), commit each fix on its own as `fix(<area>): …`, and re-run. All findings must be closed before Task 12 can pass. Stop the dev server when done.

- [ ] **Step 5: Commit**

```bash
git add scripts/qa-matrix.mjs package.json
git commit -F - <<'EOF'
feat(qa): npm run qa — 16-combination matrix, probes and standalone pages

1440/390 × EN/TH × light/dark × motion/reduced against any base URL,
plus probes for Auto theme, blocked storage, bad #work/ links, no JS and
a ⌘K that sends nothing. Playwright stays outside the repo.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
```

---

### Task 3: Dead-code sweep

**Files:** Create `tests/no-dead-modules.test.ts` · Modify `src/components/sections/ClientsBand.tsx` · Delete every orphan the guard lists (expected: `src/components/motion/TiltCard.tsx` + `src/components/motion/tilt.css` + `tests/tilt-card.test.tsx` — P2 deleted WorkDeck, their only user, and left them for this sweep; `src/components/motion/MaskedHeading.tsx` + `tests/masked-heading.test.tsx` once ClientsBand drops it; `src/components/ProjectTour.tsx` + `src/components/project-tour.css` if P1's HeroTourStage replaced them; `src/components/sections/skill-icons.tsx` if P3 left it. `LocaleToggle` and `CopyEmail` are kept and reworked by P1 and P4 — delete them only if the guard lists them) · Modify `tests/setup.ts` (only if it still mocks Space Grotesk)
**Interfaces:** Consumes: the P1–P4 module graph; spec §4 (ClientsBand stays in code, unrendered) · Produces: `tests/no-dead-modules.test.ts`

- [ ] **Step 1: Write the failing test** — `tests/no-dead-modules.test.ts`:

```ts
import { readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { describe, expect, it } from 'vitest';

// White Edition P5 dead-code sweep. Every module under src/components and
// src/lib must have at least one importer in src/ — a module only its own
// test imports is dead product code that still costs review and build time.
// ClientsBand is the one deliberate exception: spec §4 keeps it in the code,
// unrendered, until profile.clients has names again.
const KEEP = new Set(['src/components/sections/ClientsBand.tsx']);

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}

const sources = new Map(
  walk('src')
    .filter((f) => /\.(tsx?|css|json)$/.test(f))
    .map((f) => [f, readFileSync(f, 'utf8')] as const),
);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Any string literal ending in /<name> or /<name>.css counts as a use:
// static imports, next/dynamic(() => import('…')), and CSS side-effect imports.
function importers(file: string): string[] {
  const name = basename(file).replace(/\.(tsx?|css)$/, '');
  const re = new RegExp(`['"\`][^'"\`]*/${escape(name)}(?:\\.css)?['"\`]`);
  return [...sources].filter(([f, body]) => f !== file && re.test(body)).map(([f]) => f);
}

describe('dead code', () => {
  it('finds a real importer (self-check of the matcher)', () => {
    expect(importers('src/lib/models.ts').length).toBeGreaterThan(0);
  });

  it('leaves no module under src/components or src/lib without an importer', () => {
    const orphans = [...sources.keys()]
      .filter((f) => /^src\/(components|lib)\//.test(f) && /\.(tsx?|css)$/.test(f) && !KEEP.has(f))
      .filter((f) => importers(f).length === 0);
    expect(orphans, orphans.join('\n')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/no-dead-modules.test.ts`
Expected: the self-check passes; the orphan test FAILS and prints the orphan paths (some subset of the candidates in **Files** above). If it passes, P1–P4 already cleaned up; still do Step 3 (a)–(c).

- [ ] **Step 3: Implement**

(a) **ClientsBand** — its MaskedHeading is the last user of MaskedHeading and it still carries dark-band classes. Replace the whole `return (…)` block of `src/components/sections/ClientsBand.tsx` (from `return (` after the `clients.length === 0` guard to the closing `);`) and drop the `import MaskedHeading …` line:

```tsx
  // Kept in the code, unrendered (spec §4): a plain band in C9 terms so it
  // is correct on arrival if it ever returns to the page.
  return (
    <section id="clients" className="band">
      <div className="wrap">
        <h2 className="t-h2">{t.clientsHeading}</h2>
        {/* Names are proper nouns (Profile.clients) and render identically
            in both locales. A plain list, most recognisable name first. */}
        <ul className="mt-14 flex list-none flex-col gap-[2px]">
          {clients.map((name, i) => (
            <Reveal
              as="li"
              key={name}
              delayIndex={i}
              className="text-[clamp(20px,3.4vw,40px)] font-semibold leading-[1.2] text-ink-1"
            >
              {name}
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
```
Also update the file's top comment: `Reveal/MaskedHeading are themselves client components` → `Reveal is itself a client component`. If P0 changed Reveal's props, keep the call shape the rest of `src/` uses today (`grep -n "<Reveal" -r src | head`).

(b) **Delete every orphan** the test listed, with its test file(s) and CSS import:
```bash
git rm <each orphan path printed in Step 2>
grep -rlE "<OrphanName>" tests      # for each orphan's basename; git rm the tests that only cover it
```
After (a), `src/components/motion/MaskedHeading.tsx` is an orphan too: `git rm src/components/motion/MaskedHeading.tsx tests/masked-heading.test.tsx`. If `src/app/globals.css` still has `.rv-mask` rules, delete them (MaskedHeading was their only user).
Re-run `npx vitest run tests/no-dead-modules.test.ts` after each round of deletions: removing a module can orphan what only it imported (`TiltCard.tsx` → `tilt.css`). Repeat until it passes.

(c) **Advisory inventory** — exports, CSS selectors, dictionary keys and `public/` files nothing uses. Write this to `/tmp/klao-p5-inventory.mjs` (outside the repo) and run it from the repo root with `node /tmp/klao-p5-inventory.mjs`:

```js
// Advisory only: prints candidates; you decide, delete, and let tsc + tests confirm.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
const src = walk('src');
const text = new Map(src.map((f) => [f, readFileSync(f, 'utf8')]));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const code = src.filter((f) => /\.tsx?$/.test(f));

console.log('## Exports in src/lib no other src file mentions');
for (const f of src.filter((x) => x.startsWith('src/lib/') && /\.tsx?$/.test(x))) {
  for (const [, name] of text.get(f).matchAll(/^export (?:async )?(?:function|const|let|type|interface|class) ([A-Za-z0-9_]+)/gm)) {
    const re = new RegExp(`\\b${esc(name)}\\b`);
    if (!code.some((g) => g !== f && re.test(text.get(g)))) console.log(`  ${f}: ${name}`);
  }
}

console.log('## CSS class/id selectors no TS/TSX file mentions');
const allCode = code.map((f) => text.get(f)).join('\n');
for (const f of src.filter((x) => x.endsWith('.css'))) {
  const css = text.get(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/url\([^)]*\)/g, '');
  const names = new Set([...css.matchAll(/[.#](-?[A-Za-z_][\w-]*)/g)].map((m) => m[1]).filter((n) => !/^[0-9a-fA-F]{3,8}$/.test(n)));
  for (const n of names) if (!new RegExp(`(^|[^\\w-])${esc(n)}($|[^\\w-])`).test(allCode)) console.log(`  ${f}: ${n}`);
}

console.log('## Dictionary keys no component reads');
const dict = text.get('src/lib/dictionary.ts');
const en = dict.slice(dict.indexOf('const en = {'), dict.indexOf('const th'));
const others = code.filter((f) => f !== 'src/lib/dictionary.ts').map((f) => text.get(f)).join('\n');
for (const [, k] of en.matchAll(/^  ([A-Za-z0-9_]+):/gm)) if (!new RegExp(`[.'"\`{ ,]${esc(k)}\\b`).test(others)) console.log(`  ${k}`);

console.log('## public/ files no src file names');
for (const f of walk('public')) {
  if (f.split('/').pop().startsWith('.')) continue;
  const rel = f.slice('public'.length);
  if (![...text.values()].some((t) => t.includes(rel))) console.log(`  ${f}`);
}
```
Act on it:
- **Unused `src/lib` exports** → delete the export and its code, and the tests that cover only it (e.g. old `HEX`/`rgbFloat`/`PARTICLE_COLORS` if P0 left any).
- **Unused selectors** → delete the rule blocks (typical dark-era leftovers: `#cursor`, `.halo`, `.u-draw`, `.pill-1…3`, `.nav-link`, `header.nav-on-light …`, `section.bg-dark::after`, `.nav-burger` — only if listed). Keep anything toggled at runtime whose name the inventory missed; the in-page QA in Step 4 shows if a deletion mattered.
- **Unused dictionary keys** → delete the key from both `en` and `th`; `tsc` catches any it missed (e.g. a destructured key).
- **`public/` files** → `public/og/og-en.png`/`og-th.png` are built by a template string in `layout.tsx` and `suwichak-jarunopratamp-resume.pdf` is the Profile ResumeURL: keep all three. Delete any other listed file.

(d) **tests/setup.ts** — only if `grep -nE "Space_Grotesk|font-sg" tests/setup.ts` prints anything (P0 may already have done this): replace the mock with
```ts
vi.mock('next/font/google', () => ({
  Anuphan: mockGoogleFont('anuphan'),
}));
```
and in the comment above it change `calling Space_Grotesk()/Anuphan() at module scope` to `calling Anuphan() at module scope` and `so \`--font-sg\`/\`--font-anuphan\` resolve` to `so \`--font-anuphan\` resolves`.

- [ ] **Step 4: Run and pass**

```bash
npx vitest run tests/no-dead-modules.test.ts   # 2 passed
npm run check                                  # tsc 0 errors · eslint 0 errors · all tests pass
npm run build                                  # compiles; route table printed
```

- [ ] **Step 5: Commit**

```bash
git status --short     # only the paths you edited or deleted in this task
git add tests/no-dead-modules.test.ts src/components/sections/ClientsBand.tsx
git add tests/setup.ts src/app/globals.css src/lib/dictionary.ts   # only those you changed
git rm <every deleted path, if not already staged by git rm above>
git commit -F - <<'EOF'
refactor: remove modules nothing imports after the White Edition rewrite

tests/no-dead-modules.test.ts keeps it that way; ClientsBand is the one
deliberate exception (spec §4) and drops MaskedHeading for a plain h2.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
```

---

### Task 4: Pin the home page order (C7)

**Files:** Modify `tests/home-order.test.tsx` (created by P2 with pairwise checks — tour before signature before work; P3/P4 may have appended more)
**Interfaces:** Consumes: C7 · `HomePage` from `src/app/[locale]/page.tsx` · Produces: the exact-order guard for the whole page

P2's tests check neighbours. The finished page needs the whole sequence pinned, and a guard against any extra `<section id>`.

- [ ] **Step 1: Write the test** — in `tests/home-order.test.tsx`, make the vitest import line
```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
```
and append at the end of the file (keep every existing test):

```tsx
// Master plan C7, the whole sequence. `toolbox` is the anchor inside Career
// that FAQ deep links target. Every <section> with an id counts too, so a
// band slipped back in — ClientsBand's #clients stays in the code, unrendered
// (spec §4), and the fixtures DO carry client names — fails here.
const C7 = ['top', 'tour', 'signature', 'work', 'career', 'toolbox', 'story', 'faq', 'contact'];

function pageIds(html: string): string[] {
  const ids: string[] = [];
  for (const [, tag, id] of html.matchAll(/<([a-z][a-z0-9]*)\b[^>]*?\sid="([^"]+)"/g)) {
    if (tag === 'section' || C7.includes(id)) ids.push(id);
  }
  return ids;
}

describe('home page order — the finished page (C7, P5)', () => {
  beforeEach(() => {
    // Fixture mode: the order must hold with no Notion at all.
    vi.stubEnv('NOTION_TOKEN', '');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reads section ids the way the order test relies on', () => {
    const html = '<section class="x" id="top"></section><div id="toolbox"></div><div id="note"></div><section id="clients"></section>';
    expect(pageIds(html)).toEqual(['top', 'toolbox', 'clients']);
  });

  it.each(['en', 'th'] as const)('renders exactly the C7 sections, in order, on /%s', async (locale) => {
    const html = renderToStaticMarkup(await HomePage({ params: Promise.resolve({ locale }) }));
    expect(pageIds(html)).toEqual(C7);
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx vitest run tests/home-order.test.tsx`
Expected: the parser self-check passes. The two new order tests either pass (P1–P4 landed C7 exactly) or FAIL with a diff naming the stray, missing or misplaced id — then fix the page, never the test. If `tests/bands.test.tsx` still exists and only asserts section order, `git rm` it: this file supersedes it.

- [ ] **Step 3: Implement**

Only if Step 2 failed: correct `src/app/[locale]/page.tsx` (or the section that renders the wrong id) so the rendered order is exactly C7. No change otherwise.

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/home-order.test.tsx && npm run check`
Expected: P2's tests plus the 3 new ones pass; check green.

- [ ] **Step 5: Commit**

```bash
git add tests/home-order.test.tsx      # plus src/app/[locale]/page.tsx and/or git rm tests/bands.test.tsx if Step 2/3 touched them
git commit -F - <<'EOF'
test(home): pin the C7 section order

Any other <section id> fails the test, so a band can't return unnoticed.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
```

---

### Task 5: Legacy tokens out of the standalone routes

**Files:** Create `tests/no-legacy-tokens.test.ts` · Modify `src/app/[locale]/career/page.tsx`, `src/app/[locale]/projects/page.tsx`, `src/app/[locale]/work/[slug]/page.tsx`, `src/app/[locale]/writing/page.tsx`, `src/app/[locale]/writing/[slug]/page.tsx`, `src/app/not-found.tsx`, `src/app/[locale]/not-found.tsx`
**Interfaces:** Consumes: C1 utilities (`text-ink-1/2/3`, `bg-canvas`, `bg-mist`, `text-kram`, `bg-kram`, `text-on-kram`, `border-link`, `border-line`, `bg-line`, `bg-card`) and raw variables (`--canvas --mist --ink-1 --ink-2 --ink-3 --kram --link --focus --select --line`), C9 `.btn .btn-fill` · Produces: `tests/no-legacy-tokens.test.ts` (scan widened in Tasks 6–7)

**Mapping** (used in Tasks 5–7). Left: legacy name P0 repointed. Right: what replaces it. Opacity suffixes carry over (`bg-dark/70` → `bg-canvas/70`); variants carry over (`hover:text-soft` → `hover:text-ink-2`).

| Legacy | Replace with | Note |
|---|---|---|
| `text-soft`, `text-on-dark-soft`, `text-on-light-soft` | `text-ink-2` | |
| `text-ink`, `text-on-dark`, `text-on-light` | `text-ink-1` | `ink` bare only — `text-ink-1` is already C1 |
| `border-on-dark-faint`, `border-on-light-faint`, `divide-on-…-faint` | `border-line`, `divide-line` | |
| `bg-on-dark-faint` | `bg-line` | |
| `border-on-dark-mid` | `border-ink-3` | interactive outline, ≥ 3:1 in both themes (WCAG 1.4.11) |
| `bg-dark`, `bg-light`, `bg-paper` | `bg-canvas` | |
| `bg-deep` | `bg-mist` | |
| `text-peri`, `border-peri`, `bg-peri` | `text-kram`, `border-kram`, `bg-kram` | |
| `text-peri-deep`, `border-peri-deep`, `bg-peri-deep` | `text-link`, `border-link`, `bg-link` | |
| `text-dark` on a peri/kram fill | `text-on-kram` | |
| `text-dark` anywhere else | `text-ink-1` | |
| **`bg-light … text-dark` pill with `.btn`** | **`btn btn-fill`** (drop the colour, size and padding utilities) | deliberate: the mechanical swap is white on white |
| **`bg-ink … text-paper` (code block)** | **`bg-mist … text-ink-1`** | deliberate: readable in both themes |
| **`border-ink` (quote rule)** | **`border-ink-3`** | deliberate: calm rule in both themes |
| **404 section `bg-deep`** | **`bg-canvas`** | deliberate: a 404 sits on the page canvas like every other page |
| `var(--color-dark)`, `var(--color-light)`, `var(--color-paper)` | `var(--canvas)` | CSS |
| `var(--color-deep)` | `var(--mist)` | CSS |
| `var(--color-on-dark)`, `…-on-light`, `var(--color-ink)` | `var(--ink-1)` | CSS |
| `var(--color-on-dark-soft)`, `…-on-light-soft`, `var(--color-soft)` | `var(--ink-2)` | CSS |
| `var(--color-on-dark-mid)` | `var(--ink-3)` | CSS |
| `var(--color-on-dark-faint)`, `…-on-light-faint` | `var(--line)` | CSS |
| `var(--color-peri)` | `var(--kram)`; in `outline:` for focus → `var(--focus)`; in `::selection` → `var(--select)` | CSS |
| `var(--color-peri-deep)` | `var(--link)` | CSS |

`line` and `card` are C1 names too: `border-line`, `divide-line`, `bg-line`, `bg-card` stay as they are.

- [ ] **Step 1: Write the failing test** — `tests/no-legacy-tokens.test.ts`:

```ts
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// White Edition P0 pointed the dark theme's colour names at the new tokens
// (dark→canvas, peri→kram, soft→ink-2, …) so pages nobody had rebuilt yet
// kept rendering. P5 moved every usage to the C1 names and deleted that
// repoint. In Tailwind v4 a utility exists only while its token does, so an
// old name typed from memory would ship unstyled with no error — this test
// fails first instead.
//
// `line` and `card` are NOT legacy: C1 kept both names (border-line, bg-card).
// `ink` counts only bare (`text-ink`), never `text-ink-1`.
const LEGACY = [
  'on-dark-soft', 'on-dark-faint', 'on-dark-mid', 'on-dark',
  'on-light-soft', 'on-light-faint', 'on-light',
  'peri-deep', 'peri', 'dark', 'deep', 'light', 'paper', 'ink', 'soft',
].join('|');
const PREFIX = 'bg|text|border(?:-[trblxyse])?|divide|ring(?:-offset)?|outline|fill|stroke|from|via|to|decoration|shadow|placeholder|caret|accent';
const UTILITY = new RegExp(`(?<![\\w-])(?:${PREFIX})-(?:${LEGACY})(?![\\w-])`, 'g');
const CSS_VAR = new RegExp(`--color-(?:${LEGACY})(?![\\w-])`, 'g');

// Widened task by task in P5: routes (Task 5) → components and lib (Task 6)
// → all of src/, globals.css included (Task 7).
const SCAN = ['src/app/[locale]', 'src/app/not-found.tsx'];

function files(p: string): string[] {
  if (!statSync(p).isDirectory()) return [p];
  return readdirSync(p, { withFileTypes: true }).flatMap((e) => files(join(p, e.name)));
}

function hits(text: string): string[] {
  return [...text.matchAll(UTILITY), ...text.matchAll(CSS_VAR)].map((m) => m[0]);
}

describe('legacy colour tokens', () => {
  it('recognises every legacy form and none of the C1 names', () => {
    const legacy = ['text-soft', 'hover:text-ink', 'border-on-dark-faint', 'bg-dark/70', 'text-peri-deep', 'bg-paper', 'var(--color-deep)', 'section.bg-light', 'divide-on-light-faint'];
    const current = ['text-ink-1', 'text-ink-2', 'border-line', 'divide-line', 'bg-card', 'bg-canvas', 'bg-mist', 'text-kram', 'bg-kram-hover', 'text-on-kram', 'var(--color-ink-1)', 'var(--line)', '[data-theme="dark"]', 'dark:bg-mist', "pref === 'light'", 'nav-on-light'];
    for (const s of legacy) expect(hits(s), s).not.toEqual([]);
    for (const s of current) expect(hits(s), s).toEqual([]);
  });

  it('appears nowhere in the scanned source', () => {
    const found = SCAN.flatMap(files)
      .filter((f) => /\.(tsx?|css|mjs)$/.test(f))
      .flatMap((f) =>
        readFileSync(f, 'utf8')
          .split('\n')
          .flatMap((line, i) => hits(line).map((h) => `${f}:${i + 1} ${h}`)),
      );
    expect(found, found.join('\n')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/no-legacy-tokens.test.ts`
Expected: the self-check passes; the scan FAILS listing lines such as `src/app/[locale]/career/page.tsx:74 text-soft`, `src/app/[locale]/work/[slug]/page.tsx:… border-peri-deep`, `src/app/not-found.tsx:… bg-deep` (exact line numbers depend on P1–P4).

- [ ] **Step 3: Implement** — replace exactly these class strings (today's text; if a phase changed a line, apply the mapping table to what is there):

`src/app/[locale]/career/page.tsx`
- `className="text-sm underline hover:text-soft"` → `className="text-sm underline hover:text-ink-2"`
- `<span className="font-normal text-soft">` → `<span className="font-normal text-ink-2">`
- `<p className="mt-1 text-xs text-soft">` → `<p className="mt-1 text-xs text-ink-2">`

`src/app/[locale]/projects/page.tsx`
- `className="mt-3 max-w-[60ch] text-[14.5px] text-soft"` → `className="mt-3 max-w-[60ch] text-[14.5px] text-ink-2"`

`src/app/[locale]/work/[slug]/page.tsx`
- `className="text-soft hover:text-ink"` → `className="text-ink-2 hover:text-ink-1"`
- `<p className="mt-3 text-xs text-soft">` → `<p className="mt-3 text-xs text-ink-2">`
- `<p className="mt-10 text-xs text-soft">` → `<p className="mt-10 text-xs text-ink-2">`
- live pill: `border border-peri-deep px-4 py-2 text-[12px] font-semibold text-peri transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-peri hover:text-dark` → `border border-link px-4 py-2 text-[12px] font-semibold text-kram transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-kram hover:text-on-kram`
- repo pill: `border border-on-dark-mid px-4 py-2 text-[12px] font-medium transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-peri hover:text-peri` → `border border-ink-3 px-4 py-2 text-[12px] font-medium transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-kram hover:text-kram`
- in the comment above the pills: `on-dark-mid border (finding 5)` → `ink-3 border, ≥ 3:1 (finding 5)`

`src/app/[locale]/writing/page.tsx`
- `<p className="mt-6 text-[14.5px] text-soft">` → `<p className="mt-6 text-[14.5px] text-ink-2">`
- `<p className="mt-1 text-xs text-soft">` → `<p className="mt-1 text-xs text-ink-2">`

`src/app/[locale]/writing/[slug]/page.tsx`
- `className="text-soft hover:text-ink"` → `className="text-ink-2 hover:text-ink-1"`
- `<p className="mt-2 text-xs text-soft">` → `<p className="mt-2 text-xs text-ink-2">`

`src/app/not-found.tsx` **and** `src/app/[locale]/not-found.tsx` (same five edits in each)
- `justify-center bg-deep px-6` → `justify-center bg-canvas px-6`
- `` `mb-5 text-[9.5px] uppercase text-on-dark-soft ${ `` → `` `mb-5 text-[9.5px] uppercase text-ink-2 ${ ``
- `tracking-[-0.025em] text-on-dark">` → `tracking-[-0.025em] text-ink-1">`
- `leading-[1.7] text-on-dark-soft">` → `leading-[1.7] text-ink-2">`
- CTA: `className="btn mt-10 inline-flex items-center gap-3 rounded-full bg-light px-8 py-4 text-[13.5px] font-semibold text-dark"` → `className="btn btn-fill mt-10 inline-flex items-center gap-3"`
- links: `className="text-on-dark-soft underline underline-offset-4 transition-colors hover:text-on-dark"` → `className="text-ink-2 underline underline-offset-4 transition-colors hover:text-ink-1"`
- in `src/app/[locale]/not-found.tsx` only, replace the comment above the CTA:
```tsx
      {/* `.btn btn-fill` is the site's primary pill (C9: 44 px, kram fill) —
          the same control as the Close band's Start a conversation. */}
```

If the scan also lists `src/app/[locale]/page.tsx` or `layout.tsx`, fix those lines with the mapping table.

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/no-legacy-tokens.test.ts && npm run check`
Expected: 2 passed; check green.

- [ ] **Step 5: Commit**

```bash
git add tests/no-legacy-tokens.test.ts "src/app/[locale]/career/page.tsx" "src/app/[locale]/projects/page.tsx" "src/app/[locale]/work/[slug]/page.tsx" "src/app/[locale]/writing/page.tsx" "src/app/[locale]/writing/[slug]/page.tsx" src/app/not-found.tsx "src/app/[locale]/not-found.tsx"
git commit -F - <<'EOF'
refactor(tokens): standalone routes use the White Edition names

The 404 button becomes btn-fill: the mechanical swap rendered it white
on white.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
```

---

### Task 6: Legacy tokens out of shared components and lib

**Files:** Modify `tests/no-legacy-tokens.test.ts` · Modify whichever of these still exist after Task 3: `src/components/PostBody.tsx`, `src/components/ProjectCard.tsx`, `src/components/SectionLabel.tsx`, `src/components/CopyEmail.tsx`, `src/components/LocaleToggle.tsx`, `src/components/project-frame.css`
**Interfaces:** Consumes: Task 5 mapping table · Produces: guard covering `src/components` and `src/lib`

- [ ] **Step 1: Widen the test** — in `tests/no-legacy-tokens.test.ts` replace
```ts
const SCAN = ['src/app/[locale]', 'src/app/not-found.tsx'];
```
with
```ts
const SCAN = ['src/app/[locale]', 'src/app/not-found.tsx', 'src/components', 'src/lib'];
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/no-legacy-tokens.test.ts`
Expected: FAIL listing lines in `PostBody.tsx`, `ProjectCard.tsx`, `SectionLabel.tsx`, and — if they survived P1–P4 unconverted — `CopyEmail.tsx`, `LocaleToggle.tsx`, `project-frame.css`.

- [ ] **Step 3: Implement**

`src/components/PostBody.tsx`
- `className="underline hover:text-soft"` → `className="underline hover:text-ink-2"`
- `className="border-l-2 border-ink pl-4 italic text-soft"` → `className="border-l-2 border-ink-3 pl-4 italic text-ink-2"`
- `className="overflow-x-auto rounded bg-ink p-4 text-sm text-paper"` → `className="overflow-x-auto rounded bg-mist p-4 text-sm text-ink-1"`
- `className="mt-1 text-xs text-soft"` → `className="mt-1 text-xs text-ink-2"`

`src/components/ProjectCard.tsx`
- `` `${locale === 'th' ? '' : 'italic '}text-[13px] text-peri` `` → `` `${locale === 'th' ? '' : 'italic '}text-[13px] text-kram` ``
- `className="mt-1 text-sm text-soft"` → `className="mt-1 text-sm text-ink-2"`
- `className="mt-3 text-xs text-soft"` → `className="mt-3 text-xs text-ink-2"`
- story CTA: `border border-peri-deep px-4 py-2 text-[12px] font-semibold text-peri transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-peri hover:text-dark` → `border border-link px-4 py-2 text-[12px] font-semibold text-kram transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-kram hover:text-on-kram`
- both neutral pills (live, repo): `border border-on-dark-mid px-4 py-2 text-[12px] font-medium transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-peri hover:text-peri` → `border border-ink-3 px-4 py-2 text-[12px] font-medium transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-kram hover:text-kram`
- comments: `The peri color already carries` → `The kram colour already carries`; `peri outline that` → `link-blue outline that` (the next line, `fills on hover`, stays); and replace these four comment lines
```
            Three QA fixes ride on this row. The neutral border is
            `on-dark-mid`, not `line`: at rgba(...,0.15) `line` is a hairline
            below 3:1 against the page, so an interactive control was
            outlined in something WCAG 1.4.11 doesn't count as visible
            (finding 5) -- `line` stays correct for non-interactive dividers.
```
with
```
            Three QA fixes ride on this row. The neutral border is `ink-3`,
            not `line`: `line` is a 10 % hairline, below the 3:1 WCAG 1.4.11
            asks of an interactive boundary (finding 5); ink-3 clears it in
            both themes, and `line` stays correct for non-interactive dividers.
```

`src/components/SectionLabel.tsx`
- `font-semibold uppercase text-peri ${` → `font-semibold uppercase text-kram ${`
- `className="h-px w-7 shrink-0 bg-peri-deep"` → `className="h-px w-7 shrink-0 bg-link"`

`src/components/CopyEmail.tsx` (if it exists)
- `className="border-b border-on-dark-faint pb-[3px]"` → `className="border-b border-line pb-[3px]"`
- `} uppercase text-peri transition-opacity` → `} uppercase text-kram transition-opacity`
- comment: replace the two lines
```
          tier is and why Thai runs +1px. Peri is kept (not the tier's usual
          on-dark-soft): this one is a state confirmation, not a field name,
```
with
```
          tier is and why Thai runs +1px. The accent (kram) is kept, not
          ink-2: this one is a state confirmation, not a field name,
```

`src/components/LocaleToggle.tsx` (if it exists — Task 3 deletes it when nothing imports it)
- `` `inline-flex items-center justify-center p-1.5 -m-1.5 ${active ? 'font-semibold' : 'text-soft'}` `` → `` `inline-flex items-center justify-center p-1.5 -m-1.5 ${active ? 'font-semibold' : 'text-ink-2'}` ``
- `<span className="text-soft"> / </span>` → `<span className="text-ink-2"> / </span>`

`src/components/project-frame.css` (if it exists and is listed) — replace the whole file:
```css
/* ProjectFrame — a quiet window around a real screenshot (spec 2026-09-10 §5),
   on the White Edition tokens (C1). The hairline stays so a white UI shot
   doesn't vanish on a white page (White Edition spec §5.3). */
.pframe {
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  background: var(--mist);
}
.pframe-chrome {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  background: var(--mist);
  border-bottom: 1px solid var(--line);
}
.pframe-chrome > i {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--ink-3);
}
.pframe-title {
  margin-left: 8px;
  min-width: 0;
  font-family: inherit;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--ink-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pframe-screen {
  aspect-ratio: 16 / 9;
  background: var(--mist);
  display: grid;
}
.pframe-screen > img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* Tall captures keep their header and crop at the bottom. */
  object-position: top;
}
```
Any other listed line: apply the mapping table.

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/no-legacy-tokens.test.ts && npm run check`
Expected: 2 passed; check green.

- [ ] **Step 5: Commit**

```bash
git add tests/no-legacy-tokens.test.ts src/components/PostBody.tsx src/components/ProjectCard.tsx src/components/SectionLabel.tsx
git add src/components/CopyEmail.tsx src/components/LocaleToggle.tsx src/components/project-frame.css   # only those that exist and changed
git commit -F - <<'EOF'
refactor(tokens): shared components use the White Edition names

Code blocks move to mist so they read in both themes.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
```

---

### Task 7: Delete the legacy repoint; check the standalone pages in both themes

**Files:** Modify `tests/no-legacy-tokens.test.ts` · Modify `src/app/globals.css`
**Interfaces:** Consumes: C1 (the repoint P0 added to `@theme inline`) · Produces: a `globals.css` with no legacy names; screenshots `/tmp/klao-qa/pages/*.png`

- [ ] **Step 1: Widen the test to all of src/** — replace
```ts
const SCAN = ['src/app/[locale]', 'src/app/not-found.tsx', 'src/components', 'src/lib'];
```
with
```ts
const SCAN = ['src'];
```
and change the comment above it to:
```ts
// All of src/, globals.css included: the repoint is gone (P5 Task 7), so a
// legacy name anywhere is a bug.
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/no-legacy-tokens.test.ts`
Expected: FAIL listing only `src/app/globals.css` lines — the `--color-dark: var(--canvas);`-style declarations P0 put in `@theme inline`, plus any old selector still keyed on a legacy utility (e.g. `section.bg-light`).

- [ ] **Step 3: Implement**

In `src/app/globals.css`: delete every line the test listed that declares a legacy `--color-*` variable, and the comment block that introduces them (P0's repoint comment — it has no reader once the lines are gone). If an old rule selects a legacy utility (`section.bg-light …`, `section.bg-dark::after`), delete the whole rule block: Task 3's inventory already showed nothing renders that class. A `var(--color-<legacy>)` inside a rule that stays gets the mapping table's raw variable (`::selection` → `var(--select)`, focus `outline` → `var(--focus)`).

- [ ] **Step 4: Run and pass**

```bash
npx vitest run tests/no-legacy-tokens.test.ts   # 2 passed
npm run check                                   # green
npm run build                                   # compiles
```
Then the standalone pages in both themes. Start `npm run dev` with `run_in_background: true`, wait for `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/en` → `200`, then:
```bash
npm run qa -- --only=pages
```
Expected: every `page …` line `ok` — no console error, canvas `rgb(255, 255, 255)` light / `rgb(10, 11, 13)` dark, no sideways scroll, no contrast failure, and `/en/career` landing on `/en#career` (C7 redirect; the Career page component itself is only reachable through `tests/smoke.test.tsx`).
Look at the screenshots (Read tool on the PNGs): `en_projects-1440-light.png`, `en_projects-1440-dark.png`, `th_projects-390-dark.png`, `en_writing-390-light.png`, `en_qa-missing-page-1440-light.png`, `en_qa-missing-page-1440-dark.png`, and any `en_work_*` / `en_writing_*` slug page. Each must read cleanly: no dark band left over, pills and the 404 button visible, captions legible. Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add tests/no-legacy-tokens.test.ts src/app/globals.css
git commit -F - <<'EOF'
refactor(tokens): delete the legacy colour repoint

Nothing in src/ uses the dark-theme names any more; the guard now scans
all of src/.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
```

---

### Task 8: NOTION_SETUP.md — new properties, Story and FAQ databases, migration checklist

**Files:** Create `tests/docs-contract.test.ts` · Modify `docs/NOTION_SETUP.md`
**Interfaces:** Consumes: C5 property names, C6 `projectKey`, `src/content/fixtures/story.json`, `faq.json`, `projects.json`, `career.json`, `profile.json` · Produces: the guide Klao follows at Gate b; `tests/docs-contract.test.ts`

Spec §9 asks each schema change to update this guide in the same commit, so P1/P3/P4 may already have added parts. **Step 0:** run `grep -nE "StatusKey|StartDate|PrologueEN|^### Story|^### FAQ" docs/NOTION_SETUP.md`. Where the guide already has an equivalent passage, replace it with the text below so there is exactly one copy. The test decides what must be present.

- [ ] **Step 1: Write the failing test** — `tests/docs-contract.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import story from '@/content/fixtures/story.json';

// docs/NOTION_SETUP.md is what Klao follows when he changes the live CMS.
// A property name misspelled there becomes a property the mappers never
// read — silently. The names below are the master plan's contract C5.
const NEW_PROPERTIES: Record<string, string[]> = {
  Projects: ['StatusKey', 'StatusEN', 'StatusTH', 'KickerEN', 'KickerTH', 'Media', 'Wash', 'Tour', 'TourOrder', 'LineageOf', 'AltEN', 'AltTH'],
  Career: ['StartDate', 'EndDate', 'FigureValue', 'FigureLabelEN', 'FigureLabelTH', 'FigureNoteEN', 'FigureNoteTH'],
  Profile: ['PrologueEN', 'PrologueTH', 'ClosingLineEN', 'ClosingLineTH', 'BasedInEN', 'BasedInTH', 'WorkingIn'],
  Story: ['TitleEN', 'TitleTH', 'BodyEN', 'BodyTH', 'RuleEN', 'RuleTH', 'Icon', 'Sketch', 'Order', 'Published'],
  FAQ: ['QuestionEN', 'QuestionTH', 'AnswerEN', 'AnswerTH', 'Links', 'Order', 'Published'],
};
const SELECTS: Record<string, string[]> = {
  StatusKey: ['live', 'proto', 'pitched', 'finalist'],
  Media: ['img', 'win', 'notion', 'rings', 'five'],
  Wash: ['aje', 'gonai', 'site', 'none'],
};
// The site refreshes through ISR (about an hour); docs must never promise more.
const BANNED_WORDS = /\binstant(ly)?\b|\bimmediately\b/i;

const guide = readFileSync('docs/NOTION_SETUP.md', 'utf8');

/** The guide's "### <db>" section, up to the next ## or ### heading. */
function section(db: string): string {
  const start = guide.indexOf(`\n### ${db}\n`);
  if (start < 0) return '';
  const rest = guide.slice(start + db.length + 6);
  const end = rest.search(/\n#{2,3} /);
  return end < 0 ? rest : rest.slice(0, end);
}

/** The first table row `| <prop> | … |` inside that section. */
function row(db: string, prop: string): string {
  return section(db).split('\n').find((l) => l.startsWith(`| ${prop} |`)) ?? '';
}

describe('docs/NOTION_SETUP.md', () => {
  it.each(Object.entries(NEW_PROPERTIES))('lists every %s property the mappers read', (db, props) => {
    for (const p of props) expect(row(db, p), `${db}.${p}`).not.toBe('');
  });

  it('names every select option exactly', () => {
    for (const [prop, options] of Object.entries(SELECTS)) {
      for (const o of options) expect(row('Projects', prop), `${prop}: ${o}`).toContain(o);
    }
  });

  it('offers every Icon and Sketch the bundled chapters use', () => {
    for (const c of story as { icon: string; sketch: string }[]) {
      expect(row('Story', 'Icon'), c.icon).toContain(c.icon);
      expect(row('Story', 'Sketch'), c.sketch).toContain(c.sketch);
    }
  });

  it('documents the two new environment variables and the migration checklist', () => {
    expect(guide).toContain('NOTION_DB_STORY');
    expect(guide).toContain('NOTION_DB_FAQ');
    expect(guide).toMatch(/^## 6\. White Edition migration/m);
    expect(guide).toMatch(/in any order/);
  });

  it('never promises instant updates', () => {
    expect(guide).not.toMatch(BANNED_WORDS);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/docs-contract.test.ts`
Expected: FAIL — missing rows (`Projects.StatusKey`, …, `Story.TitleEN`), missing env names and migration heading, and the banned-word test catching `instantly` in "Everyday workflow".

- [ ] **Step 3: Implement** — edit `docs/NOTION_SETUP.md` (each "Replace" is the exact current text).

**3.1** Replace
```markdown
## 2. Create six databases

Full-page databases, anywhere in your workspace. **Property names must match
exactly** — same spelling, same capitalization.
```
with
```markdown
## 2. Create eight databases

Full-page databases, anywhere in your workspace — Projects, Posts, Career,
Skills, Questions, Profile, Story and FAQ. **Property names must match
exactly** — same spelling, same capitalization.
```

**3.2** Replace
```markdown
Each database also needs a **Published** checkbox property, except Profile
(details in its section below).
```
with
```markdown
Each database also needs a **Published** checkbox property, except Profile
(details in its section below).

**Thai display text** (titles, questions, headlines): a `|` marks the one
place the line may break and is never shown — for example
`ไอเดียนี้คุ้มกับ|หนึ่งสุดสัปดาห์ หรือทั้งปี?`. Without one, the site still keeps
common long words, dates and number + unit pairs from splitting.
```

**3.3** First check what feeds the index: `grep -n "getFeaturedProjects\|getProjects" "src/app/[locale]/page.tsx"`. Then replace
```markdown
| Slug | Text | |
| Published | Checkbox | (see above) |

`Featured` controls which 3 projects show on the home page. `Order` controls
display order everywhere (lower first).
```
with (if the page passes `getProjects()` instead of `getFeaturedProjects()`, write the first sentence as "`Published` decides which projects appear in the home page's Projects index (`#work`); `Featured` is no longer read there.")
```markdown
| Slug | Text | |
| StatusKey | Select (live, proto, pitched, finalist) | |
| StatusEN | Text | |
| StatusTH | Text | |
| KickerEN | Text | |
| KickerTH | Text | |
| Media | Select (img, win, notion, rings, five) | |
| Wash | Select (aje, gonai, site, none) | |
| Tour | Checkbox | |
| TourOrder | Number | |
| LineageOf | Relation → Projects | |
| AltEN | Text | |
| AltTH | Text | |
| Published | Checkbox | (see above) |

`Featured` + `Published` decide which projects appear in the home page's
Projects index (`#work`); there is no cap. `Order` controls display order
everywhere (lower first). The twelve properties added in September 2026 are
explained under "White Edition fields" at the end of this section.
```

**3.4** Replace
```markdown
`Type` decides which pitch-deck chapter the project appears in on the home
page (and which group on /projects): `Business` rows lead, `Build` rows
follow. **A blank or unrecognised Type renders as Build** — existing rows
keep working untouched until you tag them.
```
with
```markdown
`Type` decides which column of the home page's Projects index the project
sits in (Business or Build), and which group it joins on /projects.
**A blank or unrecognised Type renders as Build** — existing rows keep
working untouched until you tag them.
```

**3.5** Replace
```markdown
`OutcomeEN`/`OutcomeTH` are the one-line receipt shown on the project's
slide ("Validated with 3 paying pilots"). Only real, checkable results —
leave blank until you have the number, and the line simply won't render.
Never write a placeholder here.
```
with
```markdown
`OutcomeEN`/`OutcomeTH` are the project's receipts, **one per line** — each
line becomes one bullet in the project's sheet (`#work/<key>`). Leave
`OutcomeTH` empty and the English lines are reused on /th. Only real,
checkable results — leave blank until you have the number. Never write a
placeholder here.
```

**3.6** Replace
```markdown
**A row with a blank Name is silently dropped** — it won't appear anywhere
on the site, with no visible error (the only trace is a server log you'll
never see).

### Posts
```
with
```markdown
**A row with a blank Name is silently dropped** — it won't appear anywhere
on the site, with no visible error (the only trace is a server log you'll
never see).

#### White Edition fields (September 2026)

All twelve may stay empty — the site falls back to a sensible default for
each (Media: `img` when the row has a Screenshot, otherwise `win`; Wash:
`none`; not in the tour; no lineage card), so they can be added in any
order.

| Property | What it does | Example |
|---|---|---|
| StatusKey | Shape of the status mark (monochrome: a shape and words, no colour) | `live` |
| StatusEN / StatusTH | The words beside the mark | `Live · since Aug 2026` / `เปิดใช้งานแล้ว · ตั้งแต่ ส.ค. 2026` |
| KickerEN / KickerTH | Small line above the project's question | `Build · Live` / `สร้างเอง · เปิดใช้งานแล้ว` |
| Media | What the index and the sheet show: `img` the screenshot, `win` the screenshot in a window frame, `notion` a drawn Notion row, `rings` the TAM/SAM/SOM drawing, `five` the five-apps-to-one drawing | `win` |
| Wash | The pale tint behind the project in the tour and the Signature scene | `gonai` |
| Tour | Puts the project in the hero tour | ticked on Aje, GoNai, klao-site |
| TourOrder | Tour order, lower first — fill it on every Tour row | `1` |
| LineageOf | The earlier idea this project grew from; the Signature scene and the "Same idea, four years apart" card read it | GoNai → Tripedia |
| AltEN / AltTH | What the picture shows, for screen readers — never just the project name, which is already on screen | `GoNai home screen: plan a full day out and know every baht before you leave.` |

The page is designed around one lineage pair (GoNai → Tripedia).

### Posts
```

**3.7** Replace
```markdown
| WinsTH | Text | |
| Order | Number | |
| Published | Checkbox | (see above) |
```
with
```markdown
| WinsTH | Text | |
| StartDate | Date | |
| EndDate | Date | |
| FigureValue | Text | |
| FigureLabelEN | Text | |
| FigureLabelTH | Text | |
| FigureNoteEN | Text | |
| FigureNoteTH | Text | |
| Order | Number | |
| Published | Checkbox | (see above) |
```
Before saving, confirm the two date columns against the Career mapper (`grep -n "StartDate\|EndDate" src/lib/notion-mappers.ts`): if it reads them as rich text rather than a date, write `Text (YYYY-MM)` as their type instead of `Date`.

**3.8** Replace
```markdown
section. **A row with a blank Role is silently dropped**, same as Name on
Projects above.
```
with
```markdown
section. **A row with a blank Role is silently dropped**, same as Name on
Projects above.

`StartDate` and `EndDate` place the job on the Career band's time rail; only
the month is shown. Leave `EndDate` empty for the job you're in now — it
reads "Now".

`FigureValue`, `FigureLabelEN/TH` and `FigureNoteEN/TH` add one big number
to the job's panel. Example (the Casetify row): `THB 1.1M` · `My personal
monthly sales target` / `เป้ายอดขายส่วนตัวต่อเดือน` · `Target met` /
`ทำถึงเป้า`. Leave `FigureValue` empty and the panel shows no figure. Same
receipt rule as Outcome: only a real, checkable number.

Each job's deep-link key is its `Company` turned into a slug by `slugKey()`
in `src/lib/format.ts` (`Actmedia` → `actmedia`); FAQ links use it as
`career:actmedia`. **Renaming a Company changes its key** — update any FAQ
`Links` line that pointed at the old one.
```

**3.9** Replace the Skills paragraph that starts `` `Tier` still controls the full honesty scale`` and ends `or the row disappears with no\nvisible error.` (the whole paragraph) with the text below. It follows P3's toolbox rule (P3 plan, open item 1: grouping does not come from `Category`); confirm against `src/lib/career.ts` (`grep -n "TOOLBOX_STACK\|'top'" src/lib/career.ts`) and adjust the wording if P3 changed it:
```markdown
The toolbox at the end of the Career band (`#toolbox`) has three columns.
**Methods** are the Skills rows whose `Tier` is `top`. **Stack** is a short
curated list kept in code (`TOOLBOX_STACK` in `src/lib/career.ts`), and
**Languages** comes from the site's own text — neither is read from this
database. `Category` is not used for the grouping. **Rows with a blank Name
or a blank/unrecognised Tier are silently dropped**, same mechanism as Name
on Projects and Role on Career above — `Tier` must be spelled exactly one of
the five values, or the row disappears with no visible error.
```

**3.10** Replace
```markdown
| Clients | Multi-select | |
```
with
```markdown
| Clients | Multi-select | |
| PrologueEN | Text | |
| PrologueTH | Text | |
| ClosingLineEN | Text | |
| ClosingLineTH | Text | |
| BasedInEN | Text | |
| BasedInTH | Text | |
| WorkingIn | Text | |
```

**3.11** Replace
```markdown
`NameNative` is the native-script display name (Thai) that drives the /th
hero wordmark — empty falls back to the Latin name. `Clients` fills the
"Companies & brands" band; leave it empty and that band simply doesn't
render. (Notion multi-select options can't contain commas, so e.g. "MMB
Technology Co., Ltd" has to be entered without its comma.)
```
with
```markdown
`NameNative` (the Thai display name) is no longer shown: the hero stopped
drawing a name wordmark in September 2026. It can stay filled. `Clients`
feeds a "Companies & brands" band that is kept in the code but not on the
page, so filling it changes nothing today. (Notion multi-select options
can't contain commas, so e.g. "MMB Technology Co., Ltd" has to be entered
without its comma.)

`PrologueEN/TH` is the owner-side story at the start of "By day"
(`#story`), and `ClosingLineEN/TH` the line that closes it ("Business
developer who builds his own tools."). `BasedInEN/TH` and `WorkingIn` fill
the Based in / Working in facts in the closing Contact block (`Bangkok, TH`
· `TH / EN`). Any of them may stay empty while you migrate; the page still
renders.
```

**3.12** Replace `Create exactly **one row**. Unlike the other three databases, **Profile has` with `Create exactly **one row**. Unlike every other database, **Profile has`, and replace `filter the other five fetchers use, with a comment noting exactly this.)` with `filter every other fetcher uses, with a comment noting exactly this.)`.

**3.13** Replace
```markdown
## 3. Share each database with the integration

On each of the six databases: `•••` menu (top right) → **Connections** →
add `klao-site`. Do this for all six — a database you forget to share
```
with (before running the doc test, replace `SKETCH_OPTIONS` with the exact output of `node -e "console.log(require('./src/content/fixtures/story.json').map(c => c.sketch).join(', '))"` — the sketch names the bundled chapters use, in order. P3 also exports them as `STORY_SKETCHES` (and the icons as `STORY_ICONS`); if those lists hold more options than the fixture uses, list them all. The test fails if one the fixture uses is missing)
````markdown
### Story

The six "By day" chapters (`#story`), one row each. New in September 2026.

| Property | Type | Required |
|---|---|---|
| TitleEN | Title | **Yes** |
| TitleTH | Text | |
| BodyEN | Text | |
| BodyTH | Text | |
| RuleEN | Text | |
| RuleTH | Text | |
| Icon | Select (target-duotone, chart-line-up-duotone, translate-duotone, rocket-launch-duotone, key-duotone, wrench-duotone) | |
| Sketch | Select (SKETCH_OPTIONS) | |
| Order | Number | |
| Published | Checkbox | (see above) |

`BodyEN/TH` is one short paragraph; wrap the one clause that should be bold
in `**double asterisks**`. `RuleEN/TH` is the short rule beside the icon
(`Scope it honestly.` / `ประเมินตามจริง`). `Icon` and `Sketch` pick the
chapter's icon and line drawing — spell the option exactly as listed.
`Order` runs 1–6.

Until `NOTION_DB_STORY` is set, the page shows the bundled chapters
(`src/content/fixtures/story.json`) — never an empty section.

### FAQ

"What people usually ask." (`#faq`), one row per question. New in September
2026.

| Property | Type | Required |
|---|---|---|
| QuestionEN | Title | **Yes** |
| QuestionTH | Text | |
| AnswerEN | Text | |
| AnswerTH | Text | |
| Links | Text | |
| Order | Number | |
| Published | Checkbox | (see above) |

`Links` holds the answer's deep links, **one per line**, as
`LabelEN|LabelTH|target` — keep both `|` even when the two labels match:

```
Career · Actmedia|Career · Actmedia|career:actmedia
Projects|โปรเจกต์|work
```

| target | Opens |
|---|---|
| `work` | the Projects index |
| `work/<key>` | that project's sheet — `<key>` is the project's `Slug`, or its Name as a slug when Slug is empty (`work/gonai`) |
| `career:<key>` | that job in the Career band (`career:actmedia`; see Career above) |
| `toolbox` | the toolbox at the end of the Career band |
| `contact` | the closing Contact block |
| `https://…` | an outside page |

If you add "What work is he open to?", leave it unpublished until its answer
is written. Until `NOTION_DB_FAQ` is set, the page shows the bundled answers
(`src/content/fixtures/faq.json`).

## 3. Share each database with the integration

On each of the eight databases: `•••` menu (top right) → **Connections** →
add `klao-site`. Do this for all eight — a database you forget to share
````

**3.14** Replace
```markdown
Copy `.env.example` to `.env.local`. It has eight lines — the seven Notion
values below, plus `NEXT_PUBLIC_SITE_URL` (leave that one blank for local
```
with
```markdown
Copy `.env.example` to `.env.local`. It has ten lines — the nine Notion
values below, plus `NEXT_PUBLIC_SITE_URL` (leave that one blank for local
```
and replace
```markdown
NOTION_DB_QUESTIONS=...
```
with
```markdown
NOTION_DB_QUESTIONS=...
NOTION_DB_STORY=...
NOTION_DB_FAQ=...
```

**3.15** Replace
```markdown
Set all seven Notion values together, not just some of them. The site
treats "Notion configured" as "the token is present" — so if the token is
set but a database ID is missing, the code doesn't fail loudly: the missing
ID check throws *before* any request reaches Notion, and (during a build)
that throw is caught the same way as every other Notion failure in this
guide — silent fallback to sample content, not a visible connection error.

**One exception:** `NOTION_DB_QUESTIONS` doesn't go through that missing-ID
throw at all. With the token set and `NOTION_DB_QUESTIONS` left blank,
`getQuestionsCached` (`src/lib/content.ts`) returns an empty list before
attempting any fetch — no throw, no fixture fallback, no build-vs-runtime
ISR split. The only visible effect is that the home page's open-questions
band doesn't render; nothing else on the site is touched. This is
deliberate — the owner adds Vercel env vars in a separate step from code
deploys, and Questions is the one database allowed to sit unconfigured
indefinitely without degrading anything else.
```
with
```markdown
Set the token and the five core database IDs (Projects, Posts, Career,
Skills, Profile) together, not just some of them. The site treats "Notion
configured" as "the token is present" — so if the token is set but one of
those IDs is missing, the code doesn't fail loudly: the missing ID check
throws *before* any request reaches Notion, and (during a build) that throw
is caught the same way as every other Notion failure in this guide — silent
fallback to sample content, not a visible connection error.

**Three exceptions:** `NOTION_DB_QUESTIONS`, `NOTION_DB_STORY` and
`NOTION_DB_FAQ` don't go through that missing-ID throw at all.

- With the token set and `NOTION_DB_QUESTIONS` left blank,
  `getQuestionsCached` (`src/lib/content.ts`) returns an empty list before
  attempting any fetch — no throw, no fixture fallback. The only visible
  effect is that the open question in the closing Contact block doesn't
  render.
- With `NOTION_DB_STORY` or `NOTION_DB_FAQ` left blank, `getStory()` /
  `getFaq()` return the bundled chapters and answers
  (`src/content/fixtures/story.json`, `faq.json`) — never an empty section.

This is deliberate — the owner adds Vercel env vars in a separate step from
code deploys, so these three may sit unset without degrading anything else.
```
and replace `For the live site, the same seven variables go into Vercel` with `For the live site, the same nine variables go into Vercel`.

**3.16** Replace
```markdown
## Why images don't break
```
with the migration section followed by that heading:
```markdown
## 6. White Edition migration (one-time, September 2026)

The White Edition home page reads a few new properties and two new
databases. **The mappers tolerate every new field being empty, so add
properties in any order** — the live site keeps rendering at every step,
and the code that is live before the White Edition merge ignores
properties it doesn't know. Don't rename or delete an existing property:
that code still reads them.

Work top to bottom; tick as you go.

1. **Projects — add the twelve properties** from the Projects table
   (StatusKey, StatusEN, StatusTH, KickerEN, KickerTH, Media, Wash, Tour,
   TourOrder, LineageOf, AltEN, AltTH). Create the select options exactly
   as written (lowercase). `LineageOf` is a relation to the Projects
   database itself.
2. **Projects — fill the five lineup rows.** Values from the approved
   prototype; the Thai text, kickers and alt text are in
   `src/content/fixtures/projects.json`:

   | Row | StatusKey | StatusEN | Media | Wash | Tour | TourOrder | LineageOf |
   |---|---|---|---|---|---|---|---|
   | Talatify | pitched | Pitched · TEP 2025 | rings | none | — | — | — |
   | Tripedia | finalist | Final 30 of 500 · 2022 | five | none | — | — | — |
   | Aje | proto | Working prototype | img | aje | ✓ | 1 | — |
   | GoNai | live | Live · since Aug 2026 | win | gonai | ✓ | 2 | Tripedia |
   | klao-site | live | Live · since Aug 2026 | notion | site | ✓ | 3 | — |

   Rewrite `OutcomeEN`/`OutcomeTH` as one receipt per line.
3. **Career — add the seven properties** (StartDate, EndDate, FigureValue,
   FigureLabelEN/TH, FigureNoteEN/TH). Fill StartDate/EndDate on every row
   (`src/content/fixtures/career.json` has them) and the one figure with a
   receipt: Casetify — `THB 1.1M`, "My personal monthly sales target",
   "Target met".
4. **Profile — add the seven properties** (PrologueEN/TH, ClosingLineEN/TH,
   BasedInEN/TH, WorkingIn) and fill them from
   `src/content/fixtures/profile.json`.
5. **Create the Story database** (section 2), add the six chapters from
   `src/content/fixtures/story.json` with Order 1–6, tick Published.
6. **Create the FAQ database** (section 2), add the questions from
   `src/content/fixtures/faq.json`, tick Published.
7. **Share Story and FAQ with the integration** (`•••` → Connections → add
   `klao-site`, as in section 3). Without this the site keeps showing the
   bundled copy and looks correct — the quiet failure described below.
8. **Set the two IDs**, `NOTION_DB_STORY` and `NOTION_DB_FAQ`, in
   `.env.local` and on Vercel for Production and Preview (and Development),
   then **redeploy** — `docs/DEPLOY.md` step 5: a saved variable doesn't
   reach a deployment that already exists.
9. **Prove it's live:** add a throwaway FAQ row `TEST — delete me`, tick
   Published, check `#faq` on the redeployed site (the bundled copy can't
   contain it), then delete the row. Content edits after this reach
   production within about an hour, through ISR.
10. **Untick Published on the AISecretary and DailyBrief rows** — they are
    no longer part of the site. Best done just before the White Edition
    merge, so the first new build never shows them.

## Why images don't break
```

**3.17** Replace `Skills/Questions filters on it — and, only for a single post's own page,` with `Skills/Questions/Story/FAQ filters on it — and, only for a single post's own page,` and replace `For Projects/Posts/Career/Skills/Questions, a row dropped this way just` with `For Projects/Posts/Career/Skills/Questions/Story/FAQ, a row dropped this way just`.

**3.18** Replace
```markdown
`TEST — delete me` works well — tick **both Published and Featured**, and
check the home page's Work grid. (The grid shows every Featured+Published
project, uncapped; `/en/projects` is no longer a page of its own — it
redirects to the home grid.) Fixture content cannot pass this test —
```
with
```markdown
`TEST — delete me` works well — tick **both Published and Featured**, and
check the home page's Projects index (`#work`; it shows every Featured +
Published project, uncapped, and `/en/projects` lists every Published one).
Fixture content cannot pass this test —
```

**3.19** Replace
```markdown
- Tick **Published** when a Project, Post, Career entry, or Skill is ready
  to show. Untick it to hide it again — instantly for local dev, within the
  hour for production (see below). Profile has no Published toggle; it's
  always live.
```
with
```markdown
- Tick **Published** when a Project, Post, Career entry, Skill, Story
  chapter or FAQ is ready to show. Untick it to hide it again — on the next
  reload in local dev, within about an hour in production (see below).
  Profile has no Published toggle; it's always live.
```

- [ ] **Step 4: Run and pass**

Run: `grep -n "SKETCH_OPTIONS" docs/NOTION_SETUP.md; npx vitest run tests/docs-contract.test.ts && npm run check`
Expected: the grep prints nothing; the docs tests all pass (5 Projects/Career/Profile/Story/FAQ rows + 4 more); check green.

- [ ] **Step 5: Commit**

```bash
git add docs/NOTION_SETUP.md tests/docs-contract.test.ts
git commit -F - <<'EOF'
docs(notion): White Edition properties, Story and FAQ databases, migration checklist

tests/docs-contract.test.ts pins every C5 property name, the select
options, the Story icon/sketch options and the ISR wording.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
```

---

### Task 9: DEPLOY.md env list, .env.example, README (QA + wording)

**Files:** Modify `tests/docs-contract.test.ts`, `docs/DEPLOY.md`, `.env.example`, `README.md`
**Interfaces:** Consumes: C5 env names · Produces: complete env docs; README "Browser QA" section

- [ ] **Step 1: Extend the failing test** — append to `tests/docs-contract.test.ts`:

```ts
const ALL_ENV = [
  'NOTION_TOKEN', 'NOTION_DB_PROJECTS', 'NOTION_DB_POSTS', 'NOTION_DB_CAREER', 'NOTION_DB_PROFILE',
  'NOTION_DB_SKILLS', 'NOTION_DB_QUESTIONS', 'NOTION_DB_STORY', 'NOTION_DB_FAQ',
];

describe('deploy docs, env example and README', () => {
  it('.env.example has a line for every Notion variable', () => {
    const env = readFileSync('.env.example', 'utf8');
    for (const v of ALL_ENV) expect(env, v).toMatch(new RegExp(`^${v}=`, 'm'));
  });

  it('docs/DEPLOY.md lists every Notion variable and promises nothing instant', () => {
    const deploy = readFileSync('docs/DEPLOY.md', 'utf8');
    for (const v of ALL_ENV) expect(deploy, v).toContain(v);
    expect(deploy).not.toMatch(BANNED_WORDS);
  });

  it('README explains the QA matrix and promises nothing instant', () => {
    const readme = readFileSync('README.md', 'utf8');
    expect(readme).toContain('npm run qa');
    expect(readme).not.toMatch(BANNED_WORDS);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/docs-contract.test.ts`
Expected: FAIL — DEPLOY.md lacks `NOTION_DB_SKILLS`, `NOTION_DB_QUESTIONS`, `NOTION_DB_STORY`, `NOTION_DB_FAQ`; README lacks `npm run qa` and contains "immediately"; `.env.example` lacks the two new lines unless P3/P4 added them.

- [ ] **Step 3: Implement**

`.env.example` — P4 adds `NOTION_DB_FAQ=`; P3 may add `NOTION_DB_STORY=`. Run `grep -n "NOTION_DB_" .env.example` and add whichever of the two is missing so the block ends:
```
NOTION_DB_QUESTIONS=
NOTION_DB_STORY=
NOTION_DB_FAQ=
```
(each line exactly once).

`docs/DEPLOY.md` — replace
```markdown
Current state at time of writing: the code lives in a local git repo, branch
`build/v1`, with no GitHub remote configured yet. `gh` (the GitHub CLI) is
not installed on this machine, so both a CLI path and a web-UI path are
given for step 1.
```
with
```markdown
Current state (September 2026): the repo is public on GitHub
(`Klaosj/klao-site`). Vercel builds `main` to production and every other
pushed branch to a preview URL; previews sit behind Vercel's login (use a
share link to test one from outside the account). Steps 1–4 are the
original one-time setup, kept for reference.
```
Replace
```markdown
**Every environment variable — including the five Notion ones in step 6
below — is also subject to a separate, platform-level rule:**
```
with
```markdown
**Every environment variable — including the Notion ones in step 6 below —
is also subject to a separate, platform-level rule:**
```
Replace
````markdown
## 6. The five Notion variables — optional, can come later

```
NOTION_TOKEN=
NOTION_DB_PROJECTS=
NOTION_DB_POSTS=
NOTION_DB_CAREER=
NOTION_DB_PROFILE=
```
````
with
````markdown
## 6. The Notion variables — optional, can come later

```
NOTION_TOKEN=
NOTION_DB_PROJECTS=
NOTION_DB_POSTS=
NOTION_DB_CAREER=
NOTION_DB_PROFILE=
NOTION_DB_SKILLS=
NOTION_DB_QUESTIONS=
NOTION_DB_STORY=
NOTION_DB_FAQ=
```
````
Replace
```markdown
When you do add them, under Project → Settings → Environment Variables: set
all five together — see `docs/NOTION_SETUP.md` for why a partial set (e.g.
a token with no matching database ID) silently falls back to sample content
rather than failing loudly — then **redeploy** (step 5 above: adding these
variables to the project does not touch the deployment that's already
live, Notion variables included, even though the code technically reads
`process.env` at request time).
```
with
```markdown
When you do add them, under Project → Settings → Environment Variables: set
the token and the five core database IDs (Projects, Posts, Career, Skills,
Profile) together — see `docs/NOTION_SETUP.md` for why a partial set (e.g.
a token with no matching database ID) silently falls back to sample content
rather than failing loudly — then **redeploy** (step 5 above: adding these
variables to the project does not touch the deployment that's already
live, Notion variables included, even though the code technically reads
`process.env` at request time).

`NOTION_DB_QUESTIONS`, `NOTION_DB_STORY` and `NOTION_DB_FAQ` may follow
later: until they're set, the open question hides itself and By day / FAQ
show the bundled copy. Scope every Notion variable to **Production and
Preview** — a preview built without them runs on the bundled copy, which
hides whether the Notion side works.
```
Replace
```markdown
and check the home page's Work section (`/en/projects` works too since
2026-08-15 — it lists EVERY published project, not just Featured — but the
home section is the stricter check). The home section shows every Featured+Published
```
with
```markdown
and check the home page's Projects index (`#work`; `/en/projects` works too —
it lists EVERY published project, not just Featured — but the home index is
the stricter check). The home index shows every Featured+Published
```

`README.md` — replace
```markdown
Klao's personal brand hub — bilingual (English / Thai), Next.js App Router.
All content (Projects, Writing, Career, Profile) lives in Notion; the site
```
with
```markdown
Klao's personal brand hub — bilingual (English / Thai), Next.js App Router.
All content (Projects, Writing, Career, Profile, By day, FAQ) lives in Notion; the site
```
Replace
```markdown
Open http://localhost:3000 (it redirects to `/en`). Works immediately on the
bundled sample content — no environment variables required.
```
with
```markdown
Open http://localhost:3000 (it redirects to `/en`). It runs on the bundled
sample content — no environment variables required.
```
Replace
```markdown
- **Size:** 16:9, ideally 1600×900 JPEG at quality ~80 (≤ 300 KB). The frame crops from the
  bottom (`object-position: top`), so keep the app's header in shot.
- **Home-page tour:** every featured project that has a screenshot appears in the `#tour`
  band, ordered by `Order`. A project without one keeps its place in the deck with a
  monogram cover and joins the tour the day a screenshot is uploaded — nothing else to change.
```
with
```markdown
- **Size:** capture 2560 px wide without the scrollbar and export a JPEG of ≤ 250 KB (the
  budget for every image on the site). Keep the app's header in shot.
- **Home-page tour:** projects with the `Tour` checkbox ticked play in the hero tour, in
  `TourOrder` order. A project without a screenshot can still sit in the Projects index —
  give it a `Media` drawing (`notion`, `rings`, `five`); see `docs/NOTION_SETUP.md`.
```
Replace
```markdown
as-is; it is not a regression.)

## Local development
```
with
```markdown
as-is; it is not a regression.)

### Browser QA (the White Edition matrix)

    npm run qa:self                  # proves each check catches its fault — no server needed
    npm run build && npm run start   # then, in a second terminal:
    npm run qa                       # 16 combinations against http://localhost:3000
    npm run qa "https://<preview>/?_vercel_share=<token>"   # or any other base URL

`npm run qa` loads the home page at 1440×900 and 390×844, in EN and TH,
light and dark, motion on and reduced (16 combinations), then runs probes
(Auto theme, blocked storage, bad `#work/` links, no JavaScript, a ⌘K that
sends nothing) and the standalone pages. It fails on console errors,
sideways scroll, text under 14 px on phones, tap targets under 24 px,
content left hidden, Thai lines that start with a vowel or tone mark, and
pages longer than 8.6 screens (desktop) or 12 (phone). It prints one line
per combination and writes screenshots and `summary.txt` to `/tmp/klao-qa/`.

Playwright is not a dependency of this repo. The scripts use
`$PLAYWRIGHT_PATH` (a `…/node_modules/playwright/index.mjs`), else a
resolvable `playwright`, else the copy `npx playwright --version` leaves in
`~/.npm/_npx/`, and drive your installed Chrome (`QA_CHANNEL=bundled` uses
Playwright's own Chromium). Vercel previews sit behind Vercel's login — pass
a share link as the base URL.

## Local development
```

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/docs-contract.test.ts && npm run check`
Expected: all docs tests pass; check green.

- [ ] **Step 5: Commit**

```bash
git add tests/docs-contract.test.ts docs/DEPLOY.md README.md .env.example
git commit -F - <<'EOF'
docs: full Notion env list, browser QA instructions, ISR wording

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
```

---

### Task 10: design/white-edition/README.md

**Files:** Create `design/white-edition/README.md` · Modify `tests/docs-contract.test.ts`
**Interfaces:** Consumes: `design/white-edition/prototype/index.html`, `APPLE-SCALE.md` · Produces: a README for the reference folder

- [ ] **Step 1: Extend the failing test** — in `tests/docs-contract.test.ts` change the first import line to
```ts
import { existsSync, readFileSync } from 'node:fs';
```
and append:
```ts
describe('design/white-edition/README.md', () => {
  it('explains both reference files and how to check the site against them', () => {
    const path = 'design/white-edition/README.md';
    expect(existsSync(path)).toBe(true);
    const text = existsSync(path) ? readFileSync(path, 'utf8') : '';
    for (const s of ['prototype/index.html', 'APPLE-SCALE.md', 'npm run qa']) expect(text, s).toContain(s);
    expect(text).not.toMatch(BANNED_WORDS);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/docs-contract.test.ts`
Expected: FAIL — `expected false to be true` (README missing).

- [ ] **Step 3: Implement** — `design/white-edition/README.md`:

```markdown
# White Edition — design reference

Reference material for the White Edition ("Daylight") home page, built in
September 2026. Nothing in this folder is built, served or imported by the
app — `src/` is the product.

| File | What it is | How to use it |
|---|---|---|
| `prototype/index.html` | The static prototype Klao approved on 25 Sep 2026: look, behaviour and first-draft copy. Images are in `prototype/img/`. | Open it straight in a browser (`open design/white-edition/prototype/index.html`). No server, no build. |
| `APPLE-SCALE.md` | Type, spacing, radius and button sizes measured on apple.com on 25 Sep 2026 (1440 and 390 wide), and which of them the site adopted or kept different on purpose. | Check computed styles against it when a size or spacing question comes up. |

## What wins when they disagree

- **Copy:** Notion (live), then `src/content/fixtures/*.json`. The prototype's
  copy was the first draft; once a line is edited in Notion, Notion wins —
  don't set the site back to the prototype.
- **Tokens:** `src/app/globals.css` and `src/lib/theme.ts` (they mirror each
  other). The prototype's `:root` block is where they started.
- **Behaviour:** the spec, `docs/superpowers/specs/2026-09-25-white-edition-design.md`.

## Checking the built site against it

`npm run qa` runs the same 16 combinations the prototype passed — 1440 and
390 wide × EN/TH × light/dark × motion on/reduced — against a running
server, plus probes and the standalone pages. See `scripts/qa-matrix.mjs`
and the "Browser QA" section of the main `README.md`.

## Keep in mind

- The prototype isn't part of the site; don't link to it or deploy it.
- This repository is public: no private working notes, client names or
  internal figures in this folder.
```

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/docs-contract.test.ts && npm run check`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add design/white-edition/README.md tests/docs-contract.test.ts
git commit -F - <<'EOF'
docs(design): explain the White Edition reference files

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
```

---

### Task 11: Content audit (spec §1 criterion 6, spec §12 P5 gate)

**Files:** Modify `docs/NOTION_SETUP.md`
**Interfaces:** Consumes: the finished sections (C7 components) · Produces: a verified "where each piece comes from" table for Klao; open items for any copy that is code-only

- [ ] **Step 1: Write the check** — the expected table (from C5 and spec §7):

| On the page | Edited in | Bundled fallback |
|---|---|---|
| Hero headline and byline | Profile · HeadlineEN/TH, BylineEN/TH | `profile.json` |
| Portrait | Profile · Photo | `profile.json` |
| Tour frames and their captions | Projects · Tour, TourOrder, Screenshot, KickerEN/TH, StatusEN/TH, AltEN/TH | `projects.json` |
| Signature scene (2022 → 2026) | Projects · Tripedia and GoNai rows (QuestionEN/TH, OutcomeEN/TH, StatusEN/TH, LiveURL, LineageOf) | `projects.json` |
| Projects index rows | Projects · Name, Type, QuestionEN/TH, StatusKey, StatusEN/TH, Media, Screenshot, Order | `projects.json` |
| Project sheet | Projects · DescriptionEN/TH, OutcomeEN/TH, Stack, LiveURL, RepoURL, AltEN/TH, LineageOf, Slug | `projects.json` |
| Career rail, pills and panel | Career · Role, RoleTH, Company, StartDate, EndDate, WinsEN/TH, FigureValue, FigureLabelEN/TH, FigureNoteEN/TH | `career.json` |
| Toolbox — Methods | Skills · Name, Tier (`top` rows) | `skills.json` |
| Toolbox — Stack and Languages | code: `TOOLBOX_STACK` in `src/lib/career.ts`, `src/lib/dictionary.ts` | — |
| Résumé meta line ("2 pages · updated …") | code: `resumeMeta` in `src/lib/dictionary.ts` | — |
| By day prologue and closing line | Profile · PrologueEN/TH, ClosingLineEN/TH | `profile.json` |
| By day chapters | Story (every field) | `story.json` |
| FAQ questions, answers, links | FAQ (every field) | `faq.json` |
| Contact: email, Based in, Working in, Résumé | Profile · Email, BasedInEN/TH, WorkingIn, ResumeURL | `profile.json` |
| Contact: the open question | Questions · newest `wondering`/`building` row | `questions.json` |
| Section headlines, eyebrows, nav, buttons, footer legal line | code: `src/lib/dictionary.ts` | — |
| ⌘K Ask Preview answers | code: `src/lib/ask.ts` (with the FAQ) | — |

- [ ] **Step 2: Run it and see where it's wrong**

For each row, open the component that renders it (master plan "File structure") and trace the text to its prop: `grep -n "profile\.\|project\.\|entry\.\|chapter\.\|item\.\|dict\[\|t\." src/components/sections/<Section>.tsx`. Mark every row where the code differs from the "Edited in" column (e.g. the Signature's 30 / 500 coming from `dictionary.ts` rather than Tripedia's Outcome).

- [ ] **Step 3: Implement**

Correct those rows so the table says what the code does, then append it to the end of `docs/NOTION_SETUP.md` under this heading and intro:
```markdown
## Where each piece of the home page comes from

Checked against the code in September 2026. "Bundled fallback" is what the
page shows while a database or property is missing (`src/content/fixtures/`).
Rows marked "code" change only with a commit, not in Notion.
```
Every row whose "Edited in" is `code` and whose copy spec §7 says belongs in Notion (Ask answers, footer legal line) goes into the Handover's open items with the recommended default "keep in code for this release".

- [ ] **Step 4: Run and pass**

Run: `npx vitest run tests/docs-contract.test.ts && npm run check`
Expected: pass (the new section has no banned words).

- [ ] **Step 5: Commit**

```bash
git add docs/NOTION_SETUP.md
git commit -F - <<'EOF'
docs(notion): where each piece of the home page comes from

Content audit for spec §1 criterion 6; code-only copy is listed as such.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
```

---

### Task 12: Final verification on the local production build

**Files:** none (read-only; any fix is its own `fix(…)` commit first)
**Interfaces:** Consumes: everything above · Produces: the numbers for Gate a and the PR body, in `/tmp/klao-qa/summary.txt` and `/tmp/klao-qa/lighthouse-*.json`

- [ ] **Step 1: Write the checks** — the ship bar for P5:
  1. `npm run check` green; `npm run build` green.
  2. `npm run qa` against `npm run start`: 16/16 matrix lines `ok`, desktop `len` ≤ 8.6 and phone `len` ≤ 12 on every line, every probe `ok`, every page `ok`.
  3. Greps all empty: AISecretary/DailyBrief; Space Grotesk/`font-sg`; "instant"/"immediately" in copy and docs; old token names.
  4. Lighthouse mobile on `/en` and `/th`: LCP ≤ 2.5 s, CLS ≤ 0.05, no long task over 200 ms from our code.

- [ ] **Step 2: Run the build and start it**

```bash
npm run check          # tsc 0 errors · eslint 0 errors (1 known config warning) · all tests passed
npm run build          # ✓ compiled; route table lists /[locale] with 1h revalidate
```
Start `npm run start` with `run_in_background: true`; wait for `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/en` → `200`.
Note: `.env.local` has no `NOTION_TOKEN` (checked 25 Sep 2026), so this run is fixture mode; Review Focus 1 on live, pre-migration Notion is covered on the preview in Gate a.

- [ ] **Step 3: Run the matrix and the greps**

```bash
npm run qa:self
npm run qa
grep -rniE "aisecretary|ai secretary|dailybrief|daily brief" src public tests
find public -iname '*aisecretary*' -o -iname '*dailybrief*'
grep -rniE "space.?grotesk|space_grotesk|font-sg" src tests
grep -rniE "\binstant(ly)?\b|\bimmediately\b" src/content src/lib/dictionary.ts src/lib/ask.ts src/lib/palette-index.ts README.md docs/NOTION_SETUP.md docs/DEPLOY.md design/white-edition/README.md
npx vitest run tests/no-legacy-tokens.test.ts tests/no-dead-modules.test.ts tests/home-order.test.tsx tests/docs-contract.test.ts
```
Expected: `self-test ok (22 checks)`; `npm run qa` ends `all green` with exit 0; every grep prints nothing (a guard test that needs the removed names must spell them as a split regex, e.g. `/ai\s?secretary/i`, so these greps stay at zero); the four guard files pass.
Read the length figures from `/tmp/klao-qa/summary.txt` (`grep -E "^(ok|FAIL)  ?(1440|390)-" /tmp/klao-qa/summary.txt`).

- [ ] **Step 4: Lighthouse**

```bash
npx -y lighthouse http://localhost:3000/en --preset=perf --quiet --chrome-flags="--headless" --output=json --output-path=/tmp/klao-qa/lighthouse-en.json
npx -y lighthouse http://localhost:3000/th --preset=perf --quiet --chrome-flags="--headless" --output=json --output-path=/tmp/klao-qa/lighthouse-th.json
for f in en th; do node -e "
const r = require('/tmp/klao-qa/lighthouse-$f.json'); const a = r.audits;
const long = ((a['long-tasks'] || {}).details || {}).items || [];
console.log('$f', 'score', r.categories.performance.score, '| LCP', a['largest-contentful-paint'].displayValue, '| CLS', a['cumulative-layout-shift'].displayValue, '| TBT', a['total-blocking-time'].displayValue, '| long tasks >200ms', long.filter(t => t.duration > 200).length);
"; done
```
Expected: LCP ≤ 2.5 s, CLS ≤ 0.05, 0 long tasks over 200 ms (if one is listed, check its `url` — third-party or browser work doesn't count against "our code").
If `npx lighthouse` can't run (offline, Chrome missing), say so in the report and use the `lcp=` / `cls=` of the `390-en-light-mo` line in `summary.txt`, labelled "local, unthrottled, PerformanceObserver — not Lighthouse". (`performance.getEntriesByType` does not return LCP or layout-shift entries; the QA script reads them through a buffered PerformanceObserver.)
Stop the server.

- [ ] **Step 5: Record, no commit**

Nothing to commit unless a fix was needed (each fix already committed as `fix(<area>): …`, then Steps 2–4 re-run from the top). Keep these for Gate a and the PR body: test count, the 16 `len` values (max desktop, max phone), probe results, Lighthouse LCP/CLS for `/en` and `/th`. Report them to the caller as the end of P5's build work.

---

### Task 12b: Share-card images without the removed projects

Added during plan reconciliation (master R16). `design/og/og-en.html` and `og-th.html` still list AISecretary and DailyBrief under "Selected work", so every shared link would show two projects the site no longer has.

**Files:** Modify `design/og/og-en.html` (lines 61–62), `design/og/og-th.html` (lines 73–74) · Regenerate `public/og/og-en.png`, `public/og/og-th.png` · Test: existing `npm run check` (asserts both PNGs are 1200×630)
**Interfaces:** Consumes: nothing new · Produces: nothing new

- [ ] **Step 1: Write the failing check**

```bash
grep -n -i "aisecretary\|dailybrief" design/og/og-en.html design/og/og-th.html
```

- [ ] **Step 2: Run it and see it fail**

Expected: four matching lines (two per file). The phase's zero-mention grep in Task 12 only covers `src/ public/ tests/`, so this file slipped through.

- [ ] **Step 3: Implement** — replace the two rows in each file with the prototype's other two builds.

`design/og/og-en.html`, replace lines 61–62 with:

```html
      <div class="proj"><div class="pname">Aje</div><div class="pdesc">Idea-grading workspace · Next.js</div></div>
      <div class="proj"><div class="pname">klao-site</div><div class="pdesc">This site · Next.js + Notion</div></div>
```

`design/og/og-th.html`, replace lines 73–74 with:

```html
      <div class="proj"><div class="pname">Aje</div><div class="pdesc">ตัดเกรดไอเดียสตาร์ทอัพ · Next.js</div></div>
      <div class="proj"><div class="pname">klao-site</div><div class="pdesc">เว็บนี้เอง · Next.js + Notion</div></div>
```

Then re-render both PNGs exactly as `design/og/README.md` "Regenerating after an edit" describes (headless Chrome, `--window-size=1200,630`, one file at a time with `sleep 2` between).

- [ ] **Step 4: Run and pass**

```bash
grep -n -i "aisecretary\|dailybrief" design/og/og-en.html design/og/og-th.html   # expected: no output
npm run check                                                                     # expected: green (PNG size tests pass)
```

Open both PNGs and look: GoNai, Aje, klao-site listed; nothing clipped.

- [ ] **Step 5: Commit**

```bash
git add design/og/og-en.html design/og/og-th.html public/og/og-en.png public/og/og-th.png
git commit -m "chore(og): share cards list GoNai, Aje, klao-site

AISecretary and DailyBrief left the site (spec §8); the share-card
artwork still named them.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp"
```

### Task 13: Gate a — push the branch, QA the Vercel preview, Safari/Firefox pass

**Files:** none
**Interfaces:** Consumes: Task 12 numbers · Produces: preview URL, preview QA summary, manual findings

- [ ] **Step 1: STOP — ask Klao.** End the turn with:

> P5 เสร็จแล้ว — `npm run check` ผ่าน (<n> tests), QA 16/16 ok, ยาว desktop <x> / 8.6 · phone <y> / 12, Lighthouse /en LCP <s> CLS <v>.
> ขอ OK 1 ข้อ: **push `feat/white-edition` ขึ้น GitHub** เพื่อให้ Vercel สร้าง preview (repo เป็น public → branch นี้จะเห็นได้สาธารณะ; ไม่แตะ main / production)
> Recommendation: OK

Fill `<…>` from Task 12's output. Continue only on an explicit OK.

- [ ] **Step 2: Push and find the preview URL**

```bash
git push -u origin feat/white-edition
SHA=$(git rev-parse HEAD)
gh api "repos/Klaosj/klao-site/deployments?sha=$SHA" --jq '.[] | {id, environment, created_at}'
```
Wait for the Vercel build with the Monitor tool (until-loop; foreground sleep is blocked):
```bash
until ID=$(gh api "repos/Klaosj/klao-site/deployments?sha=$SHA" --jq '.[0].id') && [ -n "$ID" ] && [ "$(gh api "repos/Klaosj/klao-site/deployments/$ID/statuses" --jq '.[0].state')" = success ]; do sleep 20; done
gh api "repos/Klaosj/klao-site/deployments/$ID/statuses" --jq '.[0].environment_url'
```
Expected: `environment: "Preview"` and a `https://klao-site-…-klaosjs-projects.vercel.app` URL. If the state becomes `failure`/`error`, read the build log in Vercel and fix before going on.

- [ ] **Step 3: Get past Vercel Authentication**

Deployment URLs answer `302 → vercel.com/sso-api` (checked 25 Sep 2026). Get a share link, in this order:
1. Vercel MCP `get_access_to_vercel_url` with the preview URL (on 25 Sep 2026 the MCP returned 403 for the `klaosjs-projects` scope — re-authenticate the Vercel connector first).
2. Otherwise ask Klao: Vercel dashboard → the deployment → **Share** → copy the link.
The link carries `?_vercel_share=…` and lasts about 23 hours.

- [ ] **Step 4: Run the matrix on the preview**

```bash
npm run qa "<share link>"
```
Expected: `all green`. This is **Review Focus 1** when the Preview environment holds the Notion variables: the preview reads the live, not-yet-migrated Notion with `NOTION_DB_STORY`/`NOTION_DB_FAQ` unset, and the `#<id> has no text` check proves no section went empty. Confirm the scope in the Vercel dashboard (Settings → Environment Variables → `NOTION_TOKEN` has Preview ticked); if it doesn't, write in the report that the preview ran on fixtures and Review Focus 1 on live Notion is still open.

- [ ] **Step 5: Manual browser pass** (Klao, or Claude through Chrome for the Chrome rows only)

| # | Where | Check | Review Focus |
|---|---|---|---|
| 1 | Safari macOS, Firefox | `/en` loads white; reload 3× — no dark flash | — |
| 2 | Safari, Firefox | Footer Appearance → Dark → reload: stays dark, no flash; Auto follows System Settings | 2 |
| 3 | Safari with Settings → Privacy → "Block all cookies" | Page loads, theme toggle works for the session, no error | 2 |
| 4 | Safari macOS + iOS | `/th`: no headline line starts with a vowel or tone mark; `|` breaks land where written | 5 |
| 5 | Safari 26 (CSS scroll-driven), Firefox (JS fallback) | Signature scrubs smoothly 2022 → 2026; with Reduce motion on (System Settings → Accessibility → Display) it is a static stack with every caption | — |
| 6 | Safari, Firefox | Tour plays once, ends on klao-site, Pause works; with Reduce motion: ‹ › buttons, no autoplay | — |
| 7 | Safari, Firefox | Open a project → URL `#work/<key>`; Back closes it; paste `#work/unknown` and `#work/GoNai` → nothing opens | 3 |
| 8 | Safari, Firefox | ⌘K / Ctrl-K opens; an unanswerable question shows the Preview decline; Network panel shows no request while asking | — |
| 9 | Safari → Develop → Disable JavaScript | Every section's text is visible; FAQ answers open | 4 |
| 10 | iOS Safari | Thumb bar and menu work; no sideways scroll; text comfortably readable | — |

- [ ] **Step 6: Report and STOP**

Send Klao: the preview link (share link), `summary.txt` result, the manual table with any findings, and the Review Focus 1 status. Klao reviews the preview (spec §12). Fix any finding on the branch (push = new preview, covered by this gate's OK), re-run Steps 4–5 for what changed, and stop again.

---

### Task 14: Gate b — Notion schema migration

**Files:** none in the repo (live Notion CMS)
**Interfaces:** Consumes: `docs/NOTION_SETUP.md` §6 · Produces: migrated Notion, `NOTION_DB_STORY`/`NOTION_DB_FAQ` set, redeployed preview

- [ ] **Step 1: STOP — ask Klao.** End the turn with:

> Gate b — Notion migration (แก้ CMS จริง; ฝั่ง production ตัวเก่าไม่อ่าน property ใหม่ จึงไม่พัง)
> 1) ใครทำ — A: Klao ทำเองตาม `docs/NOTION_SETUP.md` §6 · **B: Claude ทำผ่าน Notion MCP (แนะนำ — ชื่อ property ตรงเป๊ะ)**; ทั้งสองแบบ Klao ต้องกด Connections ให้ Story/FAQ เอง
> 2) env `NOTION_DB_STORY` / `NOTION_DB_FAQ` บน Vercel — **A: Klao ใส่เองใน dashboard (แนะนำ)** · B: Claude ผ่าน Vercel MCP (ต้อง re-auth ก่อน)
> ตอบ "ตาม recommendation" ได้เลย

- [ ] **Step 2: Migrate (if 1B)** — follow `docs/NOTION_SETUP.md` §6 items 1–6 with the Notion MCP: `notion-search` to find each database; `notion-fetch` to read its current schema; `notion-update-data-source` to add properties (names, types and options exactly as in the guide; never rename or delete one); `notion-update-page` to fill the lineup and Career/Profile rows; `notion-create-database` for Story and FAQ in the same parent as the others; `notion-create-pages` for their rows from `story.json` / `faq.json`. After each database, `notion-fetch` it again and compare the property list against the guide's table.

- [ ] **Step 3: Klao shares Story and FAQ** with the `klao-site` integration (`•••` → Connections) and copies both database IDs (32-hex before `?v=`).

- [ ] **Step 4: Env and redeploy** — `NOTION_DB_STORY` and `NOTION_DB_FAQ` for Production, Preview and Development (per decision 2), and in `.env.local`. Redeploy the preview (Vercel → the preview deployment → Redeploy). Wait with the Step 2 until-loop of Task 13 (new deployment id).

- [ ] **Step 5: Prove it and re-run QA**

Add the throwaway FAQ row `TEST — delete me` (Published) → it appears in `#faq` on the redeployed preview (fixtures can't contain it) → delete the row. Then `npm run qa "<share link>"` → `all green` (**Review Focus 1**, post-migration). Report to Klao, plus spec §13 item 3: the draft copy (By day, FAQ, figure labels, statuses, alt text) is now in Notion for his review. STOP.

---

### Task 15: Gate c — merge to main (production deploy)

**Files:** none
**Interfaces:** Consumes: Gates a and b · Produces: production on the White Edition

- [ ] **Step 1: Pre-merge checklist**

- Gate a done and Klao has reviewed the preview.
- Gate b done, or Klao accepts merging first (the page then shows the bundled By day / FAQ until the migration).
- Gate e (résumé) done on this branch, or Klao accepts it as a follow-up.
- Gate d timing decided (recommended: unpublish just before merging).
- `git status --short` empty; branch pushed and green.

- [ ] **Step 2: Draft the PR body** at `/tmp/klao-qa/pr-body.md`, with the numbers copied from Task 12, Gate a and Gate b:

```markdown
## White Edition "Daylight"

Replaces the dark home page with the white, Apple-calibrated page from
docs/superpowers/specs/2026-09-25-white-edition-design.md (approved 25 Sep 2026).

### Verified
- `npm run check`: <tests passed>
- `npm run qa` (local production build): 16/16 ok · desktop length <max> / 8.6 · phone <max> / 12
- Probes: Auto theme, blocked storage, bad #work/ links, no JS, ⌘K sends nothing — ok
- Lighthouse mobile: /en LCP <s> · CLS <v>; /th LCP <s> · CLS <v>
- Preview QA: all green · Safari (macOS, iOS) and Firefox: <findings or "no findings">
- Notion migration: <done / pending — page shows bundled By day and FAQ until then>

### Ship steps
- AISecretary and DailyBrief rows unpublished: <before merge / after>
- Résumé PDF: <on this branch / follow-up>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
```

- [ ] **Step 3: STOP — ask Klao.** End the turn with:

> Gate c — merge `feat/white-edition` → main = **production deploy**
> 1) เปิด PR — **A: Claude รัน `gh pr create --base main --head feat/white-edition --title "White Edition \"Daylight\"" --body-file /tmp/klao-qa/pr-body.md` (แนะนำ)** · B: Klao เปิดเอง
> 2) Merge — Klao กดเองเสมอ (Claude ไม่ merge)

- [ ] **Step 4: After Klao merges — verify production**

```bash
MERGE=$(git ls-remote origin refs/heads/main | cut -f1)
```
Wait with the Monitor until-loop from Task 13 Step 2 (using `$MERGE`) until the Production deployment is `success`, then:
```bash
npm run qa https://klao-site.vercel.app
curl -s https://klao-site.vercel.app/sitemap.xml | head -5
curl -s https://klao-site.vercel.app/robots.txt
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://klao-site.vercel.app/en/career
```
Expected: `all green`; sitemap/robots on the production domain; `/en/career` → `/en#career`.
If production breaks: Vercel dashboard → Deployments → the previous production deployment → **Promote to Production**, tell Klao, then fix on a branch.

---

### Task 16: Gate d — unpublish AISecretary and DailyBrief, verify after ISR

**Files:** none (live Notion)
**Interfaces:** Consumes: spec §8 · Produces: spec §1 criterion 5 met on the live site

- [ ] **Step 1: STOP — ask Klao** (ask this before Gate c's merge, so the timing can be A):

> Gate d — Untick Published ของ AISecretary + DailyBrief ใน Notion
> 1) เมื่อไร — **A: ก่อน merge ทันที (แนะนำ — build แรกของเวอร์ชันใหม่อ่าน Notion ตอน build จะไม่แสดงสองตัวนี้เลย; เว็บเก่าหายสองตัวจาก tour ไม่เกิน ~1 ชม.)** · B: หลัง deploy (อาจโผล่บน /projects ของเว็บใหม่ได้สูงสุด ~1 ชม.)
> 2) ใครกด — **A: Klao (แนะนำ)** · B: Claude ผ่าน Notion MCP `notion-update-page`

- [ ] **Step 2: Unpublish** per the answers.

- [ ] **Step 3: Wait for ISR and verify** (Monitor until-loop; polling also triggers the revalidation):

```bash
until ! curl -s https://klao-site.vercel.app/en https://klao-site.vercel.app/th https://klao-site.vercel.app/en/projects https://klao-site.vercel.app/sitemap.xml | grep -qiE "aisecretary|dailybrief"; do sleep 600; done; echo gone
```
Expected: `gone` within about an hour of the untick (if the merge build ran after the untick, on the first check). Report to Klao with the time it took.

---

### Task 17: Gate e — rebuild the résumé PDF so THB 1.1M reads "personal monthly target"

**Files:** Replace `public/suwichak-jarunopratamp-resume.pdf` (the `.docx` stays outside the repo)
**Interfaces:** Consumes: spec §3 decision (25 Sep: rebuild from the current docx at ship time) · Produces: the published PDF

Do this on `feat/white-edition` before Gate c if possible (one deploy). After the merge, use a short branch `chore/resume-pdf` that Klao merges.

- [ ] **Step 1: STOP — confirm the source and the sentence.** On 25 Sep 2026 the path in the brief, `~/Downloads/Suwichak Jarunopratamp - Resume 2026.docx`, does not exist. The matching file is `~/Downloads/Suwichak Jarunopratamp - Resume 2026 (ATS).docx` (17 Aug), whose line reads "Met the store's THB 1.1M monthly sales target as the normal standard, while keeping the whole team's numbers steady." — the published PDF says the same. End the turn with:

> Gate e — Résumé PDF
> 1) ไฟล์ต้นฉบับ — **A: `Suwichak Jarunopratamp - Resume 2026 (ATS).docx` (แนะนำ — ไฟล์เดียวที่ชื่อตรง)** · B: ไฟล์อื่น (บอก path)
> 2) ประโยคใหม่ — **A: "Met my personal THB 1.1M monthly sales target as the normal standard, while keeping the whole team's numbers steady." (แนะนำ — ตรงกับเว็บ "My personal monthly sales target")** · B: Klao เขียนเอง
> 3) ใครแก้/export — **A: Klao แก้ใน Word แล้ว Save As PDF (แนะนำ — 1 นาที, format ไม่เพี้ยน)** · B: Claude แก้สำเนาใน scratchpad แล้ว Klao export

- [ ] **Step 2: Edit** (3A: Klao edits the sentence in Word; skip to Step 3). For 3B, work on a copy only:

```bash
SRC="$HOME/Downloads/Suwichak Jarunopratamp - Resume 2026 (ATS).docx"
COPY="/tmp/klao-qa/resume-edit.docx"
cp "$SRC" "$COPY"
unzip -p "$COPY" word/document.xml | grep -o "Met the store’s THB 1.1M monthly sales target" | wc -l   # must print 1 (sentence sits in one run)
python3 - "$COPY" <<'PY'
import os, sys, zipfile
src = sys.argv[1]
tmp = src + '.tmp'
old = 'Met the store’s THB 1.1M monthly sales target'
new = 'Met my personal THB 1.1M monthly sales target'
with zipfile.ZipFile(src) as zin, zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as zout:
    for item in zin.infolist():
        data = zin.read(item.filename)
        if item.filename == 'word/document.xml':
            text = data.decode('utf-8')
            assert text.count(old) == 1, f'expected the phrase once in one run, found {text.count(old)}'
            data = text.replace(old, new).encode('utf-8')
        zout.writestr(item, data)
os.replace(tmp, src)
PY
```
If the count is not 1 (the phrase is split across runs), stop and fall back to 3A. Klao opens the copy in Word to export.

- [ ] **Step 3: Export** — Word → File → Save As… → File Format **PDF** ("Best for electronic distribution and accessibility") → save as `/tmp/klao-qa/resume-new.pdf`.

- [ ] **Step 4: Verify and show the diff — STOP**

```bash
NEW=/tmp/klao-qa/resume-new.pdf
pdftotext "$NEW" - | grep -n "1.1M"            # the line now says "my personal"
pdfinfo "$NEW" | grep Pages                     # same page count as today's PDF
pdfinfo public/suwichak-jarunopratamp-resume.pdf | grep Pages
ls -l "$NEW"                                    # today's PDF is ~125 KB; flag anything over 300 KB
diff <(pdftotext public/suwichak-jarunopratamp-resume.pdf -) <(pdftotext "$NEW" -)
```
The docx (17 Aug) may differ from the published PDF (16 Aug) in more than this one sentence, and everything in `public/` is public. Send Klao the full diff output and wait for an explicit OK (the phone number staying public is already decided, 24 Sep).

- [ ] **Step 5: Replace, update the résumé meta line, commit**

P3 added `resumeMeta` to `src/lib/dictionary.ts` (`'2 pages · updated Aug 2026'` / `'2 หน้า · อัปเดต ส.ค. 2026'`); it goes stale with this rebuild. Set both to the new PDF's page count and the rebuild month (e.g. `'2 pages · updated Sep 2026'` / `'2 หน้า · อัปเดต ก.ย. 2026'`; Thai months as in the prototype's `MON` list), then `npm run check`.

```bash
cp /tmp/klao-qa/resume-new.pdf public/suwichak-jarunopratamp-resume.pdf
grep -n "resumeMeta" src/lib/dictionary.ts        # both lines now show the new month
git add public/suwichak-jarunopratamp-resume.pdf src/lib/dictionary.ts
git commit -F - <<'EOF'
content(resume): 1.1M reads as my personal monthly target

Rebuilt from the current résumé so it matches the site's Career figure;
the résumé meta line carries the new date.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DunfARiJ7kn4wfov81H1gp
EOF
```
Push is covered by Gate a's OK when this is on `feat/white-edition` before the merge; on `chore/resume-pdf` after the merge, ask before pushing. After it is live: `curl -so /tmp/klao-qa/resume-live.pdf https://klao-site.vercel.app/suwichak-jarunopratamp-resume.pdf && pdftotext /tmp/klao-qa/resume-live.pdf - | grep -n "1.1M"` → "my personal".

---

## Contract gaps

1. **C4 has no runtime list of `SketchName`/`IconName`.** The Story `Sketch` select options in NOTION_SETUP come from `story.json` (Task 8 step 3.13), and `tests/docs-contract.test.ts` checks they match.
2. **C5 names the properties but not their Notion types.** StartDate/EndDate (Date or Text), TitleEN/QuestionEN (Title), LineageOf (Relation) are the plan's reading; Task 8 step 3.7 checks the date type against the mapper.
3. **Spec §7 puts Ask answers and the footer legal line in Notion; C5 has no fields for them.** Task 11 records them as code-only; recommended default for this release: keep them in code.
4. **Where and how P0 labelled the repoint block isn't in C1.** Task 7 finds it by the guard's output, not by name.
5. **C9 doesn't say whether `.btn` sets `display`.** The 404 button keeps `inline-flex items-center`.
6. **QA probes rely on selectors the contracts don't fix:** sheet = `dialog[open]` (spec says `<dialog>`), rows as `a[href*="#work/"]`, a theme control named "Dark", ⌘K opened by `klao:palette` (C8). Probes degrade to a noted skip, not a failure, when a selector is absent — except "a valid hash opens its sheet".
7. **`/career` redirects (C7).** The standalone Career page is reachable only through tests; the pages pass checks the redirect instead.
8. **Script split.** The master's file table lists `scripts/qa-matrix.mjs` only; P5 adds `qa-lib.mjs` and `qa-selftest.mjs` so the checks can be proven on their own.

## Handover

Open items from spec §13 (verbatim):

1. Recaptures: Aje and GoNai at 2560 px wide without the scrollbar; GoNai at 390 px for phone; a white-edition klao-site shot after P1 (a Notion-row vignette stands in until then).
2. FAQ "What work is he open to?" — hidden until he writes the answer.
3. Draft copy review in Notion after P5 (By day, FAQ, figure labels, statuses, alt text).
4. Approvals at their gates: Notion schema change (P5), branch push for preview (P6), merge, Notion unpublish, résumé PDF.

Added by P5:

5. Any code-only copy found in Task 11 that spec §7 wanted in Notion (Ask answers, footer legal line) — default: keep in code this release.
6. Review Focus 1 on live Notion depends on the Preview environment holding the Notion variables (Gate a Step 4); if it doesn't, add them to Preview.
7. The Vercel MCP connector needs re-authentication for the `klaosjs-projects` scope before Claude can create share links or set env vars (403 on 25 Sep 2026).
8. Lighthouse numbers and the 16 page lengths from Task 12 go into the PR body (Gate c) as the record.
9. Toolbox grouping is defined in code, not by the Skills `Category` (P3 plan, open item 1) — Klao to confirm; a `Toolbox` select on Skills could move it into Notion later.
10. `Profile.nameNative` has no reader since the hero wordmark went (P1 hand-off). Left in the model and mapper on purpose (harmless, and removing it touches the mapper, fixtures and tests); drop it in a later cleanup if wanted.
