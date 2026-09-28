import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// globals.css is the one token layer every phase builds on (master plan C1,
// C9). jsdom never computes styles, so these tests read the stylesheet as
// text and pin the parts other code relies on by name. They are deliberately
// about names and wiring, not pixel values -- tests/theme.test.ts owns the
// colour values.
const CSS = readFileSync('src/app/globals.css', 'utf8');
const NAV_CSS = readFileSync('src/components/site-nav.css', 'utf8');
// Comments may name what was removed; only live rules count.
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const CODE = stripComments(CSS);

/** Declarations of every `@theme ... { }` block, as name -> value. */
function themeDecls(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const block of CODE.matchAll(/@theme[^{]*\{([^}]*)\}/g)) {
    for (const m of block[1].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  }
  return out;
}

describe('Tailwind mapping (C1)', () => {
  const theme = themeDecls();

  it.each([
    ['color-canvas', 'var(--canvas)'],
    ['color-mist', 'var(--mist)'],
    ['color-card', 'var(--card)'],
    ['color-ink-1', 'var(--ink-1)'],
    ['color-ink-2', 'var(--ink-2)'],
    ['color-ink-3', 'var(--ink-3)'],
    ['color-kram', 'var(--kram)'],
    ['color-kram-hover', 'var(--kram-hover)'],
    ['color-on-kram', 'var(--on-kram)'],
    ['color-link', 'var(--link)'],
    ['color-focus', 'var(--focus)'],
    ['color-line', 'var(--line)'],
    ['color-wash-aje', 'var(--w-aje)'],
    ['color-wash-gonai', 'var(--w-gonai)'],
    ['color-wash-site', 'var(--w-site)'],
    ['color-gonai', 'var(--gonai)'],
  ])('--%s reads %s', (name, value) => {
    expect(theme[name]).toBe(value);
  });

  it('deletes the legacy colour repoint entirely (P5 Task 7) -- none of these 15 names is declared any more', () => {
    const legacyNames = [
      'color-dark', 'color-deep', 'color-light', 'color-peri', 'color-peri-deep',
      'color-on-dark', 'color-on-dark-soft', 'color-on-dark-faint', 'color-on-dark-mid',
      'color-on-light', 'color-on-light-soft', 'color-on-light-faint',
      'color-paper', 'color-ink', 'color-soft',
    ];
    for (const name of legacyNames) expect(theme[name], `--${name}`).toBeUndefined();
  });

  it('holds no literal colour in any Tailwind colour token -- every one follows the theme', () => {
    for (const [name, value] of Object.entries(theme)) {
      if (!name.startsWith('color-')) continue;
      expect(value, `--${name}`).toMatch(/^var\(--[\w-]+\)$/);
    }
  });

  it('keeps the colour tokens on :root even before a utility uses them (hand-written CSS reads them)', () => {
    for (const block of CODE.matchAll(/@theme([^{]*)\{/g)) {
      expect(block[1]).toContain('inline');
      expect(block[1]).toContain('static');
    }
  });
});

describe('fonts', () => {
  const theme = themeDecls();

  it('drops Space Grotesk entirely', () => {
    expect(CODE).not.toMatch(/font-sg|Space Grotesk|Space_Grotesk/);
  });

  it('puts Anuphan Thai first and the system stack behind it for Latin', () => {
    expect(theme['font-sans']).toMatch(/^"Anuphan Thai", -apple-system, BlinkMacSystemFont/);
    expect(theme['font-sans']).toMatch(/sans-serif$/);
  });

  it('declares the Thai face for the Thai block only, so Latin never renders in Anuphan', () => {
    const face = /@font-face \{([^}]*)\}/.exec(CODE)?.[1] ?? '';
    expect(face).toContain('font-family: "Anuphan Thai";');
    expect(face).toContain('font-weight: 400 700;');
    expect(face).toContain('font-display: swap;');
    expect(face).toContain('src: url("/fonts/anuphan-thai.woff2") format("woff2");');
    expect(face).toContain('unicode-range: U+02D7, U+0303, U+0331, U+0E01-0E5B, U+200C-200D, U+25CC;');
    // The subset file also holds a Latin "A", space and nbsp: without this
    // range every capital A on /en would render in Anuphan.
    expect(face).not.toMatch(/U\+0000|U\+0041|U\+0020/);
  });

  it('points the legacy display/thai font utilities at the same stack', () => {
    expect(theme['font-display']).toBe('var(--font-sans)');
    expect(theme['font-thai']).toBe('var(--font-sans)');
  });

  it('sets body copy to 17/25 with Thai at 1.65 and zero tracking', () => {
    expect(CSS).toMatch(/body \{[^}]*font-family: var\(--font-sans\);[^}]*font-size: 17px;[^}]*line-height: 25px;/);
    expect(CSS).toMatch(/body:lang\(th\) \{[^}]*line-height: 1\.65;[^}]*letter-spacing: 0;/);
  });
});

