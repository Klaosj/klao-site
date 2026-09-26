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

  it.each([
    ['color-dark', 'var(--canvas)'],
    ['color-deep', 'var(--mist)'],
    ['color-light', 'var(--canvas)'],
    ['color-peri', 'var(--kram)'],
    ['color-peri-deep', 'var(--link)'],
    ['color-on-dark', 'var(--ink-1)'],
    ['color-on-dark-soft', 'var(--ink-2)'],
    ['color-on-dark-faint', 'var(--line)'],
    ['color-on-dark-mid', 'var(--ink-3)'],
    ['color-on-light', 'var(--ink-1)'],
    ['color-on-light-soft', 'var(--ink-2)'],
    ['color-on-light-faint', 'var(--line)'],
    ['color-paper', 'var(--canvas)'],
    ['color-ink', 'var(--ink-1)'],
    ['color-soft', 'var(--ink-2)'],
  ])('legacy --%s is repointed to %s until P5 deletes it', (name, value) => {
    expect(theme[name]).toBe(value);
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

  it('turns the old bg-light + text-dark primary pills into Kram buttons instead of white-on-white', () => {
    expect(CSS).toMatch(/\.bg-light\.text-dark \{[^}]*background-color: var\(--kram\);[^}]*color: var\(--on-kram\);/);
  });

  it('renames the hero annotation pills so the shared .pill chip is free', () => {
    expect(CSS).toMatch(/\.hero-pill \{/);
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
function rulesFor(selector: string): string[] {
  const out: string[] = [];
  for (const m of CODE.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
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
    '.btn', '.btn-fill', '.btn-out', '.pill', '.glass', '.tile', '.win', '.nw',
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
