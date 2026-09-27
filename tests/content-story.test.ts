import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Isolated in its own file so this module mock never leaks into the
// fixture-mode tests (same isolation as tests/content-questions.test.ts).
const { fetchStoryMock } = vi.hoisted(() => ({ fetchStoryMock: vi.fn() }));
vi.mock('@/lib/notion', () => ({ fetchStory: fetchStoryMock }));

const chapter = (id: string, order: number) => ({
  id,
  title: { en: id, th: id },
  body: { en: '', th: '' },
  rule: { en: '', th: '' },
  icon: '',
  sketch: '',
  order,
});

describe('getStory (Notion mode)', () => {
  beforeEach(() => {
    fetchStoryMock.mockReset();
    vi.stubEnv('NOTION_TOKEN', 'x');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('serves the fixture chapters without touching Notion when NOTION_DB_STORY is unset', async () => {
    // Master Review Focus #1: Klao adds the Story DB and its env var after
    // this code ships. Until then the page keeps its six chapters -- unlike
    // Questions, which honestly goes empty.
    // Stubbed empty rather than relying on its absence: a shell or CI that
    // exports NOTION_DB_STORY would otherwise run this test in Notion mode
    // (same as content-faq.test.ts with NOTION_DB_FAQ).
    vi.stubEnv('NOTION_DB_STORY', '');
    const { getStory } = await import('@/lib/content');
    const story = await getStory();
    expect(story).toHaveLength(6);
    expect(story[0].title.en).toBe('Find the room.');
    expect(fetchStoryMock).not.toHaveBeenCalled();
  });

  it('reads Notion and sorts by Order once NOTION_DB_STORY is set', async () => {
    vi.stubEnv('NOTION_DB_STORY', 'db-story');
    fetchStoryMock.mockResolvedValueOnce([chapter('b', 2), chapter('a', 1)]);
    const { getStory } = await import('@/lib/content');
    expect((await getStory()).map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('falls back to the fixtures when Notion fails during the production build', async () => {
    vi.stubEnv('NOTION_DB_STORY', 'db-story');
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    fetchStoryMock.mockRejectedValueOnce(new Error('notion down'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { getStory } = await import('@/lib/content');
    expect(await getStory()).toHaveLength(6);
    warn.mockRestore();
  });

  it('rethrows at runtime so ISR keeps serving the last good page', async () => {
    vi.stubEnv('NOTION_DB_STORY', 'db-story');
    fetchStoryMock.mockRejectedValueOnce(new Error('notion down'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { getStory } = await import('@/lib/content');
    await expect(getStory()).rejects.toThrow('notion down');
    warn.mockRestore();
  });
});
