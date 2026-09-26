import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import faqFixture from '@/content/fixtures/faq.json';

// Isolated file, like tests/content-questions.test.ts, so this module mock
// never leaks into the fixture-mode assertions elsewhere.
const { fetchFaq } = vi.hoisted(() => ({ fetchFaq: vi.fn() }));
vi.mock('@/lib/notion', () => ({ fetchFaq }));

const row = (id: string, order: number) => ({
  id,
  question: { en: `${id}?`, th: `${id}?` },
  answer: { en: 'A', th: 'A' },
  links: [],
  order,
});
const fixtureIds = faqFixture.map((i) => i.id);

describe('getFaq', () => {
  beforeEach(() => {
    fetchFaq.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('serves the fixtures in fixture mode (no NOTION_TOKEN)', async () => {
    vi.stubEnv('NOTION_TOKEN', '');
    const { getFaq } = await import('@/lib/content');
    expect((await getFaq()).map((i) => i.id)).toEqual(fixtureIds);
    expect(fetchFaq).not.toHaveBeenCalled();
  });

  it('serves the fixtures when NOTION_TOKEN is set but NOTION_DB_FAQ is not (Review Focus #1)', async () => {
    // Mid-migration: the token is live, the FAQ DB isn't created yet. The
    // page must keep its FAQ rather than go empty or throw (contract C5).
    vi.stubEnv('NOTION_TOKEN', 'x');
    vi.stubEnv('NOTION_DB_FAQ', '');
    const { getFaq } = await import('@/lib/content');
    expect((await getFaq()).map((i) => i.id)).toEqual(fixtureIds);
    expect(fetchFaq).not.toHaveBeenCalled();
  });

  it('reads Notion, sorted by Order, once NOTION_DB_FAQ is set', async () => {
    vi.stubEnv('NOTION_TOKEN', 'x');
    vi.stubEnv('NOTION_DB_FAQ', 'db-faq');
    fetchFaq.mockResolvedValue([row('b', 2), row('a', 1)]);
    const { getFaq } = await import('@/lib/content');
    expect((await getFaq()).map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('falls back to the fixtures when Notion fails during the production build', async () => {
    vi.stubEnv('NOTION_TOKEN', 'x');
    vi.stubEnv('NOTION_DB_FAQ', 'db-faq');
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetchFaq.mockRejectedValue(new Error('notion down'));
    const { getFaq } = await import('@/lib/content');
    expect((await getFaq()).map((i) => i.id)).toEqual(fixtureIds);
    warn.mockRestore();
  });

  it('rethrows a Notion failure at runtime, so ISR keeps serving the last good page', async () => {
    vi.stubEnv('NOTION_TOKEN', 'x');
    vi.stubEnv('NOTION_DB_FAQ', 'db-faq');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetchFaq.mockRejectedValue(new Error('notion down'));
    const { getFaq } = await import('@/lib/content');
    await expect(getFaq()).rejects.toThrow('notion down');
    warn.mockRestore();
  });
});
