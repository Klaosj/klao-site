import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Isolated in its own file so this module mock never leaks into the
// fixture-mode assertions in tests/content.test.ts.
vi.mock('@/lib/notion', () => ({
  fetchProjects: () => Promise.reject(new Error('502')),
}));

describe('getProjects ISR fallback semantics (carried from Task 2 review)', () => {
  const originalPhase = process.env.NEXT_PHASE;

  beforeEach(() => {
    vi.stubEnv('NOTION_TOKEN', 'x');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    if (originalPhase === undefined) delete process.env.NEXT_PHASE;
    else process.env.NEXT_PHASE = originalPhase;
  });

  it('rethrows at runtime (NEXT_PHASE unset) so ISR keeps serving the last good cache', async () => {
    delete process.env.NEXT_PHASE;
    const { getProjects } = await import('@/lib/content');
    await expect(getProjects()).rejects.toThrow('502');
  });

  it('falls back to fixtures during the production build phase (no cache exists yet)', async () => {
    process.env.NEXT_PHASE = 'phase-production-build';
    const { getProjects } = await import('@/lib/content');
    const projects = await getProjects();
    expect(projects.length).toBeGreaterThan(0);
    // Fixture data, not a thrown error or empty array from a swallowed failure.
    expect(projects.some((p) => typeof p.name === 'string' && p.name.length > 0)).toBe(true);
  });
});
