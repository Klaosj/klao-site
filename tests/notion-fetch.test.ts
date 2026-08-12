import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

import { fetchProjects, fetchProfile, fetchPostBySlug, fetchProjectStory, resolveImageUrl } from '@/lib/notion';

const title = (s: string) => ({ title: [{ plain_text: s }] });
const richText = (s: string) => ({ rich_text: s ? [{ plain_text: s }] : [] });

beforeEach(() => {
  // resetAllMocks (not clearAllMocks) also drains any queued
  // mockResolvedValueOnce/mockRejectedValueOnce implementations left over
  // from a prior test — clearAllMocks only resets call history and leaves
  // those queued once-values intact, which is a silent-wrong-assertion trap
  // for whatever test runs next rather than a loud failure.
  vi.resetAllMocks();
  vi.stubEnv('NOTION_TOKEN', 'test-token');
  vi.stubEnv('NOTION_DB_PROJECTS', 'db-projects');
  vi.stubEnv('NOTION_DB_POSTS', 'db-posts');
  vi.stubEnv('NOTION_DB_PROFILE', 'db-profile');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('fetchProjects', () => {
  it('paginates by forwarding the returned cursor, maps, and drops malformed rows', async () => {
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

    // The cursor round trip itself: a query call that keeps looping without
    // ever forwarding start_cursor would call query() twice, receive both
    // queued pages, and satisfy the assertions above while actually
    // refetching page 1 forever in production (a hang, not a bug that's
    // visible from result shape alone).
    expect(queryMock.mock.calls[0][0].start_cursor).toBeUndefined();
    expect(queryMock.mock.calls[1][0].start_cursor).toBe('c2');

    // Published filter must hold on every page, not just the first.
    expect(queryMock.mock.calls[0][0].filter).toEqual({
      property: 'Published',
      checkbox: { equals: true },
    });
    expect(queryMock.mock.calls[1][0].filter).toEqual({
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

describe('fetchPostBySlug', () => {
  it('composes the Slug filter with Published, and paginates the block children by forwarding the cursor', async () => {
    queryMock.mockResolvedValueOnce({
      results: [
        {
          id: 'post-1',
          properties: {
            Slug: richText('hello-world'),
            TitleEN: title('Hello World'),
            TitleTH: richText(''),
            Date: { date: { start: '2026-01-01' } },
            Tags: { multi_select: [] },
          },
        },
      ],
      next_cursor: null,
      has_more: false,
    });
    blocksListMock
      .mockResolvedValueOnce({
        results: [{ type: 'paragraph', id: 'blk-1', paragraph: { rich_text: [{ plain_text: 'Part one' }] } }],
        next_cursor: 'bc2',
        has_more: true,
      })
      .mockResolvedValueOnce({
        results: [{ type: 'paragraph', id: 'blk-2', paragraph: { rich_text: [{ plain_text: 'Part two' }] } }],
        next_cursor: null,
        has_more: false,
      });

    const post = await fetchPostBySlug('hello-world');

    expect(post?.slug).toBe('hello-world');
    expect(queryMock.mock.calls[0][0].filter).toEqual({
      and: [
        { property: 'Published', checkbox: { equals: true } },
        { property: 'Slug', rich_text: { equals: 'hello-world' } },
      ],
    });

    // listBlocks is its own pagination loop (a copy of queryAll's, not
    // shared code) — a post body over one page silently truncates unless
    // this is exercised directly.
    expect(blocksListMock).toHaveBeenCalledTimes(2);
    expect(blocksListMock.mock.calls[0][0].start_cursor).toBeUndefined();
    expect(blocksListMock.mock.calls[1][0].start_cursor).toBe('bc2');

    const allText = [...post!.body.en, ...post!.body.th]
      .flatMap((b) => (b.type === 'paragraph' ? b.spans.map((s) => s.text) : []))
      .join(' ');
    expect(allText).toContain('Part one');
    expect(allText).toContain('Part two');
  });

  it('returns null when no page matches the slug', async () => {
    queryMock.mockResolvedValueOnce({ results: [], next_cursor: null, has_more: false });
    expect(await fetchPostBySlug('no-such-slug')).toBeNull();
    expect(blocksListMock).not.toHaveBeenCalled();
  });
});

describe('fetchProjectStory', () => {
  it('composes the Slug filter with Published, and paginates the block children by forwarding the cursor', async () => {
    queryMock.mockResolvedValueOnce({
      results: [
        {
          id: 'project-1',
          properties: {
            Name: title('Duckling'),
            DescriptionEN: richText('A duck app'),
            DescriptionTH: richText(''),
            Stack: { multi_select: [] },
            LiveURL: { url: null },
            RepoURL: { url: null },
            Featured: { checkbox: false },
            Order: { number: 1 },
            QuestionEN: richText('Why a duck?'),
            QuestionTH: richText(''),
            Slug: richText('duckling'),
          },
        },
      ],
      next_cursor: null,
      has_more: false,
    });
    blocksListMock
      .mockResolvedValueOnce({
        results: [{ type: 'paragraph', id: 'blk-1', paragraph: { rich_text: [{ plain_text: 'Part one' }] } }],
        next_cursor: 'bc2',
        has_more: true,
      })
      .mockResolvedValueOnce({
        results: [{ type: 'paragraph', id: 'blk-2', paragraph: { rich_text: [{ plain_text: 'Part two' }] } }],
        next_cursor: null,
        has_more: false,
      });

    const story = await fetchProjectStory('duckling');

    expect(story?.slug).toBe('duckling');
    expect(queryMock.mock.calls[0][0].filter).toEqual({
      and: [
        { property: 'Published', checkbox: { equals: true } },
        { property: 'Slug', rich_text: { equals: 'duckling' } },
      ],
    });

    // listBlocks is its own pagination loop -- a story body over one page
    // silently truncates unless this is exercised directly, same reasoning
    // as fetchPostBySlug's equivalent assertion above.
    expect(blocksListMock).toHaveBeenCalledTimes(2);
    expect(blocksListMock.mock.calls[0][0].start_cursor).toBeUndefined();
    expect(blocksListMock.mock.calls[1][0].start_cursor).toBe('bc2');

    const allText = [...story!.body.en, ...story!.body.th]
      .flatMap((b) => (b.type === 'paragraph' ? b.spans.map((s) => s.text) : []))
      .join(' ');
    expect(allText).toContain('Part one');
    expect(allText).toContain('Part two');
  });

  it('returns null when no page matches the slug', async () => {
    queryMock.mockResolvedValueOnce({ results: [], next_cursor: null, has_more: false });
    expect(await fetchProjectStory('no-such-slug')).toBeNull();
    expect(blocksListMock).not.toHaveBeenCalled();
  });
});

describe('resolveImageUrl', () => {
  // Real Notion ids are UUIDs: 32 hex chars, with or without dashes.
  const blockId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const dashedBlockId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  const pageId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

  it('resolves a block image url', async () => {
    blockRetrieveMock.mockResolvedValueOnce({ type: 'image', image: { file: { url: 'https://fresh/img.png' } } });
    expect(await resolveImageUrl(['block', blockId])).toBe('https://fresh/img.png');
  });

  it('resolves a page file property url', async () => {
    pageRetrieveMock.mockResolvedValueOnce({
      properties: { Screenshot: { files: [{ file: { url: 'https://fresh/shot.png' } }] } },
    });
    expect(await resolveImageUrl(['page', pageId, 'Screenshot'])).toBe('https://fresh/shot.png');
  });

  it('resolves a block image with an external url (no file, only external)', async () => {
    blockRetrieveMock.mockResolvedValueOnce({
      type: 'image',
      image: { external: { url: 'https://fresh/external.png' } },
    });
    expect(await resolveImageUrl(['block', dashedBlockId])).toBe('https://fresh/external.png');
  });

  it('resolves a page file property with an external url (no file, only external)', async () => {
    pageRetrieveMock.mockResolvedValueOnce({
      properties: { Screenshot: { files: [{ external: { url: 'https://fresh/ext-shot.png' } }] } },
    });
    expect(await resolveImageUrl(['page', pageId, 'Screenshot'])).toBe('https://fresh/ext-shot.png');
  });

  it('returns null on bad refs and API errors', async () => {
    expect(await resolveImageUrl(['nope'])).toBeNull();
    blockRetrieveMock.mockRejectedValueOnce(new Error('boom'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await resolveImageUrl(['block', blockId])).toBeNull();
    warn.mockRestore();
  });

  it('rejects a malformed id without ever calling the Notion API (quota protection)', async () => {
    expect(await resolveImageUrl(['block', 'not-a-real-id'])).toBeNull();
    expect(blockRetrieveMock).not.toHaveBeenCalled();
    expect(await resolveImageUrl(['page', 'short', 'Screenshot'])).toBeNull();
    expect(pageRetrieveMock).not.toHaveBeenCalled();
  });
});
