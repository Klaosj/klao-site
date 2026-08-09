import { describe, it, expect, vi } from 'vitest';
import type { ContentBlock, Locale, Post, PostMeta } from '@/lib/models';
import { dict } from '@/lib/dictionary';
import { SITE_URL } from '@/lib/site';
import { generateMetadata as projectsMetadata } from '@/app/[locale]/projects/page';
import { generateMetadata as writingMetadata } from '@/app/[locale]/writing/page';
import { derivePostDescription } from '@/app/[locale]/writing/[slug]/page';

// QA I4: none of the non-home routes set their own `description`/`openGraph`,
// so every one of them silently inherited layout.tsx's site-root metadata
// verbatim (Next's mergeMetadata replaces `openGraph`/`twitter` wholesale
// only when a segment's own generateMetadata returns that key at all -- see
// node_modules/next/dist/lib/metadata/resolve-metadata.js). These tests pin
// the fix at three levels: the two listing routes' generateMetadata (real
// per-locale copy, distinct from the home description), the post route's
// generateMetadata wired end to end against a mocked '@/lib/content', and
// `derivePostDescription` itself in isolation -- including the two
// defensive cases the task calls out explicitly: a post with no paragraph
// block, and a post/route with zero content at all.

const locales: Locale[] = ['en', 'th'];
const p = (locale: Locale) => ({ params: Promise.resolve({ locale }) });

// The literal homepage descriptions (src/app/[locale]/layout.tsx, pinned
// again in tests/smoke.test.tsx) -- the exact strings I4 reported every
// other route was serving verbatim.
const HOME_DESCRIPTION: Record<Locale, string> = {
  en: 'Suwichak "Klao" Jarunopratamp — business developer who builds his own tools. BD × Data Analytics, Bangkok.',
  th: 'สุวิจักขณ์ "เกลา" — นัก Business Development ที่สร้างเครื่องมือใช้เอง BD × Data Analytics กรุงเทพฯ',
};

const hasThai = (s: string) => /[฀-๿]/.test(s);

type OgImg = { url: string; alt: string; width: number; height: number };

describe('QA I4: projects/page.tsx sets its own description and share card', () => {
  it('description is non-empty, differs from the homepage in both locales, and is in the right language', async () => {
    for (const locale of locales) {
      const meta = await projectsMetadata(p(locale));
      expect(meta.description, `locale=${locale}`).toBeTruthy();
      expect(meta.description).not.toBe(HOME_DESCRIPTION.en);
      expect(meta.description).not.toBe(HOME_DESCRIPTION.th);
      expect(hasThai(meta.description!)).toBe(locale === 'th');
    }
  });

  it('describes the actual projects listing, not generic site copy', async () => {
    const enMeta = await projectsMetadata(p('en'));
    expect(enMeta.description!.toLowerCase()).toContain('project');
  });

  it('openGraph/twitter mirror the description and carry a locale-correct share image (replacing, not merging with, the layout default)', async () => {
    for (const locale of locales) {
      const meta = await projectsMetadata(p(locale));
      expect(meta.openGraph?.description).toBe(meta.description);
      expect(meta.openGraph?.title).not.toBe('Klao — Suwichak Jarunopratamp'); // the home OG title
      const og = (meta.openGraph?.images as OgImg[])[0];
      expect(og.url).toBe(`/og/og-${locale}.png`);
      expect(og.width).toBe(1200);
      expect(og.height).toBe(630);
      const tw = meta.twitter as { card?: string; description?: string; images?: OgImg[] };
      expect(tw.card).toBe('summary_large_image');
      expect(tw.description).toBe(meta.description);
      expect(tw.images?.[0].url).toBe(`/og/og-${locale}.png`);
    }
  });

  it('keeps the pre-existing title/canonical behavior, and still emits no per-page hreflang', async () => {
    for (const locale of locales) {
      const meta = await projectsMetadata(p(locale));
      expect(meta.title).toBe(dict[locale].projects);
      expect(meta.alternates?.canonical).toBe(`${SITE_URL}/${locale}/projects`);
      // hreflang lives in sitemap.ts only -- see layout.tsx's comment on the
      // same rule. A page-level `alternates.languages` here would be a
      // regression of that deliberate decision.
      expect(meta.alternates?.languages).toBeUndefined();
    }
  });
});

