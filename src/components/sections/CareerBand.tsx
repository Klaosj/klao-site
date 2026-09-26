import CareerDetent from '@/components/CareerDetent';
import Reveal from '@/components/motion/Reveal';
import ThaiText from '@/components/ThaiText';
import { currentYm, toolboxColumns } from '@/lib/career';
import { dict } from '@/lib/dictionary';
import type { CareerEntry, Locale, Skill } from '@/lib/models';
import '../career.css';

type Props = {
  entries: CareerEntry[];
  skills: Skill[];
  locale: Locale;
  resumeUrl: string | null;
  // Tests pin the month; the page lets it default to the render time, which
  // ISR refreshes about hourly.
  now?: string;
};

// Server component (spec §6 Career, C7 `#career`): the mist band with the
// head, the rail/pills/panel island and the one-row toolbox. The island is
// the only client code; its first render (the current role) is in the
// server HTML, so the band reads fully without JavaScript.
export default function CareerBand({ entries, skills, locale, resumeUrl, now = currentYm() }: Props) {
  const t = dict[locale];
  const columns = toolboxColumns(
    skills,
    { stack: t.toolboxStack, methods: t.toolboxMethods, languages: t.toolboxLanguages },
    t.toolLanguageNames,
  );

  return (
    <section id="career" className="band" aria-labelledby="career-h">
      <div className="wrap">
        {/* Ruling C-3 (P3 preflight): `big` -- the headline rises the
            prototype's 24 px, not P0 Reveal's 16 px default. */}
        <Reveal big className="car-h">
          {/* cvHeading carries the prototype's career headline verbatim. */}
          <h2 id="career-h" className="t-h2">
            <ThaiText text={t.cvHeading} />
          </h2>
          {resumeUrl && (
            <div className="car-res">
              <a href={resumeUrl} target="_blank" rel="noopener">
                {t.resumeLink}
              </a>
              <small>
                <ThaiText text={t.resumeMeta} />
              </small>
            </div>
          )}
        </Reveal>
        <CareerDetent entries={entries} locale={locale} now={now} />
        {columns.length > 0 && (
          <div id="toolbox">
            <Reveal className="car-tools">
              <h3>
                <ThaiText text={t.toolboxHeading} />
              </h3>
              <div className="car-tgrid">
                {columns.map((column) => (
                  <div key={column.id} className="car-tcell">
                    {/* Ruling C-5 (P3 preflight): a column label is
                        display-ish (short but a heading), so it goes
                        through ThaiText like the other headings here. */}
                    <h4>
                      <ThaiText text={column.label} />
                    </h4>
                    <p>
                      <ThaiText text={column.items.join(' · ')} />
                    </p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        )}
      </div>
    </section>
  );
}
