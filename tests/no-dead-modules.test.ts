import { readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { describe, expect, it } from 'vitest';

// White Edition P5 dead-code sweep. Every module under src/components and
// src/lib must have at least one importer in src/ — a module only its own
// test imports is dead product code that still costs review and build time.
// ClientsBand is the one deliberate exception: spec §4 keeps it in the code,
// unrendered, until profile.clients has names again.
const KEEP = new Set(['src/components/sections/ClientsBand.tsx']);

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}

const sources = new Map(
  walk('src')
    .filter((f) => /\.(tsx?|css|json)$/.test(f))
    .map((f) => [f, readFileSync(f, 'utf8')] as const),
);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Any string literal ending in /<name> or /<name>.css counts as a use:
// static imports, next/dynamic(() => import('…')), and CSS side-effect imports.
function importers(file: string): string[] {
  const name = basename(file).replace(/\.(tsx?|css)$/, '');
  const re = new RegExp(`['"\`][^'"\`]*/${escape(name)}(?:\\.css)?['"\`]`);
  return [...sources].filter(([f, body]) => f !== file && re.test(body)).map(([f]) => f);
}

describe('dead code', () => {
  it('finds a real importer (self-check of the matcher)', () => {
    expect(importers('src/lib/models.ts').length).toBeGreaterThan(0);
  });

  it('leaves no module under src/components or src/lib without an importer', () => {
    const orphans = [...sources.keys()]
      .filter((f) => /^src\/(components|lib)\//.test(f) && /\.(tsx?|css)$/.test(f) && !KEEP.has(f))
      .filter((f) => importers(f).length === 0);
    expect(orphans, orphans.join('\n')).toEqual([]);
  });
});
