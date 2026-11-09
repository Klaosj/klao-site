import Link from 'next/link';
import CaseThumb from '@/components/CaseThumb';
import ThaiText from '@/components/ThaiText';
import Reveal from '@/components/motion/Reveal';
import type { CaseStudy } from '@/lib/cases';
import type { Locale } from '@/lib/models';
import './case-studies.css';

export const CASES_COPY = {
  heading: { en: 'Selected work.', th: 'ผลงานที่คัดมา' },
  lead: {
    en: 'Client work, told as method. Names and figures stay confidential.',
    th: 'งานกับลูกค้าเล่าเป็นวิธีทำงาน ไม่ระบุชื่อและตัวเลข',
  },
  confidential: { en: 'Confidential client', th: 'ลูกค้าไม่เปิดเผยชื่อ' },
  outcome: { en: 'Outcome', th: 'ผลลัพธ์' },
  read: { en: 'Read the case study', th: 'อ่านเคสนี้' },
  draft: { en: 'Draft', th: 'ฉบับร่าง' },
} as const;

/** Lock glyph for the "Confidential client" chip. Decorative. */
export function LockGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/**
 * #cases (Recruiter Edition, 2026-11-09): client work as case-study cards,
 * right under the hero. Each card is one link to /{locale}/work/{slug}.
 * Renders nothing when no case is visible on this deployment.
 */
export default function CaseStudies({ cases, locale }: { cases: CaseStudy[]; locale: Locale }) {
  if (cases.length === 0) return null;
  return (
    <section id="cases" className="section wrap" aria-labelledby="cases-h">
      <Reveal as="header">
        <h2 id="cases-h" className="t-h2" tabIndex={-1}>
          <ThaiText text={CASES_COPY.heading[locale]} display />
        </h2>
        <p className="t-lead">
          <ThaiText text={CASES_COPY.lead[locale]} />
        </p>
      </Reveal>
      <ul className="cs-grid">
        {cases.map((c, i) => (
          <li key={c.slug}>
            <Reveal delayIndex={i}>
              <Link className="cs-card" href={`/${locale}/work/${c.slug}`}>
                <CaseThumb c={c} locale={locale} />
                <span className="cs-body">
                  <span className="cs-kick">
                    {/* One span: ThaiText's runs would each become a flex item. */}
                    <span>
                      <ThaiText text={c.kicker[locale]} />
                    </span>
                    <span className="cs-chip">
                      <LockGlyph />
                      {CASES_COPY.confidential[locale]}
                    </span>
                    {c.status === 'draft' && <span className="cs-chip cs-draft">{CASES_COPY.draft[locale]}</span>}
                  </span>
                  <span className="cs-title">
                    <ThaiText text={c.title[locale]} />
                  </span>
                  <span className="cs-sum">
                    <ThaiText text={c.summary[locale]} />
                  </span>
                  <span className="cs-out">
                    <span>{CASES_COPY.outcome[locale]}</span>
                    <span>
                      <ThaiText text={c.outcome[locale]} />
                    </span>
                  </span>
                  <span className="cs-more">
                    {CASES_COPY.read[locale]} <span aria-hidden="true">→</span>
                  </span>
                </span>
              </Link>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
