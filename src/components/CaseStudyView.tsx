import type { CSSProperties } from 'react';
import Link from 'next/link';
import CaseThumb from '@/components/CaseThumb';
import CaseToc from '@/components/CaseToc';
import Reveal from '@/components/motion/Reveal';
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
  flags: { en: '2 flags:', th: 'มี 2 จุดที่ต้องดู:' },
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
    <Reveal as="figure" className="cst-tracker">
      {/* The slips, spelled out (shown on phones, where the table scrolls). Built from TRACKER. */}
      <p className="cst-flags">
        <b>{COPY.flags[locale]}</b>{' '}
        {TRACKER.flatMap((row, i) =>
          row.flatMap((st, j) =>
            st === 'risk' || st === 'off' ? [`${COPY.batch[locale]} ${String.fromCharCode(65 + i)} · ${COPY.stages[locale][j]} · ${s[st][locale]}`] : [],
          ),
        ).join('  /  ')}
      </p>
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
                    {/* --r/--c stagger the chips in, row by row, when the tracker scrolls in. */}
                    <span className={`cst-chip cst-${st}`} style={{ ['--r' as string]: String(i), ['--c' as string]: String(j) } as CSSProperties}>
                      {(st === 'risk' || st === 'off') && (
                        <span className="cst-flag" aria-hidden="true" />
                      )}
                      {s[st][locale]}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption>{caption}</figcaption>
    </Reveal>
  );
}

/** One case study page (/{locale}/work/{slug} for a code-defined case). Server component. */
export default function CaseStudyView({ c, next, locale }: { c: CaseStudy; next: CaseStudy | null; locale: Locale }) {
  const demo = demoHref(c);
  // A drawn (tracker) case has no screenshot, so its artifact leads the page,
  // full width, before the story: show, then tell (design review 2026-11-09).
  const artifactFirst = c.artifact.kind === 'tracker';
  const artifact = (
    <section id="c-artifact" className={artifactFirst ? 'cst-lead' : undefined} aria-labelledby="c-artifact-h">
      <h2 id="c-artifact-h">{c.artifact.heading[locale]}</h2>
      <p>
        <ThaiText text={c.artifact.intro[locale]} />
      </p>
      {c.artifact.kind === 'tracker' ? (
        <Tracker locale={locale} caption={c.artifact.caption[locale]} />
      ) : (
        <figure className="cst-demo">
          {c.artifact.image ? (
            <img
              className="cst-demo-img"
              src={c.artifact.image.src}
              alt={c.artifact.image.alt[locale]}
              width={c.artifact.image.width}
              height={c.artifact.image.height}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <CaseThumb c={c} locale={locale} />
          )}
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
  );
  const toc = [
    { id: 'c-problem', text: COPY.problem[locale] },
    { id: 'c-did', text: COPY.did[locale] },
    { id: 'c-artifact', text: c.artifact.heading[locale] },
    { id: 'c-result', text: COPY.result[locale] },
  ];
  if (artifactFirst) toc.unshift(toc.splice(2, 1)[0]);
  return (
    <article className="cst wrap">
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
      {/* Hero picture only from real screenshots; a drawn case leads with its artifact below. */}
      {c.image && (
        <Reveal className="cst-hero">
          <CaseThumb c={c} locale={locale} variant="hero" />
        </Reveal>
      )}
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

      {artifactFirst && artifact}

      <div className="cst-body">
        <CaseToc label={COPY.onPage[locale]} items={toc} />
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
            <Reveal as="ol" className="cst-steps">
              {c.steps.map((s, i) => (
                <li key={s.title.en} style={{ ['--s' as string]: String(i) } as CSSProperties}>
                  <b>
                    <ThaiText text={s.title[locale]} />
                  </b>
                  <span>
                    <ThaiText text={s.body[locale]} />
                  </span>
                </li>
              ))}
            </Reveal>
          </section>
          {!artifactFirst && artifact}
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
              <CaseThumb c={next} locale={locale} variant="mini" />
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
