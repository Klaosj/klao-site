import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import type { Locale, Project, ProjectStory } from '@/lib/models';
import { dict } from '@/lib/dictionary';
import { SITE_URL } from '@/lib/site';

// Wave 1 task 4: mirrors tests/route-metadata.test.ts's post-page
// generateMetadata section (the "writing/[slug]/page.tsx generateMetadata,
// wired end to end" describe block) and tests/sitemap-posts.test.ts's
// render-based technique for the body-fallback case -- same mocking shape
// (mock only the two content functions this route touches via
// importOriginal, read mutable outer variables at call time, import the
// page module dynamically inside each test) applied to
// getProjects/getProjectStory instead of getPosts/getPost.

const locales: Locale[] = ['en', 'th'];
const p = (locale: Locale, slug: string) => ({ params: Promise.resolve({ locale, slug }) });

// Same real-render helper as smoke.test.tsx/sitemap-posts.test.ts -- a real
// renderToStaticMarkup pass sees through PostBody's own text, not just
// props passed as `children`.
function collectText(node: ReactElement): string {
  return renderToStaticMarkup(node)
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

const baseProject: Omit<Project, 'id' | 'name' | 'question' | 'slug'> = {
  description: { en: 'EN desc', th: 'TH desc' },
  stack: ['Next.js', 'Supabase'],
  liveUrl: 'https://gonai.example.com',
  repoUrl: 'https://github.com/example/gonai',
  imageSrc: null,
  featured: true,
  order: 1,
  type: 'build',
  outcome: null,
};

const gonaiStory: ProjectStory = {
  ...baseProject,
  id: 'fx-gonai-test',
  name: 'GoNai',
  question: { en: 'How do I plan a one-day trip?', th: 'จะวางแผนเที่ยวหนึ่งวันยังไง?' },
  slug: 'gonai',
  body: {
    en: [{ type: 'paragraph', spans: [{ text: 'The EN build story paragraph.' }] }],
    th: [{ type: 'paragraph', spans: [{ text: 'ย่อหน้าเรื่องราวภาษาไทย' }] }],
  },
};

// No `question` -- title must fall back to `name`.
const noQuestionStory: ProjectStory = {
  ...baseProject,
  id: 'fx-noq-test',
  name: 'NoQuestion',
  question: null,
  slug: 'no-question',
  liveUrl: null,
  repoUrl: null,
  body: {
    en: [{ type: 'paragraph', spans: [{ text: 'Body for no-question project.' }] }],
    th: [],
  },
};

// Known slug (present in getProjects), but the story body is empty in BOTH
// locales -- the empty-body guard's exact trigger condition.
const emptyBodyStory: ProjectStory = {
  ...baseProject,
  id: 'fx-empty-test',
  name: 'EmptyBody',
  question: { en: 'Empty?', th: 'ว่างเปล่า?' },
  slug: 'empty-body',
  body: { en: [], th: [] },
};

// EN body has content, TH body is empty -- mirrors PostPage's own
// `post.body[locale].length ? post.body[locale] : post.body.en` fallback,
// which derivePostDescription/deriveBodyDescription already covers for
// `description`; this pins the same fallback for the rendered PostBody.
const thEmptyBodyStory: ProjectStory = {
  ...baseProject,
  id: 'fx-thempty-test',
  name: 'ThEmptyBody',
  question: { en: 'EN question', th: 'คำถามภาษาไทย' },
  slug: 'th-empty-body',
  body: {
    en: [{ type: 'paragraph', spans: [{ text: 'EN paragraph fallback content unique marker XYZ.' }] }],
    th: [],
  },
};

let mockProjects: Project[] = [];
let mockStoryBySlug: Record<string, ProjectStory | null> = {};

vi.mock('@/lib/content', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/content')>();
  return {
    ...actual,
    getProjects: async () => mockProjects,
    getProjectStory: async (slug: string) => mockStoryBySlug[slug] ?? null,
  };
});

