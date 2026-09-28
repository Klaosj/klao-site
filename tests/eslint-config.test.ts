import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

// Flat config does not read .gitignore, so every generated or scratch tree
// the repo keeps out of git has to be named in eslint.config.mjs's ignores,
// or `npm run check` lints someone else's build output (wave 1 hit this with
// a lane's .next/ under .superpowers/). `.claude/` holds Claude Code's own
// worktrees, each a full checkout; `out/` is a static export's output.
//
// T18-c (CO-09): the first isPathIgnored() call loads eslint.config.mjs and
// every plugin it imports -- about 0.4 s on an idle machine, but past
// Vitest's 5 s default when the whole suite runs under load (it timed out
// once in the main checkout and once in a lane). The generous timeout
// belongs to this suite alone; the rest of the suite keeps the default.
describe('eslint.config.mjs ignores', { timeout: 60_000 }, () => {
  const eslint = new ESLint();

  it.each(['.claude/worktrees/x/src/app/page.tsx', 'out/_next/static/chunks/main.js', '.superpowers/worktrees/l1/.next/server.js'])(
    'skips %s',
    async (path) => {
      expect(await eslint.isPathIgnored(path)).toBe(true);
    },
  );

  it('still lints the source tree', async () => {
    expect(await eslint.isPathIgnored('src/lib/format.ts')).toBe(false);
    expect(await eslint.isPathIgnored('tests/format.test.ts')).toBe(false);
  });
});
