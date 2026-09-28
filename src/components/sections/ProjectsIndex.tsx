import type { ReactNode } from 'react';
import '../projects-index.css';
import ProjectSheet from '@/components/ProjectSheet';
import StatusChip from '@/components/StatusChip';
import ThaiText from '@/components/ThaiText';
import { Icon } from '@/components/icons';
import Reveal from '@/components/motion/Reveal';
import { Sketch } from '@/components/sketches';
import { dict } from '@/lib/dictionary';
import type { Locale, Project } from '@/lib/models';
import { projectKey, sheetHash } from '@/lib/sheet-url';

// "Business plays, and the things I shipped." (spec §4 row 3, §6; replaces WorkDeck). Server
// component: every row, label and the door are in the server HTML (Review Focus #4). Each row is
// a real link to `#work/<key>`; ProjectSheet (the one client island here) intercepts plain clicks
// and opens the sheet in place. Business leads, then Build -- the same chapter order WorkDeck
// had -- and an empty group renders nothing.
const GROUPS = [
  { type: 'business', labelKey: 'workTypeBusiness', labelId: 'work-business' },
  { type: 'build', labelKey: 'workTypeBuild', labelId: 'work-build' },
] as const;

// The prototype's 88×50 Notion-row sketch for this site's own row.
function NotionThumb() {
  return (
    <svg viewBox="0 0 88 50">
      <rect width="88" height="50" style={{ fill: 'var(--canvas)' }} />
      <g style={{ fill: 'var(--ink-3)' }}>
        <rect x="8" y="9" width="22" height="4" rx="2" />
        <rect x="36" y="9" width="42" height="4" rx="2" />
        <rect x="8" y="23" width="22" height="4" rx="2" />
        <rect x="36" y="23" width="34" height="4" rx="2" />
        <rect x="8" y="37" width="22" height="4" rx="2" />
      </g>
      <rect x="36" y="37" width="26" height="4" rx="2" style={{ fill: 'var(--ink-1)' }} />
    </svg>
  );
}

// Decorative: the name and the question sit right beside it as text. Ruling C-6: the rings/five
// drawings pass `small` -- the thumbnail cut, not the sheet's full labelled version.
function Thumb({ project }: { project: Project }) {
  let art: ReactNode = null;
  if (project.media === 'rings' || project.media === 'five') art = <Sketch name={project.media} small />;
  else if (project.media === 'notion') art = <NotionThumb />;
  else if (project.imageSrc) art = <img src={project.imageSrc} alt="" width={88} height={50} loading="lazy" decoding="async" />;
  return (
    // A07: `.pi-thumb` is the shared-element View Transition's "before" side (data-vt="shot",
    // read by ProjectSheet's shotIn()) and the element that lifts on hover; `.pi-thumb-media`
    // does the actual clipping one level down, so the lift's shadow pseudo-element (a sibling of
    // it, not a descendant) can bleed past the rounded corners instead of being clipped away.
    <span className="pi-thumb" data-vt="shot" aria-hidden="true">
      <span className="pi-thumb-media">{art}</span>
    </span>
  );
}

function Row({ project, locale }: { project: Project; locale: Locale }) {
  const key = projectKey(project);
  const question = project.question?.[locale];
  const body = (
    <>
      <Thumb project={project} />
      <span className="pi-text">
        <span className="pi-name">
          {project.name}
          {project.status ? ' ' : null}
          <StatusChip project={project} locale={locale} />
        </span>
        {/* Fix wave finding 5 (I2): ThaiText's keep-runs replace unbreak() -- unbreak() only
            stripped `|` without protecting keep-list words/dates/units from a mid-word break. */}
        {question && (
          <span className="pi-q">
            <ThaiText text={question} />
          </span>
        )}
      </span>
      {/* S-7: no chevron on a row with nothing to open -- it would promise a click that does
          nothing. */}
      {key && (
        <span className="pi-chev" aria-hidden="true">
          <Icon name="caret-right" />
        </span>
      )}
    </>
  );
  // S-7 (carried from P2 T1): a Thai-only project name with no story slug gives projectKey('') --
  // "#work/" isn't a hash sheet-url's own parser accepts, so this row shows everything else
  // (name, status, question, thumbnail) but is not a link to a sheet that can't open.
  return (
    <li>
      {key ? (
        <a className="pi-row" href={sheetHash(key)} data-sheet={key}>
          {body}
        </a>
      ) : (
        <div className="pi-row">{body}</div>
      )}
    </li>
  );
}

export default function ProjectsIndex({ projects, locale }: { projects: Project[]; locale: Locale }) {
  const t = dict[locale];
  const groups = GROUPS.map((g) => ({ ...g, items: projects.filter((p) => p.type === g.type) })).filter((g) => g.items.length > 0);
  if (groups.length === 0) return null;
  // The lead promises "Business first" only when a business row exists (WorkDeck's finding 7).
  const hasBusiness = groups.some((g) => g.type === 'business');

  return (
    <section id="work" className="section wrap" aria-labelledby="work-h">
      <Reveal as="header">
        <h2 id="work-h" className="t-h2" tabIndex={-1}>
          {/* R25: every .t-h2 heading passes display -- each Thai space-delimited token kept
              whole, not the default short keep-list runs. */}
          <ThaiText text={t.deckHeading} display />
        </h2>
        <p className="t-lead">
          <ThaiText text={hasBusiness ? t.deckSubtitle : t.deckSubtitleBuildOnly} />
        </p>
      </Reveal>
      <div className="pi-cols">
        {groups.map((g, gi) => (
          <section key={g.type} aria-labelledby={g.labelId}>
            <h3 id={g.labelId} className="pi-label">
              {t[g.labelKey]}
            </h3>
            <ul className="pi-rows">
              {g.items.map((p) => (
                <Row key={p.id} project={p} locale={locale} />
              ))}
              {/* The way from the plays to the day job (By day, P3), at the foot of the first column. */}
              {gi === 0 && (
                <li>
                  <a className="pi-door" href="#story">
                    {/* Fix wave finding 5 (I2). */}
                    <ThaiText text={t.workDoor} />
                  </a>
                </li>
              )}
            </ul>
          </section>
        ))}
      </div>
      <ProjectSheet projects={projects} locale={locale} />
    </section>
  );
}
