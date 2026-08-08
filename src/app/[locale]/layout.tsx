import '../globals.css';
import type { Metadata } from 'next';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import type { Locale } from '@/lib/models';

export const revalidate = 3600;

export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'th' }];
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

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
    alternates: {
      languages: { en: '/en', th: '/th' },
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
