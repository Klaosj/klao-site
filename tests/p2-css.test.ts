import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SIG, SIG_YEAR_STEPS, type SigWindow } from '@/lib/signature';

// Global constraint: only transform and opacity animate. Scoped to the CSS this phase owns, so
// every other phase's CSS is judged by its own tests. Later P2 tasks append their files here.
const P2_CSS = ['src/components/signature.css', 'src/components/status-chip.css'];

function block(css: string, name: string): string {
  const start = css.indexOf(`@keyframes ${name} {`);
  if (start < 0) throw new Error(`missing @keyframes ${name}`);
  let depth = 0;
  for (let i = css.indexOf('{', start); i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') {
      depth--;
      if (depth === 0) return css.slice(start, i + 1);
    }
  }
  throw new Error(`unbalanced @keyframes ${name}`);
}

function allKeyframes(css: string): string[] {
  return [...css.matchAll(/@keyframes\s+([\w-]+)\s*\{/g)].map((m) => block(css, m[1]));
}

const pct = (n: number): string => `${Math.round(n * 1000) / 10}%`;
const hasStop = (kf: string, n: number): boolean => new RegExp(`(^|[\\s,{])${pct(n).replace('.', '\\.')}`).test(kf);

describe('signature.css mirrors SIG in src/lib/signature.ts', () => {
  const css = readFileSync('src/components/signature.css', 'utf8');

  it.each([
    ['sig-head', [SIG.head]],
    ['sig-app', [SIG.gather, SIG.collapse, SIG.tilesOut]],
    ['sig-face', [SIG.face]],
    ['sig-card', [SIG.cardOut]],
    ['sig-frame', [SIG.frameIn, SIG.zoom]],
    ['sig-tint', [SIG.tint]],
    ['sig-chip', [SIG.chipOut]],
    ['sig-cap-a', [SIG.capAIn, SIG.capAOut]],
    ['sig-cap-b', [SIG.capBIn]],
  ] as const)('@keyframes %s carries its windows', (name, windows) => {
    const kf = block(css, name);
    for (const [a, b] of windows as readonly SigWindow[]) {
      expect(hasStop(kf, a), `${name} is missing ${pct(a)}`).toBe(true);
      expect(hasStop(kf, b), `${name} is missing ${pct(b)}`).toBe(true);
    }
  });

  it('switches the year chip at SIG_YEAR_STEPS', () => {
    const edges = [0, ...SIG_YEAR_STEPS, 1];
    for (let i = 0; i < edges.length - 1; i++) {
      expect(css).toContain(`[data-y="${i}"] { animation-range: contain ${pct(edges[i])} contain ${pct(edges[i + 1])}; }`);
    }
  });

  it('keeps the scroll-driven path behind @supports and prefers-reduced-motion', () => {
    expect(css).toContain('@supports (animation-timeline: view())');
    expect(css).toContain('@media (prefers-reduced-motion: no-preference)');
    expect(css).toContain('view-timeline: --sig block;');
  });

  it('keeps every caption visible in the static stack (no hiding outside .pin)', () => {
    // Keyframe stops are only ever applied under `.sig.pin`, so they are judged by the
    // selectors that name them; everything else must not hide content outside `.pin`.
    const rules = allKeyframes(css).reduce((rest, kf) => rest.replace(kf, ''), css);
    const hiding = [...rules.matchAll(/(^|\n)([^{}\n]*)\{[^}\n]*opacity:\s*0[;\s]/g)].map((m) => m[2]);
    expect(hiding.length).toBeGreaterThan(0); // the scan itself works
    for (const selector of hiding) {
      expect(selector.includes('.pin') || selector.includes('.sig-tint') || selector.includes('.sig-app-face'), `hides outside .pin: ${selector}`).toBe(true);
    }
  });

  it('pins the phone head clear of the nav capsule (ruling C-12)', () => {
    // The nav capsule itself uses `calc(8px + env(safe-area-inset-top))` (P1 .sn-wrap); the
    // signature head sits lower still, so it must carry the same safe-area term.
    expect(css).toContain('.sig.pin .sig-head { top: calc(80px + env(safe-area-inset-top)); }');
  });

  it('grounds the five app tiles in ink-3 on card, no brand colour (polish A09)', () => {
    const rule = css.slice(css.indexOf('.sig-app {'), css.indexOf('.sig-app > svg'));
    expect(rule).toContain('var(--ink-3)');
    expect(rule).not.toMatch(/--gonai|#1c7a57/i);
  });

  it('gives only the GoNai tile the GoNai green, both themes (polish A09 + ruling C-3)', () => {
    // `--gonai` is lighter in dark mode (#79C3A1) and fails white-text contrast, so the
    // GoNai-only surfaces keep the literal hex rather than the theme-switching token.
    const rule = css.slice(css.indexOf('.sig-app-face {'), css.indexOf('/* GoNai\'s screenshot'));
    expect(rule).toMatch(/#1C7A57/i);
  });

  it('fades the screenshot frame into the page, never the captions (polish A08)', () => {
    const frameRule = css.slice(css.indexOf('.sig-frame {'), css.indexOf('.sig-frame img'));
    expect(frameRule).toContain('-webkit-mask-image: linear-gradient(to bottom, #000 55%, transparent 98%);');
    expect(frameRule).toContain('mask-image: linear-gradient(to bottom, #000 55%, transparent 98%);');
    expect(css).not.toMatch(/\.sig-cap[^{]*\{[^}]*mask-image/);
  });
});

describe('P2 CSS animates only transform and opacity', () => {
  it.each(P2_CSS)('%s', (file) => {
    const css = readFileSync(file, 'utf8');
    for (const kf of allKeyframes(css)) {
      for (const m of kf.matchAll(/([a-z-]+)\s*:/g)) {
        expect(['opacity', 'transform', 'animation-timing-function'], `${file}: ${m[1]} in a keyframe`).toContain(m[1]);
      }
    }
    for (const m of css.matchAll(/transition\s*:\s*([^;]+);/g)) {
      for (const part of m[1].split(',')) {
        expect(part.trim(), `${file}: transition "${part.trim()}"`).toMatch(/^(transform|opacity|none)\b/);
      }
    }
  });
});
