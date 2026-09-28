import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import nextConfig from '../next.config';

describe('next.config redirects', () => {
  it('sends the retired /career route to the career band anchor (C7)', async () => {
    const redirects = await nextConfig.redirects!();
    expect(redirects).toContainEqual({
      source: '/:locale(en|th)/career',
      destination: '/:locale#career',
      permanent: false,
    });
  });
});

// T18-g (CO-30): ~/Desktop/Klao Workspace keeps a package-lock.json of its
// own, one folder above this project. With no root set, Next walks up to the
// top-most lockfile, takes that folder as the workspace root and prints a
// warning on every dev and build. Pinning it to this project's own folder
// silences that and keeps file tracing inside the repo (Next copies the
// value into outputFileTracingRoot, so webpack builds use it too).
describe('next.config workspace root', () => {
  it('is this project, not a parent folder that has its own lockfile', () => {
    expect(nextConfig.turbopack?.root).toBe(path.resolve(import.meta.dirname, '..'));
  });
});

// P5 flag day: src/app/global-not-found.tsx is the 404 for every path that
// matches no page, and only because this experimental flag is on. The old
// root src/app/not-found.tsx is deleted: with the flag on, nothing routed to
// it, yet it still shipped a chunk and a second globals.css on every 404.
// The two facts are pinned together: turning the flag off without restoring
// that file would leave those paths without the site's own 404.
describe('next.config global not-found', () => {
  const app = path.resolve(import.meta.dirname, '../src/app');

  it('turns on experimental.globalNotFound', () => {
    expect(nextConfig.experimental?.globalNotFound).toBe(true);
  });

  it('keeps global-not-found.tsx and no root not-found.tsx beside it', () => {
    expect(existsSync(path.join(app, 'global-not-found.tsx'))).toBe(true);
    expect(existsSync(path.join(app, 'not-found.tsx'))).toBe(false);
  });
});
