import '../globals.css';
import type { Metadata } from 'next';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import { assertLocale } from '@/lib/locale';
import { LOCALES, type Locale } from '@/lib/models';
import { SITE_URL } from '@/lib/site';

export const revalidate = 3600;

// Deliberately NOT setting `export const dynamicParams = false;` here, even
// though this is the layout every dotted single-segment path (e.g.
// `/favicon.ico`) falls into. Next.js computes a route's effective
// dynamicParams as the AND of every segment in that route's chain --
// `segments.every((s) => s.config?.dynamicParams !== false)` in
// node_modules/next/dist/build/static-paths/app.js (with a literal
// `// TODO: dynamic params should be allowed to be granular per segment but
// we need additional information stored/leveraged in the prerender
// manifest to allow this behavior` above it) -- so `false` set on a layout
// poisons every descendant route and CANNOT be overridden back to `true` by
// a child page. writing/[slug]/page.tsx deliberately sets its own
// `dynamicParams = true` so a post published to Notion after the last build
// still resolves without a redeploy; setting `false` here would silently
// break that (verified empirically against the installed Next.js version,
// not assumed). Instead, `dynamicParams = false` is set individually on the
// four LEAF pages that don't need on-demand resolution (page.tsx,
// projects/page.tsx, career/page.tsx, writing/page.tsx) -- each is a
// separate route from writing/[slug], so it doesn't touch that route's own
// computation. The actual crash fix is `assertLocale` below: it 404s a
// bogus locale value before any Notion-backed data fetch runs, in every
// page and generateMetadata, regardless of dynamicParams.
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

// `params` is widened to `{ locale: string }` and narrowed via `assertLocale`
// inside the body, mirroring RootLayout below. Next intersects
// generateMetadata's props with `any` (like page props), so a narrow
// `Locale` type would build fine here today -- but layouts are exactly the
// spot that broke `tsc` once (ParamMap["/[locale]"] is `{ locale: string }`,
// checked contravariantly under strict), so this file uses the same
// widen-then-narrow pattern throughout for consistency and to not depend on
// that leniency. `assertLocale` (rather than the old `locale === 'th' ?
// 'th' : 'en'` coercion) 404s an unrecognized value instead of silently
// rendering English -- this is the layout every route under `[locale]`
// shares, so this is the one call site that can't be skipped.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  const descriptions: Record<Locale, string> = {
    en: 'Suwichak "Klao" Jarunopratamp — business developer who builds his own tools. BD × Data Analytics, Bangkok.',
    th: 'สุวิจักขณ์ "เกลา" — นัก Business Development ที่สร้างเครื่องมือใช้เอง BD × Data Analytics กรุงเทพฯ',
  };
  // Share-preview cards, one per locale. Static PNGs rather than Next's
  // ImageResponse: Satori (which ImageResponse uses) ships no Thai font, so
  // the TH card would need a Thai font file loaded at request time. Sources
  // are design/og/og-{en,th}.html — see design/og/README.md to regenerate
  // after changing the headline or the featured-project list.
  const ogAlt: Record<Locale, string> = {
    en: 'Klao — business developer who builds his own tools. Selected work: GoNai, AISecretary, DailyBrief.',
    th: 'Klao — นัก Business Development ที่สร้างเครื่องมือใช้เอง ผลงานเด่น: GoNai, AISecretary, DailyBrief',
  };
  // Relative path resolves against metadataBase, so this follows
  // NEXT_PUBLIC_SITE_URL automatically instead of hardcoding a domain.
  const ogImage = {
    url: `/og/og-${l}.png`,
    width: 1200,
    height: 630,
    alt: ogAlt[l],
  };
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: 'Klao — Suwichak Jarunopratamp', template: '%s · Klao' },
    description: descriptions[l],
    // Self-referential canonical for THIS locale's site root. This is only
    // ever the final answer for the home page, which doesn't override it --
    // every other route (projects/writing/career/[slug]) sets its own
    // canonical via its own generateMetadata, which fully replaces this
    // default rather than merging with it.
    //
    // `languages` (hreflang) deliberately does NOT live here anymore: a
    // layout-level `alternates.languages` is inherited by every descendant
    // page unchanged, which is exactly the Task 10 review bug (Important
    // #2) -- a single site-root map emitted on all 12 URLs, non-reciprocal
    // on 10 of them (e.g. a post page's "th" alternate pointed at the Thai
    // *home* page, not the Thai post). Per-URL hreflang now lives in
    // sitemap.ts, where each entry can point at its own matching page.
    alternates: {
      canonical: `${SITE_URL}/${l}`,
    },
    openGraph: {
      title: 'Klao — Suwichak Jarunopratamp',
      description: descriptions[l],
      type: 'website',
      locale: l === 'th' ? 'th_TH' : 'en_US',
      url: `${SITE_URL}/${l}`,
      siteName: 'Klao',
      images: [ogImage],
    },
    // X/Twitter ignores og:image sizing and needs its own card type to
    // render a large preview rather than a thumbnail strip.
    twitter: {
      card: 'summary_large_image',
      title: 'Klao — Suwichak Jarunopratamp',
      description: descriptions[l],
      images: [ogImage],
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const l = assertLocale(locale);
  return (
    <html lang={l}>
      <body className="flex min-h-screen flex-col">
        <SiteNav locale={l} />
        <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">{children}</main>
        <SiteFooter locale={l} />
      </body>
    </html>
  );
}
