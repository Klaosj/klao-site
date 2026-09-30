import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/components/career.css', 'utf8');

describe('career.css rail draw (spec 2026-10-01 §2.2)', () => {
  it('scales the line from its left edge', () => {
    expect(css).toMatch(/\.car-rline\s*\{[^}]*transform-origin:\s*left center/);
  });
  it('puts every draw rule under prefers-reduced-motion: no-preference', () => {
    const at = css.indexOf('[data-draw=');
    const guard = css.lastIndexOf('@media (prefers-reduced-motion: no-preference)', at);
    expect(at).toBeGreaterThan(-1);
    expect(guard).toBeGreaterThan(-1);
  });
  it('starts the line at scaleX(0) and text no lower than .55', () => {
    expect(css).toMatch(/\[data-draw="ready"\]\s*\.car-rline\s*\{[^}]*transform:\s*scaleX\(0\)/);
    expect(css).toMatch(/\[data-draw="ready"\]\s*\.car-ryears span\s*\{[^}]*opacity:\s*\.55/);
    expect(css).toMatch(/\[data-draw="ready"\]\s*\.car-rmark\s*\{[^}]*opacity:\s*\.55/);
  });
  it('only transitions transform and opacity, and keeps the marker slide', () => {
    for (const m of css.matchAll(/\[data-draw="go"\][^{]*\{([^}]*)\}/g)) {
      const t = /transition:\s*([^;]+);/.exec(m[1])?.[1] ?? '';
      for (const part of t.split(',')) expect(part.trim()).toMatch(/^(transform|opacity)\b/);
    }
    expect(css).toMatch(/\[data-draw="go"\]\s*\.car-rmark\s*\{[^}]*transition:[^;]*transform var\(--dur-ui\) var\(--ease-settle\)/);
  });
});
