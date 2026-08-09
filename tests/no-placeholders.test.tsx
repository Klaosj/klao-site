import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Spec acceptance criteria A7 and A8, enforced. These strings are fine in the
 *  prototypes under .superpowers/ but must never reach src/. */
const BANNED = ['example.dev', 'from Notion · Career', 'lorem ipsum', 'Lorem ipsum'];

// Broader, case-insensitive patterns for the content-data fixtures
// (src/content/fixtures/*.json) specifically -- this is what let fx-post-bd
// and fx-post-gonai ship placeholder bodies to real visitors: the scan below
// used to only walk .ts/.tsx/.css and never looked at fixture JSON at all.
// These patterns catch the *generic shape* of placeholder copy (not just the
// specific historical strings above), so the next placeholder -- worded
// differently -- still gets caught.
//
// Deliberately scoped to fixtures only, not merged into BANNED/the wider
// .ts/.tsx/.css scan: these generic terms show up legitimately in real
// source. src/app/[locale]/layout.tsx quotes an upstream Next.js
// `// TODO: ...` comment verbatim, and src/lib/dictionary.ts declares a
// `photoPlaceholder` key name -- both would misfire under a naive substring
// match. Fixture JSON has no code comments or camelCase identifiers, so the
// wider net is safe there without needing those files (which this task
// doesn't own) to change.
//
// Each pattern is word-bounded so `photoPlaceholder` (no boundary before its
// capital P) still doesn't match `\bplaceholder\b`. The placeholder pattern
// additionally excludes image-asset references like `/placeholder.svg` --
// profile.json's photoSrc legitimately falls back to that path -- so only
// "placeholder" used as prose/copy trips it.
const FIXTURE_PATTERNS: RegExp[] = [
  /replace in notion/i,
  /replace with real/i,
  /\bsample post\b/i,
  /\bsample win\b/i,
  /lorem ipsum/i,
  /example\.dev/i,
  /\btodo\b/i,
  /\bfixme\b/i,
  /\bplaceholder\b(?!\.(?:svg|png|jpe?g|webp))/i,
];

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

describe('content fixtures', () => {
  const fixtureFiles = walk('src/content/fixtures').filter((f) => f.endsWith('.json'));

  it('contains no placeholder-shaped copy', () => {
    for (const f of fixtureFiles) {
      const body = readFileSync(f, 'utf8');
      for (const pattern of FIXTURE_PATTERNS) {
        const match = body.match(pattern);
        expect(match, `${f} contains placeholder-shaped text: "${match?.[0]}"`).toBeNull();
      }
    }
  });
});
