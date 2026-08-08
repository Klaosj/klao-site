import { describe, it, expect } from 'vitest';
import HomePage from '@/app/[locale]/page';
import ProjectsPage, { generateMetadata as projectsMetadata } from '@/app/[locale]/projects/page';
import WritingPage, { generateMetadata as writingMetadata } from '@/app/[locale]/writing/page';
import CareerPage, { generateMetadata as careerMetadata } from '@/app/[locale]/career/page';
import PostPage, { generateMetadata as postMetadata } from '@/app/[locale]/writing/[slug]/page';
import sitemap from '@/app/sitemap';
import robots from '@/app/robots';
import { generateMetadata } from '@/app/[locale]/layout';
import { getPosts } from '@/lib/content';
import { dict } from '@/lib/dictionary';
import { SITE_URL } from '@/lib/site';
import type { Locale } from '@/lib/models';

const locales: Locale[] = ['en', 'th'];
const p = (locale: Locale) => ({ params: Promise.resolve({ locale }) });

// Minimal React-element-tree walker. This project has no jsdom/DOM renderer
// (see vitest.config.ts: environment: 'node'), but a page component's return
// value is still a plain React element graph -- host elements (lowercase
// tags) are built eagerly by JSX, so their string children are inspectable
// without a renderer. Elements whose type is another component (capitalized,
// e.g. ProjectCard) are NOT expanded by this walker; that's fine here since
// every assertion below targets text embedded directly in the page shell.
type El = { type: unknown; props?: { children?: unknown } };
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