describe('no dark-era surface survives', () => {
  it('has no film grain, ambient glow or nav-on-light inversion left', () => {
    expect(CODE).not.toMatch(/feTurbulence|radial-gradient|nav-on-light|#17171a|#101013/i);
    expect(stripComments(NAV_CSS)).not.toMatch(/rgba\(23, 23, 26|nav-on-light/);
  });

  it('removes the hero annotation pills entirely, leaving the shared .pill chip as the only name', () => {
    expect(CODE).not.toMatch(/hero-pill/);
    expect(CODE).not.toMatch(/(^|[\s,}])\.pill-\d/m);
  });
});

// ---------------------------------------------------------------------------
// Shared classes (C9). P1-P4 are written against these names in parallel;
// renaming one here breaks every section that uses it, so each name is pinned.
// ---------------------------------------------------------------------------
/** Splits a selector list on top-level commas (not the ones inside :not()). */
function splitSelectors(list: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of list) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/** Every declaration block whose selector list contains `selector` exactly. */
function rulesFor(selector: string, code: string = CODE): string[] {
  const out: string[] = [];
  for (const m of code.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (splitSelectors(m[1]).includes(selector)) out.push(m[2]);
  }
  return out;
}

/** The balanced `{ ... }` block that opens at the first `{` after `from`. */
function blockFrom(css: string, from: number): string {
  const open = css.indexOf('{', from);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}' && --depth === 0) return css.slice(from, i + 1);
  }
  throw new Error('unbalanced braces in globals.css');
}

