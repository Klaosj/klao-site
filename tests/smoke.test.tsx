import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import HomePage from '@/app/[locale]/page';
import ProjectsPage, { generateMetadata as projectsMetadata } from '@/app/[locale]/projects/page';
import WritingPage, { generateMetadata as writingMetadata } from '@/app/[locale]/writing/page';
import CareerPage, { generateMetadata as careerMetadata } from '@/app/[locale]/career/page';
import sitemap from '@/app/sitemap';
import robots from '@/app/robots';
import { generateMetadata } from '@/app/[locale]/layout';
import { getPosts } from '@/lib/content';
import { dict } from '@/lib/dictionary';
import { SITE_URL } from '@/lib/site';
import type { Locale } from '@/lib/models';

const locales: Locale[] = ['en', 'th'];
const p = (locale: Locale) => ({ params: Promise.resolve({ locale }) });

// Renders a page's element tree to real HTML via ReactDOMServer and returns
// the entity-decoded text. This replaces an earlier raw-element-tree walker
// that only read a JSX descriptor's own `.props.children` -- which worked
// for e.g. `<Link href="...">{t.back}</Link>` (text passed literally as
// `children`) but could never see anything rendered *inside* a capitalized
// component that takes its text via a named prop instead of `children`
// (Hero's `profile.headline`, WorkDeck's `project.name`, CvBand's stats --
// none of them pass `children`). A real render, by contrast, actually calls
// every component function the way React would, so it sees straight through
// Hero/AboutBand/CraftBand/WorkDeck/CvBand/ContactBand -- this project's
// home route composes nothing else. renderToStaticMarkup never runs
// useEffect (only the render-phase function body), so the 'use client'
// hook-using descendants it also passes through -- Reveal, MaskedHeading,
// CopyEmail, ParticleField, next/link's Link -- render their initial
// synchronous markup without needing jsdom, matchMedia, or
// IntersectionObserver stubs (verified empirically: no such stub is set up
// anywhere in this file, and the suite is green).
//
// One consequence worth flagging for future assertions here: MaskedHeading
// splits its `text` prop into one <span> per word, so a multi-word heading
// (e.g. t.aboutHeading) is NOT a contiguous substring of the rendered HTML
// -- each word is separated by closing/opening span tags. Assertions below
// stick to plain, unsplit text (eyebrow labels, profile prose, list items)
// for exactly this reason.
function collectText(node: ReactElement): string {
  return renderToStaticMarkup(node)
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
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
      const other = dict[locale === 'en' ? 'th' : 'en'];
      const home = await HomePage(p(locale));
      const homeText = collectText(home);
      // The redesigned home route has no writing section at all (spec's
      // page structure is Hero/About/Craft/Work/CV/Contact) -- the old
      // dict.selectedProjects/dict.latestWriting assertions here had
      // nowhere to land and were deleted, not weakened. These four replace
      // them with text that is genuinely rendered by the new page, one
      // string per band composed in page.tsx, none of it routed through
      // MaskedHeading (see the collectText comment above for why that
      // matters here).
      expect(homeText).toContain(t.selectedProjects); // WorkDeck's eyebrow
      expect(homeText).toContain(t.career); // CvBand's eyebrow
      // Render only the active locale -- the other language's equivalent
      // eyebrow labels must be entirely absent from the assembled page.
      expect(homeText).not.toContain(other.selectedProjects);
      expect(homeText).not.toContain(other.career);

      const projects = await ProjectsPage(p(locale));
      expect(collectText(projects)).toContain(t.projects);

      const writing = await WritingPage(p(locale));
      expect(collectText(writing)).toContain(t.writing);

      const career = await CareerPage(p(locale));
      expect(collectText(career)).toContain(t.career);
    }
  });

  it('tells the visitor the writing index is empty instead of rendering a bare list', async () => {
    // Runs against the REAL fixtures, which is the point: posts.json is []
    // after the two placeholder stubs were pulled, so this asserts what a
    // visitor actually sees today. If the owner publishes a real post the
    // guard flips to the populated branch rather than going stale.
    const posts = await getPosts();
    for (const locale of ['en', 'th'] as const) {
      const text = collectText(await WritingPage(p(locale)));
      if (posts.length === 0) {
        expect(text).toContain(dict[locale].writingUnpublished);
        expect(text).not.toContain(dict[locale === 'en' ? 'th' : 'en'].writingUnpublished);
      } else {
        expect(text).not.toContain(dict[locale].writingUnpublished);
      }
    }
  });

  // 'renders a post page' and 'sitemap lists both locales and post slugs'
  // moved to tests/sitemap-posts.test.ts: both hardcoded the real fixture's
  // 'building-gonai-in-a-weekend' slug/title, coupling coverage of routing
  // logic to the owner's real draft content (now emptied to `[]`). See that
  // file's header comment for the full rationale.

  it('sitemap lists every static page in both locales plus every post slug, and nothing else', async () => {
    const [entries, posts] = await Promise.all([sitemap(), getPosts()]);
    const urls = entries.map((e) => e.url);
    // '/projects' and '/career' redirect to home anchors (next.config.ts) as
    // of Task 8 -- a sitemap must not list URLs that answer 3xx, so they're
    // dropped here too. See tests/sitemap-posts.test.ts's
    // 'omits redirected legacy routes' for the negative assertion.
    const staticPaths = ['', '/writing'];
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

  // 'sitemap emits reciprocal per-URL hreflang with x-default, and
  // lastModified on post entries only' moved to tests/sitemap-posts.test.ts:
  // it indexed posts[0], which is undefined now that the fixture is `[]`.
  // See that file's header comment for the full rationale.

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

    // Task 10 re-review item 3: nothing previously pinned that the layout
    // does NOT emit a static site-root `alternates.languages` map. Without
    // this, re-adding `{ en: '/en', th: '/th' }' here would resurrect the
    // original hreflang bug (non-reciprocal on 10 of 12 URLs, since every
    // page would inherit this one unchanged) with the whole suite green --
    // sitemap.ts's own per-URL languages test doesn't touch the layout at
    // all, so it can't catch a regression here.
    expect(enMeta.alternates?.languages).toBeUndefined();
    expect(thMeta.alternates?.languages).toBeUndefined();

    expect(enMeta.openGraph?.locale).toBe('en_US');
    expect(thMeta.openGraph?.locale).toBe('th_TH');
  });

  it('layout emits a locale-correct share card for both OpenGraph and Twitter', async () => {
    // Without these, link previews are text-only.
    const enMeta = await generateMetadata(p('en'));
    const thMeta = await generateMetadata(p('th'));

    type OgImg = { url: string; alt: string; width: number; height: number };
    const enOg = (enMeta.openGraph?.images as OgImg[])[0];
    const thOg = (thMeta.openGraph?.images as OgImg[])[0];

    // Locale-correct, not one shared card: swapping the two would ship a Thai
    // preview on English links -- the class of bug this project already
    // shipped twice with a hardcoded label.
    expect(enOg.url).toBe('/og/og-en.png');
    expect(thOg.url).toBe('/og/og-th.png');

    // Relative, so it resolves against metadataBase and follows
    // NEXT_PUBLIC_SITE_URL rather than pinning a domain into the markup.
    expect(enOg.url.startsWith('/')).toBe(true);

    // Facebook/LinkedIn need explicit dimensions to render a large card on
    // first scrape, before they have fetched the image.
    expect(enOg.width).toBe(1200);
    expect(enOg.height).toBe(630);

    // Alt text must actually differ per locale, not merely be present.
    expect(enOg.alt).not.toBe(thOg.alt);
    expect(thOg.alt).toContain('นัก Business Development');

    // summary_large_image is what makes X render the full card instead of a
    // small thumbnail strip; dropping it silently downgrades every share.
    // Next's `Twitter` type is a union whose base member has no `card`, so
    // the read is narrowed here rather than at the metadata source.
    const enTw = enMeta.twitter as { card?: string; images?: OgImg[] };
    const thTw = thMeta.twitter as { card?: string; images?: OgImg[] };
    expect(enTw.card).toBe('summary_large_image');
    expect(enTw.images?.[0].url).toBe('/og/og-en.png');
    expect(thTw.images?.[0].url).toBe('/og/og-th.png');
  });

  it('both share-card PNGs exist on disk at exactly 1200x630', async () => {
    // The test above asserts the URLs; this asserts the files those URLs
    // point at are actually shipped. Deleting a PNG would otherwise leave a
    // green suite and a broken preview on every shared link.
    const { statSync, readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    for (const locale of ['en', 'th']) {
      const file = join(process.cwd(), 'public', 'og', `og-${locale}.png`);
      expect(statSync(file).size).toBeGreaterThan(1024);
      // PNG IHDR: width/height are big-endian uint32 at byte offsets 16 and 20.
      const buf = readFileSync(file);
      expect(buf.readUInt32BE(16)).toBe(1200);
      expect(buf.readUInt32BE(20)).toBe(630);
    }
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

  // 'a post page sets its own post title (distinct per post and locale) and
  // self-referential canonical' moved to tests/sitemap-posts.test.ts: it
  // asserted posts.length >= 2, which the now-empty fixture can never
  // satisfy. See that file's header comment for the full rationale.
});
