import { describe, it, expect, vi, beforeEach } from 'vitest';

const queryMock = vi.fn();
const blocksListMock = vi.fn();
const blockRetrieveMock = vi.fn();
const pageRetrieveMock = vi.fn();

vi.mock('@notionhq/client', () => ({
  Client: class {
    databases = { query: queryMock };
    blocks = { children: { list: blocksListMock }, retrieve: blockRetrieveMock };
    pages = { retrieve: pageRetrieveMock };
  },
}));

import { fetchProjects, fetchProfile, resolveImageUrl } from '@/lib/notion';

const title = (s: string) => ({ title: [{ plain_text: s }] });

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NOTION_TOKEN = 'test-token';
  process.env.NOTION_DB_PROJECTS = 'db-projects';
  process.env.NOTION_DB_PROFILE = 'db-profile';
});

describe('fetchProjects', () => {
  it('paginates, maps, and drops malformed rows', async () => {
    const row = (id: string, name: string) => ({
      id,
      properties: { Name: title(name), Order: { number: 1 }, Featured: { checkbox: false } },
    });
    queryMock
      .mockResolvedValueOnce({ results: [row('a', 'One')], next_cursor: 'c2', has_more: true })
      .mockResolvedValueOnce({ results: [row('b', 'Two'), row('c', '')], next_cursor: null, has_more: false });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const projects = await fetchProjects();
    expect(projects.map((p) => p.name)).toEqual(['One', 'Two']);
    expect(queryMock).toHaveBeenCalledTimes(2);
    expect(queryMock.mock.calls[0][0].filter).toEqual({
      property: 'Published',
      checkbox: { equals: true },
    });
    warn.mockRestore();
  });
});

describe('fetchProfile', () => {
  it('queries the Profile DB WITHOUT a Published filter (Profile has no Published property)', async () => {
    queryMock.mockResolvedValueOnce({
      results: [{ id: 'pr1', properties: { Name: title('Klao') } }],
      next_cursor: null,
      has_more: false,
    });
    const profile = await fetchProfile();
    expect(profile?.name).toBe('Klao');
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0][0].filter).toBeUndefined();
  });
});

describe('resolveImageUrl', () => {
  it('resolves a block image url', async () => {
    blockRetrieveMock.mockResolvedValueOnce({ type: 'image', image: { file: { url: 'https://fresh/img.png' } } });
    expect(await resolveImageUrl(['block', 'b1'])).toBe('https://fresh/img.png');
  });

  it('resolves a page file property url', async () => {
    pageRetrieveMock.mockResolvedValueOnce({
      properties: { Screenshot: { files: [{ file: { url: 'https://fresh/shot.png' } }] } },
    });
    expect(await resolveImageUrl(['page', 'p1', 'Screenshot'])).toBe('https://fresh/shot.png');
  });

  it('resolves a block image with an external url (no file, only external)', async () => {
    blockRetrieveMock.mockResolvedValueOnce({
      type: 'image',
      image: { external: { url: 'https://fresh/external.png' } },
    });
    expect(await resolveImageUrl(['block', 'b2'])).toBe('https://fresh/external.png');
  });

  it('resolves a page file property with an external url (no file, only external)', async () => {
    pageRetrieveMock.mockResolvedValueOnce({
      properties: { Screenshot: { files: [{ external: { url: 'https://fresh/ext-shot.png' } }] } },
    });
    expect(await resolveImageUrl(['page', 'p1', 'Screenshot'])).toBe('https://fresh/ext-shot.png');
  });

  it('returns null on bad refs and API errors', async () => {
    expect(await resolveImageUrl(['nope'])).toBeNull();
    blockRetrieveMock.mockRejectedValueOnce(new Error('boom'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await resolveImageUrl(['block', 'b9'])).toBeNull();
    warn.mockRestore();
  });
});