describe('shared classes (C9)', () => {
  it.each([
    '.t-hero', '.t-h2', '.t-title', '.t-panel', '.t-faq', '.t-eyebrow', '.t-lead',
    '.t-body', '.t-cap', '.t-legal', '.t-stat',
    '.wrap', '.wrap-wide', '.section', '.band',
    '.btn', '.btn-fill', '.btn-out', '.pill', '.glass', '.tile', '.win', '.nw', '.kt',
  ])('defines %s', (selector) => {
    expect(rulesFor(selector).length, `${selector} has no rule`).toBeGreaterThan(0);
  });

  it('gives every display class a Thai variant with zero letter-spacing', () => {
    for (const cls of ['.t-hero', '.t-h2', '.t-title', '.t-panel', '.t-faq', '.t-eyebrow', '.t-lead', '.t-body', '.t-cap', '.t-legal']) {
      const thai = rulesFor(`${cls}:lang(th)`).join(' ');
      expect(thai, `${cls}:lang(th)`).toMatch(/letter-spacing: 0;/);
    }
  });

  it('sets Thai one size step below English for the headline classes', () => {
    const px = (decls: string) => Number(/font-size: (\d+)px/.exec(decls)?.[1]);
    expect(px(rulesFor('.t-h2:lang(th)')[0])).toBeLessThan(px(rulesFor('.t-h2')[0]));
    expect(px(rulesFor('.t-title:lang(th)')[0])).toBeLessThan(px(rulesFor('.t-title')[0]));
    expect(px(rulesFor('.t-faq:lang(th)')[0])).toBeLessThan(px(rulesFor('.t-faq')[0]));
    expect(rulesFor('.t-hero:lang(th)')[0]).toContain('clamp(34px, 3.9vw, 56px)');
  });

  it('uses the Apple CTA: 44 px pill at weight 400', () => {
    const btn = rulesFor('.btn')[0];
    expect(btn).toContain('min-height: 44px;');
    expect(btn).toContain('font-weight: 400;');
    expect(btn).toContain('border-radius: 999px;');
    expect(rulesFor('.btn-fill')[0]).toContain('background: var(--kram);');
  });

  it('keeps tiles flat (r28, mist, no shadow) and gives screenshot windows the e2 shadow', () => {
    expect(rulesFor('.tile')[0]).toMatch(/border-radius: 28px;[\s\S]*box-shadow: none;/);
    expect(rulesFor('.win')[0]).toContain('box-shadow: var(--e2);');
  });

  it('makes .nw an unbreakable inline-block (C3 keep-span)', () => {
    const nw = rulesFor('.nw')[0];
    expect(nw).toContain('display: inline-block;');
    expect(nw).toContain('white-space: nowrap;');
  });

  // Fix round 1, finding 1: display mode's whole-token keep-span must wrap
  // (unlike .nw's hard nowrap), matching the prototype's own .kt rule.
  it('makes .kt a wrappable inline-block, not nowrap (R25 display keep-span)', () => {
    const kt = rulesFor('.kt')[0];
    expect(kt).toContain('display: inline-block;');
    expect(kt).toContain('max-width: 100%;');
    expect(kt).not.toContain('white-space: nowrap;');
  });

  // Re-review N1: .nw/.kt are inline-block, so a link's hover underline (text-decoration) does
  // not reach inside one on its own -- on /th the By-day door's underline broke under "ดีล" and
  // "เครือข่าย". Low specificity (a + :is()'s class = 0,1,1) so a more specific override, e.g.
  // hero-tour-stage.css's `a.ht-q:hover .ht-qt :is(.nw, .kt)` (0,4,1), still wins where it exists.
  it('lets a link\'s text-decoration reach inside its own keep-runs (fix wave N1)', () => {
    const rule = rulesFor('a :is(.nw, .kt)')[0];
    expect(rule).toContain('text-decoration: inherit;');
  });

  // D1 (preflight): block-scoped, so a rule cannot satisfy this by sitting
  // anywhere later in the file -- it must be the .glass rule inside the
  // named at-rule's own balanced block.
  it('turns glass solid for reduced transparency, higher contrast and no backdrop-filter support', () => {
    for (const opener of [
      '@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))',
      '@media (prefers-reduced-transparency: reduce)',
    ]) {
      const at = CODE.indexOf(opener);
      expect(at, opener).toBeGreaterThan(-1);
      expect(blockFrom(CODE, at)).toMatch(/\.glass[^{]*\{[^}]*background: var\(--canvas\)/);
    }
    const contrast = [...CODE.matchAll(/@media \(prefers-contrast: more\)/g)]
      .map((m) => blockFrom(CODE, m.index!))
      .find((b) => b.includes('.glass'));
    expect(contrast).toMatch(/background: var\(--canvas\)/);
  });

  // Review Focus #4: before hydration, or with scripts off, nothing may be
  // hidden. The only rule that dims .rv must sit behind BOTH gates.
  it('dims .rv only under html.js and prefers-reduced-motion: no-preference, and never below .55', () => {
    const at = CODE.indexOf('@media (prefers-reduced-motion: no-preference)');
    expect(at, 'no-preference media block').toBeGreaterThan(-1);
    const gated = blockFrom(CODE, at);
    expect(gated).toMatch(/html\.js \.rv \{[^}]*opacity: \.55;/);
    expect(gated).toMatch(/html\.js \.rv\.in \{ opacity: 1; transform: none; \}/);
    // Outside that block no rule may touch a .rv element's opacity.
    const rest = CODE.replace(gated, '');
    for (const m of rest.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (/\.rv\b(?!-)/.test(m[1])) expect(m[2], m[1].trim()).not.toContain('opacity');
    }
  });

  it('keeps the phone breakpoint at 734 px and phone legal text at 14 px', () => {
    expect(CODE).toMatch(/@media \(max-width: 734px\)[\s\S]*?\.t-hero \{ font-size: 40px; line-height: 44px; \}/);
    expect(CODE).toMatch(/\.t-legal:lang\(th\) \{ font-size: 14px; line-height: 21px; \}/);
  });
});

// Amendment A01 (docs/superpowers/plans/2026-09-26-white-edition-polish.md):
// ThemeToggle's segmented control moved from a background swap per pressed
// button to ONE sliding thumb, positioned by --i. The row wins over the
// task brief's original .seg (background/aria-pressed) test, which this
// replaces rather than keeps alongside.
describe('segmented control (.seg) with a sliding thumb (A01)', () => {
  it('positions one thumb by --i, animating transform only', () => {
    expect(rulesFor('.seg').length).toBeGreaterThan(0);
    const thumb = rulesFor('.seg .thumb')[0];
    expect(thumb).toContain('transform: translateX(calc(var(--i, 0) * 100%));');
    expect(thumb).toContain('transition: transform 320ms var(--ease-settle);');
    // Nothing else on the thumb rule may animate a non-transform property.
    expect(thumb).not.toMatch(/transition:[^;]*\b(background|color|opacity|width)\b/);
  });

  // Fix wave finding 5: generalised from `.seg button` so P1's LocaleToggle
  // (real `<a>` links, A02) can reuse this same block; "selected" covers a
  // radio's aria-checked and a current-page link's aria-current alike.
  it('styles any child button or link, not only <button>', () => {
    expect(rulesFor('.seg > :is(button, a)').length).toBeGreaterThan(0);
  });

  it('marks the checked segment by colour/weight, not by moving it, for either aria-checked or aria-current', () => {
    for (const selector of [
      '.seg > :is(button, a)[aria-checked="true"]',
      '.seg > :is(button, a)[aria-current="page"]',
    ]) {
      const checkedRule = rulesFor(selector)[0];
      expect(checkedRule, selector).toContain('color: var(--ink-1);');
      expect(checkedRule, selector).toContain('font-weight: 600;');
    }
  });

  // Fix wave finding 6: a hidden, always-600 duplicate of the label
  // reserves its bold width, so the visible label's own weight can change
  // (on select) without resizing the button, the thumb's %, or the
  // control's centring.
  // Wave-1 reconciliation (k): one rule for every `.seg-label`, so the nav
  // capsule's links (not a .seg) reuse it instead of a second copy.
  it('reserves the checked label\u2019s bold width with a hidden ::after duplicate', () => {
    expect(rulesFor('.seg-label')[0]).toContain('display: inline-block;');
    // An inline-block's baseline is its LAST line box -- here the hidden
    // duplicate's, one line down -- so in an inline context (the nav's links)
    // the label rose and the link grew 28 -> 37 px. Top-aligned, it keeps the
    // line box it had as bare text.
    expect(rulesFor('.seg-label')[0]).toContain('vertical-align: top;');
    const after = rulesFor('.seg-label::after')[0];
    expect(after).toContain('content: attr(data-label);');
    expect(after).toContain('font-weight: 600;');
    expect(after).toContain('visibility: hidden;');
    expect(after).toContain('height: 0;');
  });

  // Fix wave finding 1: the mount-time sync from the server's Auto guess to
  // the visitor's real theme must not itself animate, but every later
  // click or arrow key still should -- ThemeToggle sets `data-ready` one
  // requestAnimationFrame after that first sync.
  it('suppresses the thumb and glyph transitions until `data-ready` (mount-time sync only)', () => {
    expect(rulesFor('.seg:not([data-ready]) .thumb')[0]).toMatch(/transition:\s*none;?/);
    expect(rulesFor('.seg-glyph:not([data-ready]) *')[0]).toMatch(/transition:\s*none;?/);
  });

  it('also turns the thumb slide and the eclipse off under reduced motion', () => {
    const block = [...CODE.matchAll(/@media \(prefers-reduced-motion: reduce\)/g)]
      .map((m) => blockFrom(CODE, m.index!))
      .find((b) => b.includes('.seg .thumb'));
    expect(block, 'reduced-motion block for .seg/.seg-glyph').toBeTruthy();
    expect(block).toMatch(/\.seg-glyph \.core,\s*\.seg-glyph \.cut,\s*\.seg-glyph \.rays \{ transition: none; \}/);
  });
});

// Fix wave finding 9: .ctl (tour paddles, sheet close) is Liquid Glass the
// same as .glass, so it must turn solid under prefers-contrast: more too --
// it already does under @supports-not and reduced transparency (the test
// above this one), but higher contrast had left it out.
describe('.ctl solid under higher contrast (fix wave finding 9)', () => {
  it('turns solid, like .glass, under prefers-contrast: more', () => {
    const contrast = [...CODE.matchAll(/@media \(prefers-contrast: more\)/g)]
      .map((m) => blockFrom(CODE, m.index!))
      .find((b) => b.includes('.ctl'));
    expect(contrast).toMatch(/\.ctl \{[^}]*background: var\(--mist\)/);
  });
});

// Fix wave finding 2 (master R28): no page-wide clip. A section that
// intentionally bleeds off-screen (a tour stage, the signature scene)
// clips its own wrapper instead, so QA's overflow check on
// document.documentElement actually sees a real overflow if one exists.
describe('no page-wide overflow-x clip (fix wave finding 2, master R28)', () => {
  it('never sets overflow-x: clip on body', () => {
    const body = rulesFor('body').join(' ');
    expect(body).not.toMatch(/overflow-x:\s*clip/);
  });
});

// Fix wave finding 3: the legacy Thai heading rule used to exclude new
// headings by naming each type class (.t-hero etc) in a :not() list, so any
// heading it did not yet know about was still caught. Scoped instead to
// what every legacy heading actually shares.
describe('legacy Thai heading leading is scoped to legacy headings only (fix wave finding 3)', () => {
  it('targets the tight arbitrary leading-[...] utility, not h1/h2/h3 in general', () => {
    const rule = rulesFor(':lang(th) :is(h1, h2, h3)[class*="leading-["]')[0];
    expect(rule).toContain('line-height: 1.5;');
    // The old catch-all is gone -- a heading is caught by its own utility
    // now, not by exclusion from a growing list of new type classes.
    expect(CODE).not.toMatch(/:lang\(th\) :is\(h1, h2, h3\):not\(/);
  });
});

// Amendment A06: the external-link arrow only nudges on real hover
// (`(hover: hover)`, so touch screens never fake a hover state), and only
// `transform` animates -- never colour/opacity, per the Global Constraints.
describe('external link arrow + press (A06)', () => {
  it('keeps the .xl arrow nudge inside @media (hover: hover), not @media (hover: hover) and (pointer: fine)', () => {
    const block = [...CODE.matchAll(/@media \(hover: hover\)(?! and)/g)]
      .map((m) => blockFrom(CODE, m.index!))
      .find((b) => b.includes('.xl'));
    expect(block, '.xl hover block').toBeTruthy();
    expect(block).toMatch(/\.xl:hover svg \{[^}]*transform: translate\(2px,\s?-2px\);/);
    expect(block).not.toMatch(/\.xl:hover svg \{[^}]*(color|background|opacity)\s*:/);
  });

  it('keeps the CTA press scale (.btn:active) that A06 confirms', () => {
    expect(rulesFor('.btn:active')[0]).toContain('transform: scale(.97)');
  });
});

// The capsule's link row keeps `contain: layout paint` (the sliding pill's
// measurements stay local to the row), and paint containment clips anything
// drawn outside the row's box -- including the 2 px outer focus ring on the
// first and last links. Drawing that ring inset keeps it whole.
describe('site-nav.css focus ring (wave-1 reconciliation j)', () => {
  const NAV = stripComments(NAV_CSS);

  it('keeps paint containment on the link row', () => {
    expect(rulesFor('.sn-links', NAV)[0]).toContain('contain: layout paint;');
  });

  it('draws the link focus ring inside the link, so the row never clips it', () => {
    expect(rulesFor('.sn-links a:focus-visible', NAV)[0]).toMatch(/outline-offset:\s*-2px;/);
  });
});
