import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

// Flat config does not read .gitignore, so every generated or scratch tree
// the repo keeps out of git has to be named in eslint.config.mjs's ignores,
// or `npm run check` lints someone else's build output (wave 1 hit this with
// a lane's .next/ under .superpowers/). `.claude/` holds Claude Code's own
// worktrees, each a full checkout; `out/` is a static export's output.
describe('eslint.config.mjs ignores', () => {
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
