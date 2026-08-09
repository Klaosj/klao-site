import Reveal from '@/components/motion/Reveal';
import { dict } from '@/lib/dictionary';
import { LOCALES } from '@/lib/models';
import type { CareerEntry, Locale } from '@/lib/models';
import { eyebrowFont } from '@/lib/typography';

// Server component -- no 'use client'. Reveal (T2) is itself a client
// component but is composed here the same way CraftBand/WorkGrid do it.
export default function CvBand({ entries, locale }: { entries: CareerEntry[]; locale: Locale }) {
  const t = dict[locale];

  // No fabricated rows and no fabricated stats: when Notion hasn't been
  // populated yet, entries is empty and the honest thing to show is the
  // "not yet published" message, not a stat grid full of zeros sitting next
  // to it.
  if (entries.length === 0) {
    return (
      <section id="cv" className="relative z-[2] bg-deep px-6 py-[11vh]">
        <p className={`mb-5 text-[9.5px] uppercase text-on-dark-soft ${eyebrowFont(locale, 'tracking-[0.24em]')}`}>
          {t.career}
        </p>
        <p className="text-[14.5px] text-on-dark-soft">{t.careerUnpublished}</p>
      </section>
    );
  }

  // Every number here is derived from the real `entries` array (or from
  // LOCALES, the single source of truth for how many languages this site
  // ships) -- none of it is invented marketing copy.
  const companyCount = new Set(entries.map((e) => e.company)).size;
  const winCount = entries.reduce((sum, e) => sum + e.wins[locale].length, 0);
  const stats: { k: string; v: string }[] = [
    { k: String(entries.length), v: t.statRoles },
    { k: String(companyCount), v: t.statCompanies },
    { k: String(winCount), v: t.statWins },
    { k: String(LOCALES.length), v: t.statLanguages },
  ];

  return (
    <section id="cv" className="relative z-[2] bg-deep px-6 py-[11vh]">
      <p className={`mb-5 text-[9.5px] uppercase text-on-dark-soft ${eyebrowFont(locale, 'tracking-[0.24em]')}`}>
        {t.career}
      </p>
      <div className="mt-[70px] grid items-start gap-[clamp(30px,6vw,90px)] md:grid-cols-[1fr_1.4fr]">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-on-dark-faint bg-on-dark-faint">
          {stats.map((s) => (
            <div key={s.v} className="bg-deep px-[22px] py-[26px]">
              <div className="text-[38px] font-bold tracking-[-0.03em]">{s.k}</div>
              <div className="mt-[7px] text-[12.5px] leading-[1.7] text-on-dark-soft">{s.v}</div>
            </div>
          ))}
        </div>

        <ul className="list-none border-t border-on-dark-faint">
          {entries.map((entry, i) => (
            <Reveal
              as="li"
              key={entry.id}
              delayIndex={i}
              className="grid grid-cols-[1fr_auto] items-start gap-4 border-b border-on-dark-faint py-6"
            >
              <div>
                <div className="text-[19px] font-semibold tracking-[-0.012em]">{entry.company}</div>
                {/* `role` is a plain string on CareerEntry, not Localized --
                    it renders the same in both locales. Only `wins` below is
                    picked per-locale. */}
                <div className="mt-[5px] text-[12.5px] text-on-dark-soft">{entry.role}</div>
                {entry.wins[locale].length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-[12.5px] text-on-dark-soft">
                    {entry.wins[locale].map((win, wi) => (
                      <li key={wi}>{win}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="whitespace-nowrap font-mono text-[10.5px] tracking-[0.12em] text-on-dark-soft">
                {entry.period}
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
