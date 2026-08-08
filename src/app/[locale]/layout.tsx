import '../globals.css';
import type { Metadata } from 'next';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import type { Locale } from '@/lib/models';
import { SITE_URL } from '@/lib/site';

export const revalidate = 3600;

export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'th' }];
}

// `params` is widened to `{ locale: string }` and narrowed to `Locale` inside
// the body, mirroring RootLayout below. Next intersects generateMetadata's
// props with `any` (like page props), so a narrow `Locale` type would build
// fine here today -- but layouts are exactly the spot that broke `tsc` once
// (ParamMap["/[locale]"] is `{ locale: string }`, checked contravariantly
// under strict), so this file uses the same widen-then-narrow pattern
// throughout for consistency and to not depend on that leniency.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l: Locale = locale === 'th' ? 'th' : 'en';
  const descriptions: Record<Locale, string> = {
    en: 'Suwichak "Klao" Jarunopratamp — business developer who builds his own tools. BD × Data Analytics, Bangkok.',
    th: 'สุวิจักขณ์ "เกลา" — นัก Business Development ที่สร้างเครื่องมือใช้เอง BD × Data Analytics กรุงเทพฯ',
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
  const l: Locale = locale === 'th' ? 'th' : 'en';
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
