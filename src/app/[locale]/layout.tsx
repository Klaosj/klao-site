import '../globals.css';
import type { Metadata } from 'next';
import PaletteHost from '@/components/palette/PaletteHost';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import { getCareer, getFaq, getFeaturedProjects, getProfile } from '@/lib/content';
import { dict } from '@/lib/dictionary';
import { assertLocale } from '@/lib/locale';
import { LOCALES, type Locale } from '@/lib/models';
import { buildPaletteIndex } from '@/lib/palette-index';
import { SITE_URL } from '@/lib/site';
import { THEME_PREPAINT_SCRIPT } from '@/lib/theme';

// The Thai face (the only font file this site ships) is declared in
// globals.css. Preloading it here means Thai text swaps to Anuphan early
// instead of after the stylesheet is parsed and Thai text is found.
const THAI_FONT_URL = '/fonts/anuphan-thai.woff2';

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
  // after changing the headline or the three apps.
  // The alt says what the card shows (spec 2026-10-01 §5): the headline, the
  // name and URL, and the three apps with their status labels. Change it
  // whenever the card's content changes.
  const ogAlt: Record<Locale, string> = {
    en: 'Business developer who builds his own tools. Suwichak Jarunopratamp · klao-site.vercel.app, with screens from GoNai (live), Aje (working prototype) and Cafénista (prototype, simulated data).',
    th: 'นัก Business Development ที่สร้างเครื่องมือใช้เอง Suwichak Jarunopratamp · klao-site.vercel.app พร้อมหน้าจอจาก GoNai (เปิดใช้งานแล้ว) Aje (Prototype ใช้งานได้) และ Cafénista (Prototype · ข้อมูลจำลอง)',
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
  // Fetched here (not inside SiteNav) so SiteNav can stay a plain client
  // component driven entirely by props -- its section and hero-button
  // observers already need 'use client', and an async server-fetch has no
  // business living in the same file as that. getProfile() is
  // cache()-wrapped (see src/lib/content.ts), so this doesn't double the
  // real fetch SiteFooter and the page itself also make within the same
  // request.
  // P4: the ⌘K index is built here, on the server, so the client receives
  // plain localised rows; the palette's code loads only on first open
  // (PaletteHost). Every getter is cache()-wrapped, so on the home route
  // these reuse the page's own fetches.
  const [profile, projects, career, faq] = await Promise.all([
    getProfile(),
    getFeaturedProjects(),
    getCareer(),
    getFaq(),
  ]);
  const paletteEntries = buildPaletteIndex({ profile, projects, career, faq }, l);
  return (
    // suppressHydrationWarning: THEME_PREPAINT_SCRIPT adds `js` and may set
    // `data-theme` on <html> before React hydrates, so the client DOM
    // legitimately differs from the server HTML on this one element. It only
    // silences attribute warnings for <html> itself, not its children.
    <html lang={l} suppressHydrationWarning>
      <head>
        {/* Runs before first paint: no flash of the wrong theme, and `js` is
            on <html> before any reveal CSS could dim content. See
            src/lib/theme.ts for what it does and why it is ES5. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_PREPAINT_SCRIPT }} />
        <link rel="preload" href={THAI_FONT_URL} as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className="flex min-h-screen flex-col">
        {/* Skip link (2026-08-09 QA, WCAG 2.4.1). The header is fixed and
            holds ~10 focusable items, so without this a keyboard user tabs
            the whole nav again on every route before reaching content.
            Deliberately the first focusable node in the body, and
            deliberately not `hidden` -- it must be reachable by Tab, so it
            is only visually hidden until focused. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-kram focus:px-5 focus:py-3 focus:text-[13px] focus:font-semibold focus:text-on-kram"
        >
          {dict[l].skipToContent}
        </a>
        <SiteNav locale={l} profile={profile} />
        {/* Unconstrained, unlike the old boxed `max-w-3xl` column: the
            redesigned home route's bands (HeroTour, ByDay, ...) are meant to
            span the full viewport, with each band capping its own reading
            width internally instead (the shared `.wrap`/`.wrap-wide`
            classes, C9). The four untouched routes (projects/writing/career/
            writing/[slug]) now carry that same `max-w-3xl` column on their
            own root element instead, plus top padding to clear this header
            now that it's fixed rather than sitting in normal document
            flow. */}
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter locale={l} />
        <PaletteHost entries={paletteEntries} faq={faq} email={profile.email} locale={l} />
      </body>
    </html>
  );
}
