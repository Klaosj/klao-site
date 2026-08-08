import { describe, it, expect, vi } from 'vitest';
import { mapPostMeta, mapBlocks, splitBilingual } from '@/lib/notion-mappers';
import type { ContentBlock } from '@/lib/models';

const title = (s: string) => ({ title: [{ plain_text: s }] });
const rich = (s: string) => ({ rich_text: s ? [{ plain_text: s }] : [] });

describe('mapPostMeta', () => {
  const page = {
    id: 'post1',
    properties: {
      TitleEN: title('Building GoNai'),
      TitleTH: rich('สร้าง GoNai'),
      Slug: rich('building-gonai'),
      Date: { date: { start: '2026-07-27' } },
      Tags: { multi_select: [{ name: 'building' }] },
      Published: { checkbox: true },
    },
  };

  it('maps a full row', () => {
    expect(mapPostMeta(page)).toMatchObject({
      id: 'post1',
      slug: 'building-gonai',
      title: { en: 'Building GoNai', th: 'สร้าง GoNai' },
      date: '2026-07-27',
      tags: ['building'],
    });
  });

  it('falls back TH -> EN on title when TitleTH is empty', () => {
    // Pins the TH->EN fallback rule (localized()) specifically: with TitleTH
    // blank, title.th must equal title.en, not stay empty.
    const page2 = { ...page, properties: { ...page.properties, TitleTH: rich('') } };
    const p = mapPostMeta(page2)!;
    expect(p.title).toEqual({ en: 'Building GoNai', th: 'Building GoNai' });
  });

  it('returns null on missing slug or date', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const noSlug = { ...page, properties: { ...page.properties, Slug: rich('') } };
    const noDate = { ...page, properties: { ...page.properties, Date: { date: null } } };
    expect(mapPostMeta(noSlug)).toBeNull();
    expect(mapPostMeta(noDate)).toBeNull();
    warn.mockRestore();
  });

  it('returns null and warns with the exact reason on missing Slug', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const page2 = { ...page, properties: { ...page.properties, Slug: rich('') } };
    expect(mapPostMeta(page2)).toBeNull();
    expect(warn).toHaveBeenCalled();
    expect(warn.mock.calls[0][0]).toContain('post1');
    // Exact reason, not just "some warning fired" -- swapping this message
    // for "missing Date" or "missing TitleEN" must fail this test.
    expect(warn.mock.calls[0][0]).toContain('missing Slug');
    warn.mockRestore();
  });

  it('returns null and warns with the exact reason on missing Date', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const page2 = { ...page, properties: { ...page.properties, Date: { date: null } } };
    expect(mapPostMeta(page2)).toBeNull();
    expect(warn).toHaveBeenCalled();
    expect(warn.mock.calls[0][0]).toContain('post1');
    expect(warn.mock.calls[0][0]).toContain('missing Date');
    warn.mockRestore();
  });

  it('returns null and warns with the exact reason on missing TitleEN', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const page2 = { ...page, properties: { ...page.properties, TitleEN: title('') } };
    expect(mapPostMeta(page2)).toBeNull();
    expect(warn).toHaveBeenCalled();
    expect(warn.mock.calls[0][0]).toContain('post1');
    expect(warn.mock.calls[0][0]).toContain('missing TitleEN');
    warn.mockRestore();
  });

  it('treats a non-string Date.start as missing and hits the Date skip guard', () => {
    // Date is typed as PostMeta.date: string. A malformed Notion payload
    // (e.g. a number instead of an ISO string) must not flow through
    // unchecked -- it should be treated the same as an absent date.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const page2 = { ...page, properties: { ...page.properties, Date: { date: { start: 20260727 } } } };
    expect(mapPostMeta(page2)).toBeNull();
    expect(warn.mock.calls[0][0]).toContain('missing Date');
    warn.mockRestore();
  });
});

