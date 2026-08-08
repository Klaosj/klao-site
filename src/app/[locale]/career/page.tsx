import type { Metadata } from 'next';
import { getCareer, getProfile } from '@/lib/content';
import { dict } from '@/lib/dictionary';
import type { Locale } from '@/lib/models';
import { SITE_URL } from '@/lib/site';

// Widen-then-narrow `params`, matching layout.tsx's generateMetadata (Task
// 10 review's critical type constraint).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l: Locale = locale === 'th' ? 'th' : 'en';
  return {
    title: dict[l].career,
    alternates: { canonical: `${SITE_URL}/${l}/career` },
  };
}

export default async function CareerPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = dict[locale];
  const [career, profile] = await Promise.all([getCareer(), getProfile()]);

  return (
    <div>
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