describe('QA I4: writing/page.tsx sets its own description and share card', () => {
  it('description differs from the homepage AND from projects/page.tsx, and is in the right language', async () => {
    for (const locale of locales) {
      const meta = await writingMetadata(p(locale));
      const projMeta = await projectsMetadata(p(locale));
      expect(meta.description).toBeTruthy();
      expect(meta.description).not.toBe(HOME_DESCRIPTION.en);
      expect(meta.description).not.toBe(HOME_DESCRIPTION.th);
      expect(meta.description).not.toBe(projMeta.description);
      expect(hasThai(meta.description!)).toBe(locale === 'th');
    }
  });

  it('openGraph mirrors the description and carries a locale-correct share image', async () => {
    for (const locale of locales) {
      const meta = await writingMetadata(p(locale));
      expect(meta.openGraph?.description).toBe(meta.description);
      const og = (meta.openGraph?.images as OgImg[])[0];
      expect(og.url).toBe(`/og/og-${locale}.png`);
    }
  });

  it('keeps the pre-existing title/canonical behavior', async () => {
    for (const locale of locales) {
      const meta = await writingMetadata(p(locale));
      expect(meta.title).toBe(dict[locale].writing);
      expect(meta.alternates?.canonical).toBe(`${SITE_URL}/${locale}/writing`);
    }
  });
});

// --- derivePostDescription: pure-function coverage ------------------------
// No mocking needed -- this is a plain function of (Post, Locale) defined
// directly in writing/[slug]/page.tsx, exported for exactly this reason.

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 'test-post',
    slug: 'test-post',
    title: { en: 'Test post title', th: 'ชื่อโพสต์ทดสอบ' },
    date: '2026-08-01',
    tags: [],
    body: { en: [], th: [] },
    ...overrides,
  };
}

const paragraph = (text: string): ContentBlock => ({ type: 'paragraph', spans: [{ text }] });
const heading = (text: string): ContentBlock => ({ type: 'heading', level: 2, text });

// Verifies `prefix` is exactly the concatenation of some number of leading
// Intl.Segmenter word-tokens of `original` -- i.e. a real word boundary, not
// a slice landing mid-token. Works for both locales: English tokens include
// the spaces between words, Thai tokens are the words themselves (Thai
// prose has no spaces to split on at all), so this one check catches a
// mid-word cut in either script without assuming English's space-delimited
// shape.
function isWordBoundaryPrefix(original: string, prefix: string, locale: Locale): boolean {
  const segmenter = new Intl.Segmenter(locale === 'th' ? 'th' : 'en', { granularity: 'word' });
  let acc = '';
  for (const { segment } of segmenter.segment(original)) {
    if (acc === prefix) return true;
    acc += segment;
  }
  return acc === prefix;
}

