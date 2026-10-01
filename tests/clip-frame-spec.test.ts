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

// Final review (A): the source folders were copied in from a staging layout (`out/source/`,
// `source/`), so their READMEs pointed at paths that do not exist here, and each carried a copy
// of frame.md plus HyperFrames scaffold notes. The folders are the layout now.
describe('design/clips/<key>/ source folders', () => {
  const dirs = readdirSync('design/clips', { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  it.each(dirs)('%s: its README names only paths that exist, relative to the folder', (key) => {
    const dir = join('design/clips', key);
    const readme = readFileSync(join(dir, 'README.md'), 'utf8');
    expect(readme).not.toMatch(/\b(?:out\/)?source\//);
    const paths = [...readme.matchAll(/\b((?:tools\/[\w.-]+)|(?:sting-(?:16x9|1x1)(?:\/[\w.-]+)?))/g)].map((m) => m[1]);
    expect(paths).toContain('tools/build.sh');
    for (const p of paths) expect(existsSync(join(dir, p)), `${key}: ${p}`).toBe(true);
  });

  it.each(dirs)('%s: no copy of frame.md and no HyperFrames scaffold AGENTS.md / CLAUDE.md', (key) => {
    const dir = join('design/clips', key);
    expect(existsSync(join(dir, 'frame.md'))).toBe(false);
    for (const cut of ['sting-16x9', 'sting-1x1']) {
      for (const f of ['AGENTS.md', 'CLAUDE.md']) expect(existsSync(join(dir, cut, f)), `${cut}/${f}`).toBe(false);
    }
  });
});
