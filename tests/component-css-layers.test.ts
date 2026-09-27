import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Wave-1 integration ruling (CSS layers), applied at the wave-2 merge: every
// component stylesheet sits in `@layer components`, next to globals.css's C9
// classes. Unlayered, a sheet outranks Tailwind's utilities layer and every
// shared class no matter the specificity, so a utility on the same element
// (mt-8, text-center, ...) would silently lose. View-transition pseudo rules
// may stay unlayered, as globals.css's own do.
const ROOT = 'src/components';
const sheets = (readdirSync(ROOT, { recursive: true }) as string[])
  .filter((f) => f.endsWith('.css'))
  .map((f) => join(ROOT, f))
  .sort();

// The prelude of every top-level rule or at-rule, comments removed.
function topLevelPreludes(css: string): string[] {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '{') {
      if (depth === 0) out.push(src.slice(start, i).trim().replace(/\s+/g, ' '));
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0) start = i + 1;
    } else if (c === ';' && depth === 0) {
      out.push(src.slice(start, i + 1).trim());
      start = i + 1;
    }
  }
  return out;
}

describe('component stylesheets (CSS layer convention)', () => {
  it('finds the component sheets', () => {
    expect(sheets.length).toBeGreaterThan(15);
  });

  it.each(sheets)('%s keeps every rule inside @layer components', (file) => {
    const preludes = topLevelPreludes(readFileSync(file, 'utf8'));
    expect(preludes).toContain('@layer components');
    for (const p of preludes) {
      expect(p === '@layer components' || p.startsWith('::view-transition'), `"${p}" sits outside @layer components`).toBe(true);
    }
  });
});