describe('QA I4: derivePostDescription', () => {
  it("summarizes the post's own first paragraph, not boilerplate", () => {
    const text = 'This is the real opening paragraph of the post, describing what it is actually about.';
    const post = makePost({ body: { en: [paragraph(text)], th: [] } });
    expect(derivePostDescription(post, 'en').startsWith('This is the real opening paragraph')).toBe(true);
  });

  it('does not truncate a paragraph already under the length budget', () => {
    const text = 'Short paragraph.';
    const post = makePost({ body: { en: [paragraph(text)], th: [] } });
    expect(derivePostDescription(post, 'en')).toBe(text);
  });

  it('truncates a long EN paragraph at a real word boundary, never mid-word', () => {
    const words = Array.from({ length: 40 }, (_, i) => `word${i}`);
    const longText = words.join(' ');
    expect(longText.length).toBeGreaterThan(155); // sanity: truncation is actually exercised
    const post = makePost({ body: { en: [paragraph(longText)], th: [] } });
    const desc = derivePostDescription(post, 'en');
    expect(desc.length).toBeLessThanOrEqual(156); // 155-char budget + one ellipsis char
    expect(desc.endsWith('…')).toBe(true);
    expect(isWordBoundaryPrefix(longText, desc.slice(0, -1), 'en')).toBe(true);
  });

  it('truncates a long TH paragraph (no spaces between words, unlike English) at a real word boundary', () => {
    // Real Thai prose runs with no spaces between words -- a naive
    // slice(0, n), or a truncator that only knows how to split on spaces,
    // would silently cut mid-word here. This exact sentence is chosen (and
    // pinned by the sanity checks below) because its 155th character does
    // NOT happen to coincide with a word boundary -- a repeating/patterned
    // Thai fixture can accidentally make a naive char-slice indistinguishable
    // from a real word-boundary truncation, which would make this assertion
    // pass for the wrong reason.
    const longText =
      'งานพัฒนาธุรกิจสอนผมหลายอย่างเกี่ยวกับการสร้างโปรดักต์ให้ประสบความสำเร็จจริง ' +
      'เริ่มจากการฟังลูกค้าอย่างตั้งใจ แล้วค่อยๆ ทดลองทำสิ่งเล็กๆ ก่อนจะขยายให้ใหญ่ขึ้นเรื่อยๆ ' +
      'จนกลายเป็นระบบที่ใช้งานได้จริงในที่สุด และยังต้องปรับปรุงต่อไปเรื่อยๆ ไม่มีวันจบ';
    expect(longText.length).toBeGreaterThan(155);
    // Pin the "naive slice would NOT land on a boundary" premise itself --
    // if this ever goes false (e.g. the fixture text is edited later), the
    // test below would silently stop discriminating a naive slice(0, n)
    // truncator from a real word-boundary one, the same way the original
    // repeat-based fixture did by coincidence.
    expect(isWordBoundaryPrefix(longText, longText.slice(0, 155), 'th')).toBe(false);
    const post = makePost({ body: { en: [], th: [paragraph(longText)] } });
    const desc = derivePostDescription(post, 'th');
    expect(desc.endsWith('…')).toBe(true);
    expect(isWordBoundaryPrefix(longText, desc.slice(0, -1), 'th')).toBe(true);
  });

  it('falls back to a locale-correct generic description when the body has blocks but no paragraph at all', () => {
    const post = makePost({ body: { en: [heading('Just a heading')], th: [heading('แค่หัวข้อ')] } });
    const enDesc = derivePostDescription(post, 'en');
    const thDesc = derivePostDescription(post, 'th');
    expect(enDesc.length).toBeGreaterThan(0);
    expect(thDesc.length).toBeGreaterThan(0);
    expect(hasThai(enDesc)).toBe(false);
    expect(hasThai(thDesc)).toBe(true);
    expect(enDesc).not.toBe(thDesc);
  });

  it('falls back to a locale-correct generic description when the body is empty in BOTH locales (the zero-content case)', () => {
    // The exact scenario the task calls out: another agent may empty
    // posts.json to `[]` this wave (both current posts are placeholders),
    // and even a single surviving post could legitimately have no body yet.
    const post = makePost({ body: { en: [], th: [] } });
    const enDesc = derivePostDescription(post, 'en');
    const thDesc = derivePostDescription(post, 'th');
    expect(enDesc.length).toBeGreaterThan(0);
    expect(thDesc.length).toBeGreaterThan(0);
    expect(hasThai(enDesc)).toBe(false);
    expect(hasThai(thDesc)).toBe(true);
  });

  it("an empty TH body falls back to the EN paragraph, mirroring PostPage's own body-resolution fallback, instead of the generic TH fallback string", () => {
    const text = 'English paragraph used because the Thai body is empty for this post.';
    const post = makePost({ body: { en: [paragraph(text)], th: [] } });
    const thDesc = derivePostDescription(post, 'th');
    expect(thDesc.startsWith('English paragraph used')).toBe(true);
  });
});

