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
