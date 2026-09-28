// White Edition QA — shared pieces (spec §1 criterion 4, §11; master plan P5).
//
// Playwright is deliberately NOT a project dependency (Global Constraints: no
// new dependencies); loadChromium() finds a copy outside the repo instead.
//
// pageInit, readPerf, scrollThrough, themeState, collect, contrastIssues and
// overflowBleed run INSIDE the page. Playwright serialises each function's
// source, so they must not reach for anything else in this module — every
// input arrives as an argument, and helpers are declared inside the function
// that uses them. That is also why overflowBleed's algorithm is copied
// verbatim inside collect() and scrollThrough() rather than called from
// them: a page.evaluate(fn) only ships fn's own source text, never anything
// else this module defines.
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
/**
 * Spec §1 criterion 3, in viewport heights, keyed by viewport width. Only
 * 1440 and 390 carry a budget: R15 exempts a Thai or reduced-motion overage
 * from failing the run, and PR2's two narrow widths (360, 320) have no
 * entry here on purpose — their length is only printed, never enforced.
 */
export const LEN_BUDGET = { 1440: 8.6, 390: 12 };
/** Spec §5.1 canvas, exactly as getComputedStyle reports it. */
export const CANVAS = { light: 'rgb(255, 255, 255)', dark: 'rgb(10, 11, 13)' };
/** Spec §9. CLS is enforced; LCP is only reported — a local, unthrottled run is not Lighthouse. */
export const CLS_BUDGET = 0.05;
/**
 * PR2 — viewport height for every matrix width: the original pair
 * (1440×900, 390×844) plus the two narrow QA lines (360×780, 320×568).
 */
export const VIEWPORT_HEIGHT = { 1440: 900, 390: 844, 360: 780, 320: 568 };

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

/**
 * Horizontal bleed past the viewport's right edge (R28; Lane B review I1).
 * Combines two measurements because each misses a real case the other
 * catches:
 *   - document scrollWidth/clientWidth: sees a bare nowrap text run or a
 *     `::after` bleed (neither is an Element, so a per-element walk can't
 *     find them) and a `position: absolute` element that escapes a
 *     *static* ancestor's overflow-x clip (a well-known CSS escape — the
 *     absolute box paints past that ancestor's clip, and scrollWidth
 *     correctly follows the paint).
 *   - a per-element walk: sees a `position: fixed` bleed, which
 *     scrollWidth structurally cannot — fixed boxes are excluded from the
 *     document's scrollable-overflow region in every engine, so something
 *     cut off at the viewport edge (real, visible, but not "scrollable")
 *     never moves scrollWidth at all.
 * An ancestor's overflow-x only clips an element if that ancestor is
 * actually in its containing-block chain: a `position: absolute` element
 * escapes every *static* ancestor up to its first positioned one; a
 * `position: fixed` element escapes everything up to the first ancestor
 * with a transform, filter or `contain` (the CSS containing-block escape
 * hatches) — or the viewport, if none exists. Getting this wrong either
 * way was the actual defect: treating a static ancestor's clip as if it
 * applied to an absolutely-positioned descendant wrongly exempted a real
 * bleed.
 */
