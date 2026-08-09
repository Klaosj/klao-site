import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Spec acceptance criteria A7 and A8, enforced. These strings are fine in the
 *  prototypes under .superpowers/ but must never reach src/. */
const BANNED = ['example.dev', 'from Notion · Career', 'lorem ipsum', 'Lorem ipsum'];

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}

describe('shipped source', () => {
  const files = walk('src').filter((f) => /\.(tsx|ts|css)$/.test(f));

  it('contains no placeholder copy', () => {
    for (const f of files) {
      const body = readFileSync(f, 'utf8');
      for (const bad of BANNED) expect(body, `${f} contains "${bad}"`).not.toContain(bad);
    }
  });

  it('contains no dead links', () => {
    for (const f of files.filter((n) => n.endsWith('.tsx'))) {
      const body = readFileSync(f, 'utf8');
      expect(body, `${f} has href="#"`).not.toMatch(/href=["']#["']/);
    }
  });
});
