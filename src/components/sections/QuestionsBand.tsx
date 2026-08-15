import Reveal from '@/components/motion/Reveal';
import { dict } from '@/lib/dictionary';
import type { Locale, OpenQuestion } from '@/lib/models';
import { eyebrowFont } from '@/lib/typography';

// Server component -- no 'use client'. Reveal is a client component composed
// as a plain child, same as ClientsBand/WorkGrid.
export default function QuestionsBand({ questions, locale }: { questions: OpenQuestion[]; locale: Locale }) {
  const t = dict[locale];

  // Newest 3 open questions -- `answered` ones leave the band (their
  // linkSlug feeds the case page's born-from line instead), and the 3-cap
  // is a presentation rule the parent spec locks ("latest ~3"), so it lives
  // here rather than in content.ts. getQuestions() already sorts date desc.
  const open = questions.filter((question) => question.status !== 'answered').slice(0, 3);

  // ClientsBand rule: an empty band must not exist. Also the rendered state
  // while NOTION_DB_QUESTIONS is not configured yet (content.ts maps that
  // to []), so shipping this band never blocks on a Vercel console action.
  if (open.length === 0) {
    return null;
  }

  return (
    <section id="questions" className="relative z-[2] bg-deep px-6 py-[11vh]">
      {/* Eyebrow-as-heading, WorkGrid's idiom: the band's real copy is the
          questions themselves, so the section heading stays a quiet label
          rather than competing display type. */}
      <h2 className={`mb-10 text-[9.5px] uppercase text-on-dark-soft ${eyebrowFont(locale, 'tracking-[0.24em]')}`}>
        {t.openQuestions}
      </h2>
      <ul className="flex list-none flex-col gap-7">
        {open.map((question, i) => (
          <Reveal
            as="li"
            key={question.id}
            delayIndex={i}
            className="max-w-[28ch] text-[clamp(20px,3vw,36px)] font-semibold leading-[1.3] tracking-[-0.02em] text-on-dark"
          >
            {question.question[locale]}
            {question.status === 'building' && (
              // The one status a question can wear on the band. `wondering`
              // is the quiet default and carries nothing. Thai never renders
              // through font-mono -- eyebrowFont picks the face per locale.
              <span
                className={`ml-3 inline-block align-middle text-[10px] uppercase text-peri-deep ${eyebrowFont(locale, 'tracking-[0.18em]')}`}
              >
                {t.statusBuilding}
              </span>
            )}
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
