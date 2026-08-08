import { describe, it, expect } from 'vitest';
import HomePage from '@/app/[locale]/page';
import ProjectsPage from '@/app/[locale]/projects/page';
import WritingPage from '@/app/[locale]/writing/page';
import CareerPage from '@/app/[locale]/career/page';
import PostPage from '@/app/[locale]/writing/[slug]/page';
import sitemap from '@/app/sitemap';
import robots from '@/app/robots';
import { generateMetadata } from '@/app/[locale]/layout';
import { getPosts } from '@/lib/content';
import { dict } from '@/lib/dictionary';
import type { Locale } from '@/lib/models';

const locales: Locale[] = ['en', 'th'];
const p = (locale: Locale) => ({ params: Promise.resolve({ locale }) });

const SITE_URL = 'http://localhost:3000'; // matches the layout/sitemap/robots default (no NEXT_PUBLIC_SITE_URL in test env)

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

  it('robots allows crawling and points at the real sitemap URL', () => {
    const result = robots();
    expect(result.rules).toEqual({ userAgent: '*', allow: '/' });
    expect(result.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });

  it('generateMetadata returns per-locale title/description and hreflang alternates built from real, absolute URLs', async () => {
    const enMeta = await generateMetadata(p('en'));
    const thMeta = await generateMetadata(p('th'));

    // Per-locale description actually differs and is non-empty for both.
    expect(typeof enMeta.description).toBe('string');
    expect((enMeta.description as string).length).toBeGreaterThan(0);
    expect(enMeta.description).not.toBe(thMeta.description);

    // metadataBase is the real site origin -- this is what Next resolves the
    // relative `alternates.languages` paths against to produce the final
    // absolute hreflang <link> tags at request time.
    expect(enMeta.metadataBase?.toString()).toBe(`${SITE_URL}/`);
    expect(thMeta.metadataBase?.toString()).toBe(`${SITE_URL}/`);

    // Both locales are present and point at distinct, real (non-empty,
    // locale-prefixed) paths -- not e.g. both pointing at '/' or one missing.
    for (const meta of [enMeta, thMeta]) {
      const languages = meta.alternates?.languages as Record<string, string> | undefined;
      expect(languages).toEqual({ en: '/en', th: '/th' });
      expect(new URL(languages!.en, meta.metadataBase!).toString()).toBe(`${SITE_URL}/en`);
      expect(new URL(languages!.th, meta.metadataBase!).toString()).toBe(`${SITE_URL}/th`);
    }

    expect(enMeta.openGraph?.locale).toBe('en_US');
    expect(thMeta.openGraph?.locale).toBe('th_TH');
  });
});
