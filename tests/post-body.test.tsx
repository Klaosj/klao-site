import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PostBody, { groupLists } from '@/components/PostBody';
import type { ContentBlock } from '@/lib/models';

// The fixtures (src/content/fixtures/posts.json) contain zero `numbered`
// blocks, zero `image` blocks, zero spans carrying more than one mark, and
// never two adjacent `bullet` blocks. So groupLists' list-merging branches --
// the most complex logic in this codebase -- have never executed outside
// this file. groupLists is exported from PostBody.tsx specifically so it can
// be unit-tested directly, without needing content that doesn't exist yet.

const bullet = (text: string): ContentBlock => ({ type: 'bullet', spans: [{ text }] });
const numbered = (text: string): ContentBlock => ({ type: 'numbered', spans: [{ text }] });
const para = (text: string): ContentBlock => ({ type: 'paragraph', spans: [{ text }] });
const heading = (text: string): ContentBlock => ({ type: 'heading', level: 2, text });

describe('groupLists', () => {
  it('(a) merges three consecutive bullet blocks into one group of three items', () => {
    const result = groupLists([bullet('one'), bullet('two'), bullet('three')]);
    expect(result).toEqual([
      { type: 'bullets', items: [[{ text: 'one' }], [{ text: 'two' }], [{ text: 'three' }]] },
    ]);
  });

  it('(b) splits bullet, paragraph, bullet into two separate lists with the paragraph between', () => {
    const result = groupLists([bullet('a'), para('mid'), bullet('b')]);
    expect(result).toEqual([
      { type: 'bullets', items: [[{ text: 'a' }]] },
      { type: 'paragraph', spans: [{ text: 'mid' }] },
      { type: 'bullets', items: [[{ text: 'b' }]] },
    ]);
  });

  it('(c) never cross-merges bullet, numbered, bullet -- three separate groups', () => {
    const result = groupLists([bullet('a'), numbered('b'), bullet('c')]);
    expect(result).toEqual([
      { type: 'bullets', items: [[{ text: 'a' }]] },
      { type: 'numbers', items: [[{ text: 'b' }]] },
      { type: 'bullets', items: [[{ text: 'c' }]] },
    ]);
  });

  it('(d) keeps a numbered run and an immediately-following bullet run as two separate groups', () => {
    const result = groupLists([numbered('1'), numbered('2'), bullet('a'), bullet('b')]);
    expect(result).toEqual([
      { type: 'numbers', items: [[{ text: '1' }], [{ text: '2' }]] },
      { type: 'bullets', items: [[{ text: 'a' }], [{ text: 'b' }]] },
    ]);
  });

  it('(e) groups a list run that is the final blocks in the array, dropping nothing', () => {
    const h = heading('Title');
    const result = groupLists([h, bullet('x'), bullet('y'), bullet('z')]);
    expect(result).toEqual([
      h,
      { type: 'bullets', items: [[{ text: 'x' }], [{ text: 'y' }], [{ text: 'z' }]] },
    ]);
  });
});

describe('PostBody rendering (marks and images the fixtures never exercise)', () => {
  it('composes bold + italic + code + href on one span in the correct nesting order (a > em > strong > code > text)', () => {
    const blocks: ContentBlock[] = [
      { type: 'paragraph', spans: [{ text: 'Word', bold: true, italic: true, code: true, href: 'https://example.com/x' }] },
    ];
    const html = renderToStaticMarkup(<PostBody blocks={blocks} />);

    const indexOf = (needle: string) => {
      const i = html.indexOf(needle);
      expect(i, `expected to find ${JSON.stringify(needle)} in: ${html}`).toBeGreaterThanOrEqual(0);
      return i;
    };

    const aOpen = indexOf('<a ');
    const emOpen = indexOf('<em>');
    const strongOpen = indexOf('<strong>');
    const codeOpen = indexOf('<code');
    const text = indexOf('>Word<');
    const codeClose = indexOf('</code>');
    const strongClose = indexOf('</strong>');
    const emClose = indexOf('</em>');
    const aClose = indexOf('</a>');

    // Real nesting assertion, not shape-only: opening tags outermost-first,
    // closing tags in the mirrored order, exactly matching the innermost-out
    // build order in Spans (code, then strong, then em, then a).
    expect(aOpen).toBeLessThan(emOpen);
    expect(emOpen).toBeLessThan(strongOpen);
    expect(strongOpen).toBeLessThan(codeOpen);
    expect(codeOpen).toBeLessThan(text);
    expect(text).toBeLessThan(codeClose);
    expect(codeClose).toBeLessThan(strongClose);
    expect(strongClose).toBeLessThan(emClose);
    expect(emClose).toBeLessThan(aClose);

    expect(html).toContain('href="https://example.com/x"');
  });

  it('renders a figcaption for an image block that has a caption', () => {
    const blocks: ContentBlock[] = [{ type: 'image', src: '/img/a.png', caption: 'A caption' }];
    const html = renderToStaticMarkup(<PostBody blocks={blocks} />);
    expect(html).toContain('src="/img/a.png"');
    expect(html).toContain('<figcaption');
    expect(html).toContain('A caption');
  });

  it('omits the figcaption entirely for an image block with an empty caption', () => {
    const blocks: ContentBlock[] = [{ type: 'image', src: '/img/b.png', caption: '' }];
    const html = renderToStaticMarkup(<PostBody blocks={blocks} />);
    expect(html).toContain('src="/img/b.png"');
    expect(html).not.toContain('<figcaption');
    expect(html).not.toContain('figcaption');
  });
});
