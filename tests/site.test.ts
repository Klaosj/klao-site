import { describe, it, expect, vi, afterEach } from 'vitest';

// SITE_URL is computed at module-evaluation time (`export const SITE_URL =
// resolveSiteUrl()`), so each scenario needs its own fresh module instance:
// stub env vars, then dynamically re-import after vi.resetModules(). Mirrors
// the pattern in tests/content-isr.test.ts for the same reason.

describe('SITE_URL (src/lib/site.ts)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('falls back to localhost when unset and not on Vercel (local dev/build)', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    vi.stubEnv('VERCEL', '');
    const { SITE_URL } = await import('@/lib/site');
    expect(SITE_URL).toBe('http://localhost:3000');
  });

  it('strips a trailing slash so sitemap/robots and canonical/hreflang URLs cannot disagree', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://klao.dev/');
    const { SITE_URL } = await import('@/lib/site');
    expect(SITE_URL).toBe('https://klao.dev');
  });

  it('strips multiple trailing slashes too', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://klao.dev///');
    const { SITE_URL } = await import('@/lib/site');
    expect(SITE_URL).toBe('https://klao.dev');
  });

  it('trims a pasted-in trailing space (realistic: pasted into the Vercel dashboard) before stripping the slash', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://klao.dev/ ');
    const { SITE_URL } = await import('@/lib/site');
    expect(SITE_URL).toBe('https://klao.dev');
  });

  it('trims leading whitespace too', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '  https://klao.dev');
    const { SITE_URL } = await import('@/lib/site');
    expect(SITE_URL).toBe('https://klao.dev');
  });

  it('throws a named, actionable error for a URL with no protocol, instead of an opaque TypeError later at metadataBase', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'klao.dev');
    await expect(import('@/lib/site')).rejects.toThrow('NEXT_PUBLIC_SITE_URL is set to "klao.dev"');
  });

  it('leaves a clean URL untouched', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://klao.dev');
    const { SITE_URL } = await import('@/lib/site');
    expect(SITE_URL).toBe('https://klao.dev');
  });

  it('throws on Vercel when the env var is missing, instead of silently shipping localhost URLs', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    vi.stubEnv('VERCEL', '1');
    await expect(import('@/lib/site')).rejects.toThrow('NEXT_PUBLIC_SITE_URL is not set');
  });
});