// --- writing/[slug]/page.tsx generateMetadata: end-to-end, zero-post case -
// Mocks '@/lib/content' so this file's coverage of the "posts.json emptied
// to []" scenario does not depend on the real fixture's current contents --
// deliberate, since another agent may be editing that fixture this same
// wave. Mirrors tests/career-resume.test.tsx's established pattern exactly:
// mock only the two functions this route touches, keep everything else real
// via importOriginal, read mutable outer variables at call time (no
// vi.resetModules() needed), and import the page module dynamically inside
// each test so the mock is guaranteed in place first.

let mockPosts: PostMeta[] = [];
let mockPostBySlug: Record<string, Post | null> = {};

vi.mock('@/lib/content', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/content')>();
  return {
    ...actual,
    getPosts: async () => mockPosts,
    getPost: async (slug: string) => mockPostBySlug[slug] ?? null,
  };
});

describe('QA I4: writing/[slug]/page.tsx generateMetadata, wired end to end', () => {
  it('404s (via next/navigation notFound), not a crash, when getPosts() returns [] -- the zero-post case', async () => {
    mockPosts = [];
    mockPostBySlug = {};
    const { generateMetadata: postMetadata } = await import('@/app/[locale]/writing/[slug]/page');

    let thrown: unknown;
    try {
      await postMetadata({ params: Promise.resolve({ locale: 'en' as Locale, slug: 'anything' }) });
    } catch (e) {
      thrown = e;
    }
    expect(thrown, 'expected generateMetadata to notFound() rather than throw/return something else').toBeInstanceOf(
      Error,
    );
    expect((thrown as Error & { digest?: string }).digest).toContain('404');
  });

  it("a real post's generateMetadata description matches derivePostDescription's own output and lands in openGraph/twitter as an 'article'", async () => {
    const text = 'Full end-to-end description derivation check for a single mocked post.';
    const testPost: Post = {
      id: 'p1',
      slug: 'p1',
      title: { en: 'P1 title', th: 'ชื่อ P1' },
      date: '2026-08-01',
      tags: [],
      body: { en: [paragraph(text)], th: [] },
    };
    mockPosts = [
      { id: testPost.id, slug: testPost.slug, title: testPost.title, date: testPost.date, tags: testPost.tags },
    ];
    mockPostBySlug = { p1: testPost };
    const { generateMetadata: postMetadata } = await import('@/app/[locale]/writing/[slug]/page');

    const meta = await postMetadata({ params: Promise.resolve({ locale: 'en' as Locale, slug: 'p1' }) });
    expect(meta.description).toBe(derivePostDescription(testPost, 'en'));
    expect(meta.description).toContain('Full end-to-end description');
    expect(meta.openGraph?.description).toBe(meta.description);
    const og = meta.openGraph as { type?: string; publishedTime?: string };
    expect(og.type).toBe('article');
    expect(og.publishedTime).toBe('2026-08-01T00:00:00.000Z');
  });

  it('a post with an empty body still gets a locale-correct, non-crashing description through generateMetadata', async () => {
    const emptyPost: Post = {
      id: 'p2',
      slug: 'p2',
      title: { en: 'P2 title', th: 'ชื่อ P2' },
      date: '2026-08-02',
      tags: [],
      body: { en: [], th: [] },
    };
    mockPosts = [
      { id: emptyPost.id, slug: emptyPost.slug, title: emptyPost.title, date: emptyPost.date, tags: emptyPost.tags },
    ];
    mockPostBySlug = { p2: emptyPost };
    const { generateMetadata: postMetadata } = await import('@/app/[locale]/writing/[slug]/page');

    for (const locale of locales) {
      const meta = await postMetadata({ params: Promise.resolve({ locale, slug: 'p2' }) });
      expect(meta.description).toBeTruthy();
      expect(hasThai(meta.description as string)).toBe(locale === 'th');
    }
  });
});
