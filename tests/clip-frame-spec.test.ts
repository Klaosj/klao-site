import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const FRAME = 'design/clips/frame.md';

describe('design/clips/frame.md (spec 2026-10-01 §2.1)', () => {
  it('exists with the White Edition stage, accent and the four motion eases', () => {
    expect(existsSync(FRAME)).toBe(true);
    const md = readFileSync(FRAME, 'utf8');
    expect(md.startsWith('---\n')).toBe(true);
    expect(md).toContain('stage: "#F5F6F8"');
    expect(md).toContain('accent: "#26314A"');
    expect(md).toContain('cubic-bezier(.32,.72,0,1)');
    expect(md).toContain('cubic-bezier(.28,.11,.32,1)');
    expect(md).toContain('cubic-bezier(.4,0,1,1)');
    expect(md).toContain('cubic-bezier(.34,1.56,.64,1)');
  });

  it('is referenced by every clip source folder', () => {
    const dirs = readdirSync('design/clips', { withFileTypes: true }).filter((d) => d.isDirectory());
    expect(dirs.length).toBeGreaterThanOrEqual(3);
    for (const d of dirs) {
      const readme = readFileSync(join('design/clips', d.name, 'README.md'), 'utf8');
      expect(readme, d.name).toContain('../frame.md');
    }
  });
});