describe('smoke: pages render in both locales (fixture mode)', () => {
  it('renders the four static pages', async () => {
    for (const locale of locales) {
      expect(await HomePage(p(locale))).toBeTruthy();
      expect(await ProjectsPage(p(locale))).toBeTruthy();
      expect(await WritingPage(p(locale))).toBeTruthy();
      expect(await CareerPage(p(locale))).toBeTruthy();
    }
  });

  it('renders locale-correct heading text on each static page, not just a truthy tree', async () => {
    // toBeTruthy() above passes for any non-null return, including a broken
    // render. These assertions check real, locale-specific text landed in
    // the tree.
    for (const locale of locales) {
      const t = dict[locale];
      const home = await HomePage(p(locale));
      expect(collectText(home)).toContain(t.selectedProjects);
      expect(collectText(home)).toContain(t.latestWriting);

      const projects = await ProjectsPage(p(locale));
      expect(collectText(projects)).toContain(t.projects);

      const writing = await WritingPage(p(locale));
      expect(collectText(writing)).toContain(t.writing);

      const career = await CareerPage(p(locale));
      expect(collectText(career)).toContain(t.career);
    }
  });

  it('renders a post page', async () => {
    const jsx = await PostPage({
      params: Promise.resolve({ locale: 'en' as Locale, slug: 'building-gonai-in-a-weekend' }),
    });
    expect(jsx).toBeTruthy();
    // Real content check: the post's actual EN title text is present, not
    // just an arbitrary truthy tree.
    expect(collectText(jsx)).toContain('Building GoNai in a weekend');
  });

  it('sitemap lists both locales and post slugs', async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls.some((u) => u.includes('/en/writing/building-gonai-in-a-weekend'))).toBe(true);
    expect(urls.some((u) => u.includes('/th/career'))).toBe(true);
  });

  it('sitemap lists every static page in both locales plus every post slug, and nothing else', async () => {
    const [entries, posts] = await Promise.all([sitemap(), getPosts()]);
    const urls = entries.map((e) => e.url);
    const staticPaths = ['', '/projects', '/writing', '/career'];
    for (const locale of locales) {
      for (const path of staticPaths) {
        expect(urls).toContain(`${SITE_URL}/${locale}${path}`);
      }
      for (const post of posts) {
        expect(urls).toContain(`${SITE_URL}/${locale}/writing/${post.slug}`);
      }
    }
    // Exact count -- catches both dropped entries and accidental duplicates.
    expect(urls.length).toBe(locales.length * (staticPaths.length + posts.length));
  });

  it('sitemap emits reciprocal per-URL hreflang with x-default, and lastModified on post entries only', async () => {
    // Task 10 review Important #2: the old hreflang was a single static
    // `{ en: '/en', th: '/th' }' map emitted on every page from layout.tsx,
    // so e.g. a post's "th" alternate pointed at the Thai *home* page, not
    // the Thai post -- non-reciprocal on 10 of 12 URLs. Each sitemap entry
    // now carries its own page's alternates, so this asserts both members
    // of a pair actually point at each other for the SAME page.
    const [entries, posts] = await Promise.all([sitemap(), getPosts()]);

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
    const post = posts[0];
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

  it('robots allows crawling and points at the real sitemap URL', () => {
    const result = robots();
    expect(result.rules).toEqual({ userAgent: '*', allow: '/' });
    expect(result.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });

  it('layout generateMetadata returns per-locale title/description and a self-referential site-root canonical', async () => {
    const enMeta = await generateMetadata(p('en'));
    const thMeta = await generateMetadata(p('th'));

    // Literal, exact content -- not just "the two differ" (which a
    // description swapped between locales would also satisfy).
    expect(enMeta.description).toBe(
      'Suwichak "Klao" Jarunopratamp — business developer who builds his own tools. BD × Data Analytics, Bangkok.',
    );
    expect(thMeta.description).toBe(
      'สุวิจักขณ์ "เกลา" — นัก Business Development ที่สร้างเครื่องมือใช้เอง BD × Data Analytics กรุงเทพฯ',
    );
    // title was never asserted at all before -- a stale/dead `template`
    // string here would have passed silently.
    expect(enMeta.title).toEqual({ default: 'Klao — Suwichak Jarunopratamp', template: '%s · Klao' });
    expect(thMeta.title).toEqual({ default: 'Klao — Suwichak Jarunopratamp', template: '%s · Klao' });

    // metadataBase is the real site origin -- what Next resolves relative
    // canonical/OG URLs against.
    expect(enMeta.metadataBase?.toString()).toBe(`${SITE_URL}/`);
    expect(thMeta.metadataBase?.toString()).toBe(`${SITE_URL}/`);

    // Self-referential canonical for the site root of THIS locale -- the
    // default every non-overriding route (i.e. the home page) inherits.
    expect(enMeta.alternates?.canonical).toBe(`${SITE_URL}/en`);
    expect(thMeta.alternates?.canonical).toBe(`${SITE_URL}/th`);

    expect(enMeta.openGraph?.locale).toBe('en_US');
    expect(thMeta.openGraph?.locale).toBe('th_TH');
  });

  it('projects/writing/career pages set their own locale-correct title and self-referential canonical', async () => {
    // Task 10 review Important #3: before this, every one of the 12 sitemap
    // URLs shared the layout's single default title.
    const cases: Array<[typeof projectsMetadata, 'projects' | 'writing' | 'career', string]> = [
      [projectsMetadata, 'projects', '/projects'],
      [writingMetadata, 'writing', '/writing'],
      [careerMetadata, 'career', '/career'],
    ];
    for (const [generate, key, path] of cases) {
      for (const locale of locales) {
        const meta = await generate(p(locale));
        expect(meta.title).toBe(dict[locale][key]);
        expect(meta.alternates?.canonical).toBe(`${SITE_URL}/${locale}${path}`);
      }
    }
  });

  it('a post page sets its own post title (distinct per post and locale) and self-referential canonical', async () => {
    const posts = await getPosts();
    expect(posts.length).toBeGreaterThanOrEqual(2);

    for (const post of posts) {
      for (const locale of locales) {
        const meta = await postMetadata({ params: Promise.resolve({ locale, slug: post.slug }) });
        expect(meta.title).toBe(post.title[locale]);
        expect(meta.alternates?.canonical).toBe(`${SITE_URL}/${locale}/writing/${post.slug}`);
      }
    }

    // Distinct titles between the two fixture posts -- proves this reads
    // the post's own title rather than a shared constant that happens to
    // pass a single-post check.
    expect(posts[0].title.en).not.toBe(posts[1].title.en);
    const meta0 = await postMetadata({ params: Promise.resolve({ locale: 'en' as Locale, slug: posts[0].slug }) });
    const meta1 = await postMetadata({ params: Promise.resolve({ locale: 'en' as Locale, slug: posts[1].slug }) });
    expect(meta0.title).not.toBe(meta1.title);
  });
});
