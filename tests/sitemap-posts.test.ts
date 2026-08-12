import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import PostPage, { generateMetadata as postMetadata } from '@/app/[locale]/writing/[slug]/page';
import sitemap from '@/app/sitemap';
import { SITE_URL } from '@/lib/site';
import type { Locale, Post, PostMeta } from '@/lib/models';

// Split out of tests/smoke.test.tsx, which is a REAL-fixture smoke test --
// src/content/fixtures/posts.json holds the owner's actual (currently empty)
// draft content, and four tests there used to reach into it for post data.
// That coupled coverage of real routing logic (sitemap hreflang reciprocity,
// lastModified, per-post metadata/canonical, post-page rendering) to whether
// the owner happens to have any drafts published, so emptying posts.json to
// `[]` (both former entries were placeholder stubs rendering to real
// visitors) silently deleted the coverage along with the placeholders. None
// of that logic is about what he writes -- it only needs *some* posts to
// exercise, so this file supplies its own synthetic ones and mocks
// '@/lib/content' (vi.mock is hoisted and file-wide, which is exactly why
// this lives in its own file rather than smoke.test.tsx: every other
// assertion in that file must keep running against the real fixture).
// `importOriginal` swaps out only `getPosts`/`getPost` -- every other
// content function (getProjects, getCareer, getProfile, ...) stays wired to
// the real fixtures, same pattern as tests/route-metadata.test.ts and
// tests/career-resume.test.tsx.

const synthPosts: Post[] = [
  {
    id: 'synth-post-1',
    slug: 'synthetic-post-one',
    title: { en: 'Synthetic Post One', th: 'บทความสังเคราะห์หนึ่ง' },
    date: '2026-01-10',
    tags: ['synthetic'],
    body: {
      en: [{ type: 'paragraph', spans: [{ text: 'Body text for synthetic post one.' }] }],
      th: [{ type: 'paragraph', spans: [{ text: 'เนื้อหาของบทความสังเคราะห์หนึ่ง' }] }],
    },
  },
  {
    id: 'synth-post-2',
    slug: 'synthetic-post-two',
    title: { en: 'Synthetic Post Two', th: 'บทความสังเคราะห์สอง' },
    date: '2026-03-22',
    tags: ['synthetic'],
    body: {
      en: [{ type: 'paragraph', spans: [{ text: 'Body text for synthetic post two.' }] }],
      th: [{ type: 'paragraph', spans: [{ text: 'เนื้อหาของบทความสังเคราะห์สอง' }] }],
    },
  },
];

const synthPostMetas: PostMeta[] = synthPosts.map(({ id, slug, title, date, tags }) => ({
  id,
  slug,
  title,
  date,
  tags,
}));

vi.mock('@/lib/content', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/content')>();
  return {
    ...actual,
    getPosts: async () => synthPostMetas,
    getPost: async (slug: string) => synthPosts.find((p) => p.slug === slug) ?? null,
  };
});

const locales: Locale[] = ['en', 'th'];
const p = (locale: Locale, slug: string) => ({ params: Promise.resolve({ locale, slug }) });

