import type { Metadata } from 'next';
import { getCareer, getProfile } from '@/lib/content';
import { dict } from '@/lib/dictionary';
import { assertLocale } from '@/lib/locale';
import { SITE_URL } from '@/lib/site';

// See src/app/[locale]/page.tsx for why this is set per leaf page rather
// than on the shared layout.
export const dynamicParams = false;

// Widen-then-narrow `params`, matching layout.tsx's generateMetadata (Task
// 10 review's critical type constraint).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  return {
    title: dict[l].career,
    alternates: { canonical: `${SITE_URL}/${l}/career` },
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
              {entry.role}
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
