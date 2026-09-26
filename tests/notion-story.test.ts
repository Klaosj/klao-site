import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));

vi.mock('@notionhq/client', () => ({
  Client: class {
    databases = { query: queryMock };
    blocks = { children: { list: vi.fn() }, retrieve: vi.fn() };
    pages = { retrieve: vi.fn() };
  },
}));

import { fetchStory } from '@/lib/notion';

const title = (s: string) => ({ title: s ? [{ plain_text: s }] : [] });
const row = (id: string, t: string, order: number) => ({
  id,
  properties: { TitleEN: title(t), Order: { number: order }, Published: { checkbox: true } },
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('NOTION_TOKEN', 'test-token');
  vi.stubEnv('NOTION_DB_STORY', 'db-story');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('fetchStory', () => {
  it('queries the Story DB for published rows and maps them, dropping untitled rows', async () => {
    queryMock.mockResolvedValueOnce({
      results: [row('s1', 'Find the room.', 1), row('s2', '', 2)],
      next_cursor: null,
      has_more: false,
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const story = await fetchStory();
    expect(story.map((c) => c.id)).toEqual(['s1']);
    expect(queryMock.mock.calls[0][0].database_id).toBe('db-story');
    expect(queryMock.mock.calls[0][0].filter).toEqual({ property: 'Published', checkbox: { equals: true } });
    warn.mockRestore();
  });

  it('throws a named error when NOTION_DB_STORY is missing (getStory never calls it then)', async () => {
    vi.stubEnv('NOTION_DB_STORY', '');
    await expect(fetchStory()).rejects.toThrow('Missing env NOTION_DB_STORY');
  });
});