export function overflowBleed() {
  const de = document.documentElement;
  const clientWidth = de.clientWidth;
  const scrollBleed = Math.max(0, de.scrollWidth - clientWidth);

  const clipsX = (n) => /^(hidden|clip|scroll|auto)$/.test(getComputedStyle(n).overflowX);
  const makesContainingBlock = (n) => {
    const cs = getComputedStyle(n);
    return (cs.transform && cs.transform !== 'none') || (cs.filter && cs.filter !== 'none') || (cs.contain && cs.contain !== 'none');
  };
  const clippedByAncestor = (el, position) => {
    let n = el.parentElement;
    if (position === 'absolute') {
      while (n && getComputedStyle(n).position === 'static') n = n.parentElement;
    } else if (position === 'fixed') {
      while (n && !makesContainingBlock(n)) n = n.parentElement;
    }
    for (; n; n = n.parentElement) if (clipsX(n)) return true;
    return false;
  };
  const describe = (el) => {
    const cls =
      typeof el.className === 'string'
        ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((c) => '.' + c).join('')
        : '';
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30);
    return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${cls}${text ? ` "${text}"` : ''}`;
  };

  let elementBleed = 0;
  const found = [];
  for (const el of document.querySelectorAll('*')) {
    if (!el.getClientRects().length) continue;
    const position = getComputedStyle(el).position;
    if (clippedByAncestor(el, position)) continue;
    const bleed = el.getBoundingClientRect().right - clientWidth;
    if (bleed > 0) {
      found.push([bleed, el]);
      if (bleed > elementBleed) elementBleed = bleed;
    }
  }
  found.sort((a, b) => b[0] - a[0]);
  const bleeders = found.slice(0, 5).map(([b, el]) => `${describe(el)} +${Math.round(b)}px`);
  return { overflow: Math.round(Math.max(scrollBleed, elementBleed)), bleeders };
}

/**
 * Scrolls the whole page so reveals fire and lazy images load; returns the
 * worst overflowBleed() reading seen at any scroll position. Duplicates
 * overflowBleed()'s algorithm (see the file header) rather than a simplified
 * version of it: a bug that only showed up mid-scroll must be as catchable
 * here as it is in collect()'s snapshot at rest.
 */
export async function scrollThrough() {
  const de = document.documentElement;
  const step = Math.round(window.innerHeight * 0.6);
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const clipsX = (n) => /^(hidden|clip|scroll|auto)$/.test(getComputedStyle(n).overflowX);
  const makesContainingBlock = (n) => {
    const cs = getComputedStyle(n);
    return (cs.transform && cs.transform !== 'none') || (cs.filter && cs.filter !== 'none') || (cs.contain && cs.contain !== 'none');
  };
  const clippedByAncestor = (el, position) => {
    let n = el.parentElement;
    if (position === 'absolute') {
      while (n && getComputedStyle(n).position === 'static') n = n.parentElement;
    } else if (position === 'fixed') {
      while (n && !makesContainingBlock(n)) n = n.parentElement;
    }
    for (; n; n = n.parentElement) if (clipsX(n)) return true;
    return false;
  };
  const bleedNow = () => {
    const clientWidth = de.clientWidth;
    const scrollBleed = Math.max(0, de.scrollWidth - clientWidth);
    let elementBleed = 0;
    for (const el of document.querySelectorAll('*')) {
      if (!el.getClientRects().length) continue;
      const position = getComputedStyle(el).position;
      if (clippedByAncestor(el, position)) continue;
      const bleed = el.getBoundingClientRect().right - clientWidth;
      if (bleed > elementBleed) elementBleed = bleed;
    }
    return Math.max(scrollBleed, elementBleed);
  };
  let worst = 0;
  for (let y = 0; y <= de.scrollHeight; y += step) {
    window.scrollTo({ top: y, behavior: 'instant' });
    await wait(120);
    worst = Math.max(worst, bleedNow());
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
  await wait(200);
  return Math.round(worst);
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

  // Horizontal overflow (R28; review I1) — see overflowBleed()'s doc
  // comment for why this combines scrollWidth with a containing-block-aware
  // per-element walk. Duplicated here rather than called, per the file
  // header: page.evaluate(collect) only ships collect's own source.
  const clientWidth = de.clientWidth;
  const scrollBleed = Math.max(0, de.scrollWidth - clientWidth);
  const clipsX = (n) => /^(hidden|clip|scroll|auto)$/.test(getComputedStyle(n).overflowX);
  const makesContainingBlock = (n) => {
    const cs = getComputedStyle(n);
    return (cs.transform && cs.transform !== 'none') || (cs.filter && cs.filter !== 'none') || (cs.contain && cs.contain !== 'none');
  };
  const clippedByAncestor = (el, position) => {
    let n = el.parentElement;
    if (position === 'absolute') {
      while (n && getComputedStyle(n).position === 'static') n = n.parentElement;
    } else if (position === 'fixed') {
      while (n && !makesContainingBlock(n)) n = n.parentElement;
    }
    for (; n; n = n.parentElement) if (clipsX(n)) return true;
    return false;
  };
  let elementBleed = 0;
  const bleeders = [];
  for (const el of document.querySelectorAll('*')) {
    if (!el.getClientRects().length) continue;
    const position = getComputedStyle(el).position;
    if (clippedByAncestor(el, position)) continue;
    const bleed = el.getBoundingClientRect().right - clientWidth;
    if (bleed > 0) {
      bleeders.push([bleed, el]);
      if (bleed > elementBleed) elementBleed = bleed;
    }
  }
  bleeders.sort((a, b) => b[0] - a[0]);

  const out = {
    len: Number((de.scrollHeight / vh).toFixed(2)),
    overflow: Math.round(Math.max(scrollBleed, elementBleed)),
    bleeders: bleeders.slice(0, 5).map(([b, el]) => `${describe(el)} +${Math.round(b)}px`),
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