// Same real-render helper as smoke.test.tsx (see that file's comment for why
// a real renderToStaticMarkup pass is used instead of walking the element
// tree by hand).
function collectText(node: ReactElement): string {
  return renderToStaticMarkup(node)
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

describe('post routing logic (synthetic fixtures, decoupled from src/content/fixtures/posts.json)', () => {
  it('renders a post page with the post\'s own title', async () => {
    const jsx = await PostPage(p('en', synthPosts[0].slug));
    expect(jsx).toBeTruthy();
    expect(collectText(jsx)).toContain(synthPosts[0].title.en);
  });

  it('sitemap lists both locales and post slugs', async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls.some((u) => u.includes(`/en/writing/${synthPosts[0].slug}`))).toBe(true);
    // '/career' redirects to the home anchor as of Task 8 and no longer
    // appears in the sitemap (see 'omits redirected legacy routes' below) --
    // '/th/writing' still stands in for "both locales are present".
    expect(urls.some((u) => u.includes('/th/writing'))).toBe(true);
  });

  it('omits redirected legacy routes', async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls.some((u) => u.endsWith('/projects'))).toBe(false);
    expect(urls.some((u) => u.endsWith('/career'))).toBe(false);
  });

  it('sitemap emits reciprocal per-URL hreflang with x-default, and lastModified on post entries only', async () => {
    // Task 10 review Important #2: the old hreflang was a single static
    // `{ en: '/en', th: '/th' }' map emitted on every page from layout.tsx,
    // so e.g. a post's "th" alternate pointed at the Thai *home* page, not
    // the Thai post -- non-reciprocal on 10 of 12 URLs. Each sitemap entry
    // now carries its own page's alternates, so this asserts both members
    // of a pair actually point at each other for the SAME page.
    const entries = await sitemap();

    const enHome = entries.find((e) => e.url === `${SITE_URL}/en`)!;
    const thHome = entries.find((e) => e.url === `${SITE_URL}/th`)!;
    const expectedHomeLanguages = {
      en: `${SITE_URL}/en`,
      th: `${SITE_URL}/th`,
      'x-default': `${SITE_URL}/en`,
    };
    expect(enHome.alternates?.languages).toEqual(expectedHomeLanguages);
    expect(thHome.alternates?.languages).toEqual(expectedHomeLanguages);
    // Reciprocal by construction (both read from the same map), but assert
    // it explicitly: the EN entry's own "th" alternate literally is the TH
    // entry's own URL, and vice versa.
    expect((enHome.alternates!.languages as Record<string, string>).th).toBe(thHome.url);
    expect((thHome.alternates!.languages as Record<string, string>).en).toBe(enHome.url);

    // The exact bug from the review: a post's hreflang must point at the
    // matching post in the other locale, NOT at that locale's home page.
    const post = synthPosts[0];
    const enPost = entries.find((e) => e.url === `${SITE_URL}/en/writing/${post.slug}`)!;
    const thPost = entries.find((e) => e.url === `${SITE_URL}/th/writing/${post.slug}`)!;
    const expectedPostLanguages = {
      en: `${SITE_URL}/en/writing/${post.slug}`,
      th: `${SITE_URL}/th/writing/${post.slug}`,
      'x-default': `${SITE_URL}/en/writing/${post.slug}`,
    };
    expect(enPost.alternates?.languages).toEqual(expectedPostLanguages);
    expect((enPost.alternates!.languages as Record<string, string>).th).not.toBe(thHome.url);
    expect((enPost.alternates!.languages as Record<string, string>).th).toBe(thPost.url);

    // lastModified: a real signal Google uses, set from the post's own
    // date for post entries, and deliberately absent on static pages
    // (which have no equivalent source -- not faked).
    expect(enPost.lastModified).toBe(post.date);
    expect(enHome.lastModified).toBeUndefined();
  });

  it('a post page sets its own post title (distinct per post and locale) and self-referential canonical', async () => {
    for (const post of synthPosts) {
      for (const locale of locales) {
        const meta = await postMetadata(p(locale, post.slug));
        expect(meta.title).toBe(post.title[locale]);
        expect(meta.alternates?.canonical).toBe(`${SITE_URL}/${locale}/writing/${post.slug}`);
      }
    }

    // Distinct titles between the two synthetic posts -- proves this reads
    // the post's own title rather than a shared constant that happens to
    // pass a single-post check.
    expect(synthPosts[0].title.en).not.toBe(synthPosts[1].title.en);
    const meta0 = await postMetadata(p('en', synthPosts[0].slug));
    const meta1 = await postMetadata(p('en', synthPosts[1].slug));
    expect(meta0.title).not.toBe(meta1.title);
  });
});