describe('mapBlocks', () => {
  it('maps supported block types and drops unsupported ones', () => {
    const raw = [
      { id: 'b1', type: 'heading_2', heading_2: { rich_text: [{ plain_text: 'Section' }] } },
      {
        id: 'b2',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            { plain_text: 'Bold ', annotations: { bold: true } },
            { plain_text: 'link', href: 'https://x.example', annotations: {} },
            { plain_text: 'both', annotations: { italic: true, code: true } },
            { plain_text: '', annotations: {} },
          ],
        },
      },
      { id: 'b3', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [{ plain_text: 'Item' }] } },
      { id: 'b4', type: 'code', code: { language: 'bash', rich_text: [{ plain_text: 'npm run dev' }] } },
      { id: 'b5', type: 'image', image: { caption: [{ plain_text: 'cap' }] } },
      { id: 'b6', type: 'divider', divider: {} },
    ];
    const blocks = mapBlocks(raw);
    expect(blocks).toEqual([
      { type: 'heading', level: 2, text: 'Section' },
      {
        type: 'paragraph',
        spans: [
          { text: 'Bold ', bold: true },
          { text: 'link', href: 'https://x.example' },
          { text: 'both', italic: true, code: true },
        ],
      },
      { type: 'bullet', spans: [{ text: 'Item' }] },
      { type: 'code', language: 'bash', code: 'npm run dev' },
      { type: 'image', src: '/api/img/block/b5', caption: 'cap' },
    ]);
  });

  it('maps heading_1, heading_3, numbered_list_item and quote', () => {
    // The brief's primary test only exercises heading_2. Covering the other
    // heading levels and the remaining two RichSpan variants (numbered, quote)
    // separately so deleting any one of those switch cases fails a test.
    const raw = [
      { id: 'h1', type: 'heading_1', heading_1: { rich_text: [{ plain_text: 'Top' }] } },
      { id: 'h3', type: 'heading_3', heading_3: { rich_text: [{ plain_text: 'Sub' }] } },
      { id: 'n1', type: 'numbered_list_item', numbered_list_item: { rich_text: [{ plain_text: 'One' }] } },
      { id: 'q1', type: 'quote', quote: { rich_text: [{ plain_text: 'Quoted' }] } },
    ];
    expect(mapBlocks(raw)).toEqual([
      { type: 'heading', level: 1, text: 'Top' },
      { type: 'heading', level: 3, text: 'Sub' },
      { type: 'numbered', spans: [{ text: 'One' }] },
      { type: 'quote', spans: [{ text: 'Quoted' }] },
    ]);
  });

  it('builds the image proxy path from the block id, not from any Notion file URL', () => {
    const raw = [
      {
        id: 'block-xyz-789',
        type: 'image',
        image: {
          caption: [],
          file: { url: 'https://s3.amazonaws.com/notion/expires-in-an-hour.png' },
        },
      },
    ];
    expect(mapBlocks(raw)).toEqual([{ type: 'image', src: '/api/img/block/block-xyz-789', caption: '' }]);
  });

  it('defaults code language to "text" when Notion omits it', () => {
    const raw = [{ id: 'c1', type: 'code', code: { rich_text: [{ plain_text: 'echo hi' }] } }];
    expect(mapBlocks(raw)).toEqual([{ type: 'code', language: 'text', code: 'echo hi' }]);
  });

  it('drops well-formed but empty bullet, numbered, quote, and heading blocks', () => {
    // Not malformed -- these are blocks Notion returns normally, just with no
    // text in them (e.g. an empty bullet the author left behind). They must
    // not render as an empty <li>/<blockquote>/heading in Task 9.
    const raw = [
      { id: 'e1', type: 'heading_1', heading_1: { rich_text: [] } },
      { id: 'e2', type: 'heading_2', heading_2: { rich_text: [] } },
      { id: 'e3', type: 'heading_3', heading_3: { rich_text: [] } },
      { id: 'e4', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [] } },
      { id: 'e5', type: 'numbered_list_item', numbered_list_item: { rich_text: [] } },
      { id: 'e6', type: 'quote', quote: { rich_text: [] } },
    ];
    expect(mapBlocks(raw)).toEqual([]);
  });

  it('never throws on a payload-less block for any mapped type, and drops all but the ones with meaningful defaults', () => {
    // One payload-less entry per mapped type (9), plus a null entry and an
    // unknown type. If this throws, the test fails outright (uncaught
    // TypeError) -- that's the "never crash" guarantee. If it doesn't throw
    // but returns the wrong survivors, toEqual catches that too. Only code
    // and image keep meaningful defaults when their payload is missing;
    // everything else has nothing to extract and is dropped.
    const raw = [
      { id: 'h1', type: 'heading_1' },
      { id: 'h2', type: 'heading_2' },
      { id: 'h3', type: 'heading_3' },
      { id: 'p1', type: 'paragraph' },
      { id: 'bl1', type: 'bulleted_list_item' },
      { id: 'nl1', type: 'numbered_list_item' },
      { id: 'q1', type: 'quote' },
      { id: 'c1', type: 'code' },
      { id: 'i1', type: 'image' },
      null,
      { type: 'unknown_type' },
    ];
    expect(mapBlocks(raw)).toEqual([
      { type: 'code', language: 'text', code: '' },
      { type: 'image', src: '/api/img/block/i1', caption: '' },
    ]);
  });

  it('returns an empty array for a nullish block list instead of throwing', () => {
    expect(mapBlocks(null as unknown as unknown[])).toEqual([]);
    expect(mapBlocks(undefined as unknown as unknown[])).toEqual([]);
  });
});

