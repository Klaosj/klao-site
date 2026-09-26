import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// White Edition P0 removes the dark-era pieces (spec §6, §8). Deleting a file
// is easy to half-do: the component goes, but an import survives in a page
// nobody opened, and the build breaks on the next deploy. This file pins each
// removal twice -- the file is gone, and no quoted module specifier under
// src/ or tests/ still ends in its path -- so a revert or a stray merge shows
// up here before it shows up in `next build`. Later P0 tasks append to the
// list; P1-P5 append their own removals the same way.
const REMOVED_FILES = [
  'src/components/motion/HeroMonument.tsx',
  'src/components/motion/PointerFx.tsx',
] as const;

const THIS_FILE = join('tests', 'removals.test.ts');

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

describe('P0 removals', () => {
  it.each(REMOVED_FILES)('%s no longer exists', (path) => {
    expect(existsSync(path)).toBe(false);
  });

  it('leaves no import of a removed module behind', () => {
    const sources = [...walk('src'), ...walk('tests')].filter(
      (f) => /\.(ts|tsx)$/.test(f) && f !== THIS_FILE,
    );
    // Only source modules can be imported; assets (images) are checked by
    // their own tests. A specifier is any quoted string ending in the path
    // without its extension, so '@/components/...', '../components/...' and
    // a dynamic import(...) are all caught.
    const modules = REMOVED_FILES.filter((p) => /\.tsx?$/.test(p)).map((p) =>
      p.replace(/^src\//, '').replace(/\.tsx?$/, ''),
    );
    for (const file of sources) {
      const body = readFileSync(file, 'utf8');
      for (const mod of modules) {
        const specifier = new RegExp(`['"][^'"\\n]*${escapeRe(mod)}['"]`);
        expect(specifier.test(body), `${file} still imports ${mod}`).toBe(false);
      }
    }
  });

  // Spec §8 / success criterion 5: two projects leave the site entirely --
  // copy, fixtures, alt text and their screenshots in public/images. The
  // pattern is assembled from pieces so this file does not itself contain
  // the names: the phase gate greps src/, public/ and tests/ for them.
  it('mentions neither removed project anywhere in src/, public/ or tests/', () => {
    const gone = new RegExp(['ai' + 'secretary', 'daily' + 'brief'].join('|'), 'i');
    const textLike = /\.(ts|tsx|css|json|md|txt|svg|html)$/;
    for (const file of [...walk('src'), ...walk('public'), ...walk('tests')]) {
      expect(gone.test(file), `file name ${file}`).toBe(false);
      if (textLike.test(file)) expect(gone.test(readFileSync(file, 'utf8')), file).toBe(false);
    }
  });
});
