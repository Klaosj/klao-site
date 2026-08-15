import Reveal from '@/components/motion/Reveal';
import { dict } from '@/lib/dictionary';
import { LOCALES } from '@/lib/models';
import type { CareerEntry, Locale } from '@/lib/models';
import SectionLabel from '@/components/SectionLabel';

// Server component -- no 'use client'. Reveal (T2) is itself a client
// component but is composed here the same way CraftBand/WorkDeck do it.
export default function CvBand({
  entries,
  locale,
  // Defaults to null, matching Profile.resumeUrl's own "no resume published
  // yet" state. A truthy default would render a link to a 404 on any deploy
  // whose profile has no PDF.
  resumeUrl = null,
}: {
  entries: CareerEntry[];
  locale: Locale;
  resumeUrl?: string | null;
}) {
  const t = dict[locale];

  // Rendered in both branches below, so it is defined once here. The resume
  // and the Notion Career DB are independent: an unpopulated DB says nothing
  // about whether a PDF exists to download. `.btn` opts the capsule into the
  // magnetic-pointer pull PointerFx drives (globals.css).
  //
  // This capsule used to be the pill system's undocumented fifth variant
  // (2026-08-15 QA finding 6): primary geometry, the neutral pill's faint
  // border at 1.42:1 (under WCAG 1.4.11's 3:1 for a control's own boundary),
  // body weight, and NO hover -- its only feedback was the `.btn` magnet,
  // which is off for reduced-motion, touch and keyboard users, i.e. off for
  // everyone who most needs the affordance. It now borrows the neutral
  // pill's border token, weight and hover verbatim (ProjectCard's "Live
  // site"/"View code"), on the house 300ms curve rather than Tailwind's
  // default 150ms. Geometry stays -- it is the section's own CTA, not a row
  // action, and the size step is the deliberate part.
  const resumeLink = resumeUrl && (
    <a
      href={resumeUrl}
      className="btn mt-8 inline-flex items-center gap-2 rounded-full border border-on-dark-mid px-6 py-3 text-[12.5px] font-medium text-on-dark-soft transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-peri hover:text-peri"
    >
      <span aria-hidden="true">↓</span> {t.resume}
    </a>
  );

  // No fabricated rows and no fabricated stats: when Notion hasn't been
  // populated yet, entries is empty and the honest thing to show is the
  // "not yet published" message, not a stat grid full of zeros sitting next
  // to it.
  if (entries.length === 0) {
    return (
      <section id="cv" className="relative z-[2] bg-deep px-6 py-[11vh]">
        <SectionLabel text={t.career} locale={locale} className="mb-5" />
        <p className="text-[14.5px] text-on-dark-soft">{t.careerUnpublished}</p>
        {resumeLink}
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
      <SectionLabel text={t.career} locale={locale} className="mb-5" />
      {/* The eyebrow above is a label, not a heading. Without this <h2> the
          whole CV section was invisible to heading navigation -- a screen
          reader jumping by heading skipped straight from Work to Contact
          (2026-08-09 QA, WCAG 1.3.1). Same eyebrow + big-head pairing every
          other band already uses. */}
      <h2 className="max-w-[16ch] text-[clamp(30px,4.4vw,58px)] font-bold leading-[1.06] tracking-[-0.03em]">
        {t.cvHeading}
      </h2>
      <div className="mt-[70px] grid items-start gap-[clamp(30px,6vw,90px)] md:grid-cols-[1fr_1.4fr]">
        {/* Wrapper so the resume capsule sits under the stat block and
            shares its grid column, instead of becoming a third column. */}
        <div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-on-dark-faint bg-on-dark-faint">
            {stats.map((s) => (
              <div key={s.v} className="bg-deep px-[22px] py-[26px]">
                <div className="text-[38px] font-bold tracking-[-0.03em]">{s.k}</div>
                <div className="mt-[7px] text-[12.5px] leading-[1.7] text-on-dark-soft">{s.v}</div>
              </div>
            ))}
          </div>
          {resumeLink}
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
                {/* `role` is Localized as of the 2026-08-09 QA pass -- it used
                    to be a plain string, which left English job titles on the
                    Thai pages. Falls back th -> en at the mapper, so an
                    untranslated title still renders rather than going blank. */}
                <div className="mt-[5px] text-[12.5px] text-on-dark-soft">{entry.role[locale]}</div>
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
