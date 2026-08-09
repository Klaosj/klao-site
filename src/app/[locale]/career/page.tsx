import type { Metadata } from 'next';
import { getCareer, getProfile } from '@/lib/content';
import { dict } from '@/lib/dictionary';
import { assertLocale } from '@/lib/locale';
import type { Locale } from '@/lib/models';
import { SITE_URL } from '@/lib/site';

// See src/app/[locale]/page.tsx for why this is set per leaf page rather
// than on the shared layout.
export const dynamicParams = false;

const descriptions: Record<Locale, string> = {
  en: 'Five roles across in-store retail media, brand representation, B2B sales coordination, specialty coffee and running a food business — with the numbers each one produced.',
  th: 'ห้าบทบาท ตั้งแต่สื่อในร้านค้าปลีก งานตัวแทนแบรนด์ ประสานงานขาย B2B กาแฟ specialty ไปจนถึงการทำร้านอาหารของตัวเอง พร้อมตัวเลขที่ทำได้จริงในแต่ละที่',
};

const ogAlt: Record<Locale, string> = {
  en: 'Klao — career history across retail media, brand work, sales coordination and specialty coffee.',
  th: 'เกลา — เส้นทางอาชีพ ตั้งแต่สื่อค้าปลีก งานแบรนด์ ประสานงานขาย จนถึงกาแฟ specialty',
};

// Widen-then-narrow `params`, matching layout.tsx's generateMetadata (Task
// 10 review's critical type constraint).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  // Route-specific description and OG. Without these the page inherited the
  // homepage's metadata verbatim, so /career, /projects and /writing all
  // served an identical search snippet (2026-08-09 QA, finding I4). Shape
  // deliberately matches projects/page.tsx and writing/page.tsx rather than
  // inventing a second convention.
  const title = dict[l].career;
  const description = descriptions[l];
  const url = `${SITE_URL}/${l}/career`;
  const ogImage = { url: `/og/og-${l}.png`, width: 1200, height: 630, alt: ogAlt[l] };
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} · Klao`,
      description,
      type: 'profile',
      locale: l === 'th' ? 'th_TH' : 'en_US',
      url,
      siteName: 'Klao',
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} · Klao`,
      description,
      images: [ogImage],
    },
  };
}

export default async function CareerPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = assertLocale((await params).locale);
  const t = dict[locale];
  const [career, profile] = await Promise.all([getCareer(), getProfile()]);

  return (
    // See projects/page.tsx and layout.tsx for why this page owns its own
    // reading-width column and top padding now.
    <div className="mx-auto w-full max-w-3xl px-6 pb-16 pt-28">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">{t.career}</h1>
        {profile.resumeUrl && (
          <a href={profile.resumeUrl} className="text-sm underline hover:text-soft">
            ↓ {t.resume}
          </a>
        )}
      </div>
      <ol className="mt-8 space-y-8 border-l border-line pl-6">
        {career.map((entry) => (
          <li key={entry.id}>
            <h2 className="font-semibold">
              {/* Localized as of the 2026-08-09 QA pass; falls back th -> en
                  at the mapper, so an untranslated title still renders. */}
              {entry.role[locale]}
              {entry.company && <span className="font-normal text-soft"> · {entry.company}</span>}
            </h2>
            {entry.period && <p className="mt-1 text-xs text-soft">{entry.period}</p>}
            {entry.wins[locale].length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {entry.wins[locale].map((win, i) => (
                  <li key={i}>{win}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