describe('splitBilingual', () => {
  const en: ContentBlock = { type: 'paragraph', spans: [{ text: 'English' }] };
  const th: ContentBlock = { type: 'paragraph', spans: [{ text: 'ไทย body' }] };
  const marker: ContentBlock = { type: 'heading', level: 1, text: 'ไทย' };

  it('splits at the ไทย heading', () => {
    expect(splitBilingual([en, marker, th])).toEqual({ en: [en], th: [th] });
  });

  it('does not split on a heading-1 with different text', () => {
    // Pins "exactly ไทย" rather than "any heading-1" or "contains ไทย".
    const notMarker: ContentBlock = { type: 'heading', level: 1, text: 'ไทยเบฟ' };
    const blocks = [en, notMarker, th];
    expect(splitBilingual(blocks)).toEqual({ en: blocks, th: blocks });
  });

  it('does not split on a level-2 heading with text ไทย', () => {
    const wrongLevel: ContentBlock = { type: 'heading', level: 2, text: 'ไทย' };
    const blocks = [en, wrongLevel, th];
    expect(splitBilingual(blocks)).toEqual({ en: blocks, th: blocks });
  });

  it('returns the same array reference for both locales when no marker', () => {
    const blocks = [en, th];
    const result = splitBilingual(blocks);
    expect(result).toEqual({ en: [en, th], th: [en, th] });
    // "the same array is returned for both locales" per the spec -- not merely
    // equal contents, but en and th pointing at one shared array.
    expect(result.en).toBe(result.th);
  });

  it('produces an empty en side when the marker is the first block', () => {
    expect(splitBilingual([marker, th])).toEqual({ en: [], th: [th] });
  });

  it('produces an empty th side when the marker is the last block', () => {
    expect(splitBilingual([en, marker])).toEqual({ en: [en], th: [] });
  });

  it('splits at the first marker when multiple ไทย headings are present', () => {
    // First marker wins; a second "ไทย" H1 is just ordinary content that
    // stays inside the th body, not a second split point.
    const secondMarker: ContentBlock = { type: 'heading', level: 1, text: 'ไทย' };
    expect(splitBilingual([en, marker, th, secondMarker])).toEqual({
      en: [en],
      th: [th, secondMarker],
    });
  });
});