describe('work/[slug] case-study route, wired end to end (mocked @/lib/content)', () => {
  it('404s (via next/navigation notFound), not a crash, for an unknown slug -- both generateMetadata and the page', async () => {
    mockProjects = [];
    mockStoryBySlug = {};
    const { generateMetadata: workMetadata, default: WorkStoryPage } = await import(
      '@/app/[locale]/work/[slug]/page'
    );

    let metaThrown: unknown;
    try {
      await workMetadata(p('en', 'anything'));
    } catch (e) {
      metaThrown = e;
    }
    expect(metaThrown, 'expected generateMetadata to notFound() rather than throw/return something else').toBeInstanceOf(
      Error,
    );
    expect((metaThrown as Error & { digest?: string }).digest).toContain('404');

    let pageThrown: unknown;
    try {
      await WorkStoryPage(p('en', 'anything'));
    } catch (e) {
      pageThrown = e;
    }
    expect(pageThrown, 'expected the page to notFound() rather than throw/return something else').toBeInstanceOf(
      Error,
    );
    expect((pageThrown as Error & { digest?: string }).digest).toContain('404');
  });

  it("a known slug's generateMetadata: title is question[locale] (falling back to name when question is null), self-referential canonical, OG type 'article'", async () => {
    mockProjects = [gonaiStory, noQuestionStory];
    mockStoryBySlug = { gonai: gonaiStory, 'no-question': noQuestionStory };
    const { generateMetadata: workMetadata } = await import('@/app/[locale]/work/[slug]/page');

    const meta = await workMetadata(p('en', 'gonai'));
    expect(meta.title).toBe(gonaiStory.question!.en);
    expect(meta.alternates?.canonical).toBe(`${SITE_URL}/en/work/gonai`);
    expect((meta.openGraph as { type?: string } | undefined)?.type).toBe('article');
    expect(meta.openGraph?.description).toBe(meta.description);

    const thMeta = await workMetadata(p('th', 'gonai'));
    expect(thMeta.title).toBe(gonaiStory.question!.th);
    expect(thMeta.alternates?.canonical).toBe(`${SITE_URL}/th/work/gonai`);

    // Falls back to `name` when question is null.
    const noQMeta = await workMetadata(p('en', 'no-question'));
    expect(noQMeta.title).toBe(noQuestionStory.name);
  });

  it('known slug, empty body in both locales: page calls notFound (the empty-body guard), and so does generateMetadata', async () => {
    mockProjects = [emptyBodyStory];
    mockStoryBySlug = { 'empty-body': emptyBodyStory };
    const { default: WorkStoryPage, generateMetadata: workMetadata } = await import(
      '@/app/[locale]/work/[slug]/page'
    );

    let pageThrown: unknown;
    try {
      await WorkStoryPage(p('en', 'empty-body'));
    } catch (e) {
      pageThrown = e;
    }
    expect(pageThrown).toBeInstanceOf(Error);
    expect((pageThrown as Error & { digest?: string }).digest).toContain('404');

    let metaThrown: unknown;
    try {
      await workMetadata(p('en', 'empty-body'));
    } catch (e) {
      metaThrown = e;
    }
    expect(metaThrown).toBeInstanceOf(Error);
    expect((metaThrown as Error & { digest?: string }).digest).toContain('404');
  });

  it('an empty TH body falls back to the EN blocks in the rendered PostBody, same technique as the post-page tests', async () => {
    mockProjects = [thEmptyBodyStory];
    mockStoryBySlug = { 'th-empty-body': thEmptyBodyStory };
    const { default: WorkStoryPage } = await import('@/app/[locale]/work/[slug]/page');

    const jsx = await WorkStoryPage(p('th', 'th-empty-body'));
    const text = collectText(jsx);
    expect(text).toContain('EN paragraph fallback content unique marker XYZ.');
    // The TH question still renders in the heading -- only the BODY falls
    // back to EN, not the whole page.
    expect(text).toContain(thEmptyBodyStory.question!.th);
  });

  it("renders the page's own title/eyebrow/back-link and a receipts footer with stack + gated live-site/view-code links", async () => {
    mockProjects = [gonaiStory];
    mockStoryBySlug = { gonai: gonaiStory };
    const { default: WorkStoryPage } = await import('@/app/[locale]/work/[slug]/page');

    for (const locale of locales) {
      const jsx = await WorkStoryPage(p(locale, 'gonai'));
      const text = collectText(jsx);
      expect(text).toContain(gonaiStory.question![locale]);
      expect(text).toContain(gonaiStory.name);
      expect(text).toContain(dict[locale].back);
      expect(text).toContain(gonaiStory.stack.join(' · '));
      expect(text).toContain(dict[locale].liveSite);
      expect(text).toContain(dict[locale].viewCode);
    }

    // A project with no liveUrl/repoUrl renders no such links at all.
    mockProjects = [noQuestionStory];
    mockStoryBySlug = { 'no-question': noQuestionStory };
    const { default: WorkStoryPageFresh } = await import('@/app/[locale]/work/[slug]/page');
    const jsxNoLinks = await WorkStoryPageFresh(p('en', 'no-question'));
    const textNoLinks = collectText(jsxNoLinks);
    expect(textNoLinks).not.toContain(dict.en.liveSite);
    expect(textNoLinks).not.toContain(dict.en.viewCode);
  });
});
