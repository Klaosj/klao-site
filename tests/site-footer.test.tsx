import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OpenQuestion, PostMeta, Profile } from '@/lib/models';

// Mirrors tests/career-resume.test.tsx's pattern: getProfile is mocked so
// this file doesn't depend on the real fixture's name string, and the
// module is dynamically imported after the mock is registered so
// SiteFooter's module graph always resolves the mocked version.
const testProfile: Profile = {
  name: 'Test Person',
  headline: { en: 'Headline EN', th: 'Headline TH' },
  byline: { en: 'Byline EN', th: 'Byline TH' },
  now: { en: 'Now EN', th: 'Now TH' },
  photoSrc: null,
  linkedin: 'https://linkedin.example/test',
  github: 'https://github.example/test',
  email: 'test@example.com',
  resumeUrl: null,
  clients: [],
  nameNative: null,
};

// Mutable, reset in beforeEach: Task 5's freshness-line tests override these
// per-test, while every pre-existing test in this file leaves them at their
// [] default -- matching the real getPosts()/getQuestions()'s fixture-mode
// [] return, so the footer's freshness line stays absent (line omitted) and
// none of the tests above regress.
let mockPosts: PostMeta[] = [];
let mockQuestions: OpenQuestion[] = [];

beforeEach(() => {
  mockPosts = [];
  mockQuestions = [];
});

vi.mock('@/lib/content', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/content')>();
  return {
    ...actual,
    getProfile: async () => testProfile,
    getPosts: async () => mockPosts,
    getQuestions: async () => mockQuestions,
  };
});

type El = { type: unknown; props?: { children?: unknown; className?: unknown } };
function isEl(x: unknown): x is El {
  return typeof x === 'object' && x !== null && 'props' in x;
}
function collectText(node: unknown, acc: string[] = []): string[] {
  if (node == null || typeof node === 'boolean') return acc;
  if (typeof node === 'string' || typeof node === 'number') {
    acc.push(String(node));
    return acc;
  }
  if (Array.isArray(node)) {
    for (const child of node) collectText(child, acc);
    return acc;
  }
  if (isEl(node)) collectText(node.props?.children, acc);
  return acc;
}

describe('SiteFooter', () => {
  it("renders the copyright line with the real profile name, not invented copy", async () => {
    const { default: SiteFooter } = await import('@/components/SiteFooter');
    const jsx = await SiteFooter();
    const text = collectText(jsx).join(' ');
    expect(text).toContain('Test Person');
    expect(text).toContain(String(new Date().getFullYear()));
  });

  it('carries the dark treatment (bg-deep, a top hairline) and nothing else', async () => {
    const { default: SiteFooter } = await import('@/components/SiteFooter');
    const jsx = (await SiteFooter()) as El;
    expect(jsx.props?.className).toContain('bg-deep');
    expect(jsx.props?.className).toContain('border-t');
  });

  it('defaults to the English (font-mono) treatment when no locale is passed, so existing callers are unaffected', async () => {
    const { default: SiteFooter } = await import('@/components/SiteFooter');
    const jsx = (await SiteFooter()) as El;
    // footerNote (T4) added a second <p> above the copyright line, and the
    // freshness line (T5) added a third slot above that (null here, since
    // mockPosts/mockQuestions default to [] -- still counted as a JSX child
    // position). `children` is [freshness, footerNote, copyright].
    const children = jsx.props?.children as El[];
    const p = children[2];
    expect(p.props?.className).toContain('font-mono');
    expect(p.props?.className).not.toContain('font-thai');
  });

  it('switches the copyright line to the Thai font stack with normal tracking when locale is th', async () => {
    // Regression test: no monospace face carries Thai glyphs (whole-branch
    // review finding). profile.name is a plain, locale-invariant string
    // (always Latin today, per src/lib/models.ts), so this doesn't change
    // what text renders -- only that the treatment now follows the same
    // locale convention as every other eyebrow-style label in the
    // redesign, via the same `eyebrowFont` helper.
    const { default: SiteFooter } = await import('@/components/SiteFooter');
    const jsx = (await SiteFooter({ locale: 'th' })) as El;
    // See the English-default test above: children is [freshness, footerNote,
    // copyright] since T5's freshness line took the leading slot.
    const children = jsx.props?.children as El[];
    const p = children[2];
    expect(p.props?.className).not.toContain('font-mono');
    expect(p.props?.className).not.toMatch(/tracking-\[/);
    expect(p.props?.className).toContain('font-thai');
  });

  it('renders the footerNote human line', async () => {
    // Query by the English string (the default locale) -- T4's SiteFooter's
    // human micro-copy, personality traceable to profile.now (nights &
    // weekends), not fabricated.
    const { default: SiteFooter } = await import('@/components/SiteFooter');
    const jsx = await SiteFooter();
    const text = collectText(jsx).join(' ');
    expect(text).toContain('Built at night, powered by good coffee.');
  });

  it('renders no links at all -- nothing to leak a dead href', async () => {
    const { default: SiteFooter } = await import('@/components/SiteFooter');
    const jsx = await SiteFooter();
    const links: El[] = [];
    const find = (node: unknown) => {
      if (node == null || typeof node === 'boolean') return;
      if (Array.isArray(node)) return node.forEach(find);
      if (isEl(node)) {
        if (node.type === 'a') links.push(node);
        find(node.props?.children);
      }
    };
    find(jsx);
    expect(links).toHaveLength(0);
  });

  it('renders the freshness line from the newest of post/question dates', async () => {
    mockPosts = [{ id: 'p1', slug: 's', title: { en: 'T', th: 'T' }, date: '2026-07-01', tags: [] }];
    mockQuestions = [
      { id: 'q1', question: { en: 'Q?', th: 'Q?' }, status: 'wondering', linkSlug: null, date: '2026-08-10' },
    ];
    const { default: SiteFooter } = await import('@/components/SiteFooter');
    const text = collectText(await SiteFooter({ locale: 'en' })).join(' ');
    expect(text).toContain('Content last updated');
    expect(text).toContain('Aug 10, 2026');
    expect(text).not.toContain('Jul 1, 2026');
  });

  it('omits the freshness line entirely when no dated content exists', async () => {
    mockPosts = [];
    mockQuestions = [];
    const { default: SiteFooter } = await import('@/components/SiteFooter');
    const text = collectText(await SiteFooter()).join(' ');
    expect(text).not.toContain('Content last updated');
  });
});
