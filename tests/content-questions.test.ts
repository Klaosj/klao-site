import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Isolated in its own file so this module mock never leaks into the
// fixture-mode assertions in tests/content.test.ts (same isolation note as
// tests/content-isr.test.ts).
vi.mock('@/lib/notion', () => ({
  fetchQuestions: () =>
    Promise.resolve([
      { id: 'old', question: { en: 'Old?', th: 'Old?' }, status: 'wondering', linkSlug: null, date: '2026-07-01' },
      { id: 'new', question: { en: 'New?', th: 'New?' }, status: 'building', linkSlug: null, date: '2026-08-10' },
    ]),
}));

describe('getQuestions (Notion mode)', () => {
  beforeEach(() => {
    vi.stubEnv('NOTION_TOKEN', 'x');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns [] without touching Notion when NOTION_DB_QUESTIONS is unset', async () => {
    // Missing env = feature not configured yet (the owner adds Vercel env
    // vars separately from code deploys) -- NOT an error to rethrow, or
    // every ISR revalidate of every page would fail until the console
    // action happens. Spec §3.
    const { getQuestions } = await import('@/lib/content');
    await expect(getQuestions()).resolves.toEqual([]);
  });

  it('sorts date desc when configured', async () => {
    vi.stubEnv('NOTION_DB_QUESTIONS', 'db-q');
    const { getQuestions } = await import('@/lib/content');
    const questions = await getQuestions();
    expect(questions.map((q) => q.id)).toEqual(['new', 'old']);
  });
});
