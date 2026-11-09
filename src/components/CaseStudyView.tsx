import Link from 'next/link';
import CaseThumb from '@/components/CaseThumb';
import ThaiText from '@/components/ThaiText';
import { LockGlyph } from '@/components/sections/CaseStudies';
import { demoHref, type CaseStudy } from '@/lib/cases';
import type { Locale } from '@/lib/models';
import './case-study.css';

const COPY = {
  allWork: { en: 'All work', th: 'ผลงานทั้งหมด' },
  confidential: { en: 'Confidential client', th: 'ลูกค้าไม่เปิดเผยชื่อ' },
  draft: {
    en: 'Draft. Not on the live site until Klao clears every line.',
    th: 'ฉบับร่าง ยังไม่ขึ้นเว็บจริงจนกว่าเกลาจะตรวจทุกบรรทัด',
  },
  problem: { en: 'The problem', th: 'โจทย์' },
  did: { en: 'What I did', th: 'สิ่งที่ผมทำ' },
  result: { en: 'Result', th: 'ผลลัพธ์' },
  next: { en: 'Next case study', th: 'เคสถัดไป' },
  onPage: { en: 'On this page', th: 'ในหน้านี้' },
  openDemo: { en: 'Open the demo', th: 'เปิดเดโม' },
  stages: {
    en: ['Commercial terms', 'Screen prep', 'Installation', 'Sales readiness', 'Post-launch audit'],
    th: ['เงื่อนไขการค้า', 'เตรียมจอ', 'ติดตั้ง', 'ความพร้อมฝ่ายขาย', 'ตรวจหลังเปิดตัว'],
  },
  batch: { en: 'Batch', th: 'ชุด' },
  states: {
    done: { en: 'Done', th: 'เสร็จ' },
    track: { en: 'On track', th: 'ตามแผน' },
    risk: { en: 'At risk', th: 'เสี่ยง' },
    off: { en: 'Off track', th: 'หลุดแผน' },
    wait: { en: 'Not started', th: 'ยังไม่เริ่ม' },
  },
} as const;

type State = keyof typeof COPY.states;
// Illustrative only: four batches at different points, one at risk, one off track.
const TRACKER: State[][] = [
  ['done', 'done', 'done', 'done', 'track'],
  ['done', 'done', 'done', 'track', 'wait'],
  ['done', 'done', 'risk', 'wait', 'wait'],
  ['done', 'off', 'wait', 'wait', 'wait'],
];

function Tracker({ locale, caption }: { locale: Locale; caption: string }) {
  const s = COPY.states;
  return (
    <figure className="cst-tracker">
      <div className="cst-scroll" role="region" aria-label={caption} tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th scope="col">{COPY.batch[locale]}</th>
              {COPY.stages[locale].map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TRACKER.map((row, i) => (
              <tr key={i}>
                <th scope="row">
                  {COPY.batch[locale]} {String.fromCharCode(65 + i)}
                </th>
                {row.map((st, j) => (
                  <td key={j}>
                    <span className={`cst-chip cst-${st}`}>{s[st][locale]}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

/** One case study page (/{locale}/work/{slug} for a code-defined case). Server component. */
export default function CaseStudyView({ c, next, locale }: { c: CaseStudy; next: CaseStudy | null; locale: Locale }) {
  const demo = demoHref(c);
  return (
    <article className="cst wrap-wide">
      <p className="cst-back">
        <Link href={`/${locale}#cases`}>
          <span aria-hidden="true">←</span> {COPY.allWork[locale]}
        </Link>
      </p>
      {c.status === 'draft' && (
        <p className="cst-draftnote" role="note">
          <ThaiText text={COPY.draft[locale]} />
          {c.result.draftNote && <span lang="en"> {c.result.draftNote}</span>}
        </p>
      )}
      <header className="cst-head">
        <p className="cst-kick">
          {/* One span: ThaiText's runs would each become a flex item. */}
          <span>
            <ThaiText text={c.kicker[locale]} />
          </span>
          <span className="cs-chip">
            <LockGlyph />
            {COPY.confidential[locale]}
          </span>
        </p>
        <h1 className="cst-h1">
          <ThaiText text={c.title[locale]} display />
        </h1>
        <p className="cst-lede">
          <ThaiText text={c.lede[locale]} />
        </p>
      </header>
      <dl className="cst-meta">
        {c.meta.map((m) => (
          <div key={m.label.en}>
            <dt>{m.label[locale]}</dt>
            <dd>
              <ThaiText text={m.value[locale]} />
            </dd>
          </div>
        ))}
      </dl>
      <p className="cst-note">
        <LockGlyph />
        <span>
          <ThaiText text={c.confidentiality[locale]} />
        </span>
      </p>

      <div className="cst-body">
        <nav className="cst-toc" aria-label={COPY.onPage[locale]}>
          <a href="#c-problem">{COPY.problem[locale]}</a>
          <a href="#c-did">{COPY.did[locale]}</a>
          <a href="#c-artifact">{c.artifact.heading[locale]}</a>
          <a href="#c-result">{COPY.result[locale]}</a>
        </nav>
        <div className="cst-prose">
          <section id="c-problem" aria-labelledby="c-problem-h">
            <h2 id="c-problem-h">{COPY.problem[locale]}</h2>
            {c.problem.map((p) => (
              <p key={p.en}>
                <ThaiText text={p[locale]} />
              </p>
            ))}
          </section>
          <section id="c-did" aria-labelledby="c-did-h">
            <h2 id="c-did-h">{COPY.did[locale]}</h2>
            <ol className="cst-steps">
              {c.steps.map((s) => (
                <li key={s.title.en}>
                  <b>
                    <ThaiText text={s.title[locale]} />
                  </b>
                  <span>
                    <ThaiText text={s.body[locale]} />
                  </span>
                </li>
              ))}
            </ol>
          </section>
          <section id="c-artifact" aria-labelledby="c-artifact-h">
            <h2 id="c-artifact-h">{c.artifact.heading[locale]}</h2>
            <p>
              <ThaiText text={c.artifact.intro[locale]} />
            </p>
            {c.artifact.kind === 'tracker' ? (
              <Tracker locale={locale} caption={c.artifact.caption[locale]} />
            ) : (
              <figure className="cst-demo">
                <CaseThumb c={c} locale={locale} />
                <figcaption>
                  {demo && (
                    <a className="btn btn-fill" href={demo} target="_blank" rel="noreferrer">
                      {COPY.openDemo[locale]} <span aria-hidden="true">↗</span>
                    </a>
                  )}
                  <span>
                    <ThaiText text={c.artifact.caption[locale]} />
                  </span>
                </figcaption>
              </figure>
            )}
          </section>
          <section id="c-result" aria-labelledby="c-result-h">
            <h2 id="c-result-h">{COPY.result[locale]}</h2>
            <p className="cst-result">
              <ThaiText text={c.result.headline[locale]} />
            </p>
            <p>
              <ThaiText text={c.skills[locale]} />
            </p>
          </section>
          {next && (
            <Link className="cst-next" href={`/${locale}/work/${next.slug}`}>
              <span>
                <span className="cst-next-l">{COPY.next[locale]}</span>
                <b>
                  <ThaiText text={next.title[locale]} />
                </b>
              </span>
              <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
