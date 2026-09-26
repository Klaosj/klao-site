'use client';

import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import './project-sheet.css';
import { Icon } from '@/components/icons';
import { Sketch } from '@/components/sketches';
import StatusChip from '@/components/StatusChip';
import ThaiText from '@/components/ThaiText';
import { dict } from '@/lib/dictionary';
import { imageAlt } from '@/lib/image-alt';
import type { Locale, Project } from '@/lib/models';
import { hostOf, lineageFor, unbreak, washVar, type Lineage } from '@/lib/project-view';
import { parseSheetHash, projectKey, sheetHash } from '@/lib/sheet-url';
import { SIG_YEARS } from '@/lib/signature';

// The project sheet (spec §4 row "#work/<slug>", §6 "Projects index + sheets"): one native
// <dialog> for every project on the index, opened three ways --
//   1. a click on any `a[data-sheet]` (index rows; later the footer) -> pushState `#work/<key>`,
//      so Back closes it;
//   2. a page load whose URL already carries a known `#work/<key>` (a shared link);
//   3. `hashchange` / `popstate` (Back, Forward, or another island assigning location.hash).
// Esc, the close button and a backdrop click close it and replaceState the hash away. An
// unknown or malformed hash opens nothing and throws nothing (Review Focus #3; S-7: a Thai-only
// project name with no story slug gives projectKey a "" and #work/ isn't even parseable, so the
// same guard covers it). Nothing here touches the server: the home route stays one static ISR
// page.
//
// Polish A07: opening from a row runs a shared-element View Transition -- the interface with
// Task 11 (the index) is a DOM contract, not a function call: a row wraps its thumbnail image
// in `data-sheet`'s link with `data-vt="shot"`, and this file finds it via a plain
// querySelector. Task 10 gives the sheet itself a matching `[data-vt="shot"]` media element (its
// own `.smedia` block, a sibling of `.sbody` -- see SheetMedia below), rendered for every media
// kind the sheet shows, not only a real screenshot.

const EXIT_MS = 280; // .sheet.closing in project-sheet.css

function motionAllowed(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: no-preference)').matches;
}

function clearSheetHash() {
  if (window.location.hash.startsWith('#work/')) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

// A07: the one element on either side of the shared-element morph, marked by whichever task
// owns it (the row's thumbnail, T11; the sheet's media, T10). Never the dialog itself -- naming
// a top-layer element is the documented gotcha this ruling calls out.
function shotIn(scope: ParentNode | null | undefined): HTMLElement | null {
  return scope?.querySelector<HTMLElement>('[data-vt="shot"]') ?? null;
}

/**
 * Runs `change` inside `document.startViewTransition` when the API exists, motion is allowed,
 * and there is a `before` element to name -- exactly A07's "opening from an index row runs a
 * View Transition" (and its reverse on close). `findAfter` is called only once the transition's
 * callback has committed `change`'s DOM update, so it can look for an element `change` itself
 * creates (e.g. the sheet's media, once Task 10 renders one).
 *
 * Returns whether it ran the transition, so the caller knows whether it still owns its own
 * fallback animation (the plain CSS open/close in project-sheet.css) or the View Transition
 * already is the animation for this open/close.
 */
function runShotTransition(before: HTMLElement | null, change: () => void, findAfter: () => HTMLElement | null): boolean {
  if (!before || typeof document.startViewTransition !== 'function' || !motionAllowed()) return false;
  before.style.viewTransitionName = 'shot';
  let after: HTMLElement | null = null;
  const transition = document.startViewTransition(() => {
    // Only one element may carry a given view-transition-name at the instant the "after"
    // snapshot is taken; clearing `before` here (rather than after `change`) guarantees that
    // even if `before` is also `change`'s target for removal, the name never collides with
    // whatever `findAfter` returns.
    before.style.viewTransitionName = '';
    flushSync(change);
    after = findAfter();
    if (after) after.style.viewTransitionName = 'shot';
  });
  // A07: "clear the names after each transition" -- belt-and-braces since the callback above
  // already clears `before`, but `after` (set inside the callback) only gets cleared here.
  transition.finished.finally(() => {
    before.style.viewTransitionName = '';
    if (after) after.style.viewTransitionName = '';
  });
  return true;
}

type SheetBodyProps = {
  project: Project;
  projects: Project[];
  locale: Locale;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onClose: () => void;
};

export default function ProjectSheet({ projects, locale }: { projects: Project[]; locale: Locale }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const exitTimer = useRef(0);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const byKey = useMemo(() => new Map(projects.map((p) => [projectKey(p), p])), [projects]);
  const current = openKey ? (byKey.get(openKey) ?? null) : null;

  const show = useCallback(
    (key: string, push: boolean, originEl?: Element | null) => {
      if (!byKey.has(key)) return; // "#work/unknown", or S-7's "": nothing to open
      window.clearTimeout(exitTimer.current);
      dialogRef.current?.classList.remove('closing');
      const change = () => {
        if (push && window.location.hash !== sheetHash(key)) window.history.pushState(null, '', sheetHash(key));
        setOpenKey(key);
      };
      // A07: only a genuine row click carries an origin element; a hashchange/deep-link open
      // (originEl omitted) has no row on screen to morph from, so it just runs `change`.
      const before = originEl instanceof HTMLElement ? shotIn(originEl) : null;
      if (!runShotTransition(before, change, () => shotIn(dialogRef.current))) change();
    },
    [byKey],
  );

  // Idempotent: the close button, Esc, Back and the dialog's own `close` event can all land
  // here, sometimes twice for one close.
  const finish = useCallback(() => {
    const d = dialogRef.current;
    const trigger = triggerRef.current;
    triggerRef.current = null;
    window.clearTimeout(exitTimer.current);
    if (d) {
      d.classList.remove('closing');
      if (d.open) {
        if (typeof d.close === 'function') d.close();
        else d.removeAttribute('open');
      }
    }
    document.documentElement.classList.remove('sheet-open');
    setOpenKey(null);
    trigger?.focus({ preventScroll: true });
  }, []);

  const hide = useCallback(
    (clearHash: boolean) => {
      if (clearHash) clearSheetHash();
      const d = dialogRef.current;
      if (!d || !d.open) {
        finish();
        return;
      }
      if (d.classList.contains('closing')) return;
      // A07: the reverse of the open transition, keyed off whatever is inside the dialog today
      // (T10's media, once it exists) and the row that opened this sheet (still tracked in
      // triggerRef -- the same element `finish` focuses back to below).
      const trigger = triggerRef.current;
      const before = shotIn(d);
      if (runShotTransition(before, finish, () => shotIn(trigger))) return; // the transition is the exit animation
      if (!motionAllowed()) {
        finish();
        return;
      }
      d.classList.add('closing');
      exitTimer.current = window.setTimeout(finish, EXIT_MS);
    },
    [finish],
  );

  // The URL is the source of truth for which sheet is open.
  const sync = useCallback(() => {
    const key = parseSheetHash(window.location.hash);
    if (key !== null && byKey.has(key)) show(key, false);
    else if (dialogRef.current?.open) hide(false);
  }, [byKey, show, hide]);

  useEffect(() => {
    sync(); // a URL loaded with #work/<key> opens that sheet
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, [sync]);

  // Rows stay real links (they work without JS); with JS a plain click opens in place.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target instanceof Element ? e.target : null;
      const link = target?.closest<HTMLAnchorElement>('a[data-sheet]') ?? null;
      const key = link?.dataset.sheet;
      if (!link || !key || !byKey.has(key)) return;
      e.preventDefault();
      triggerRef.current = link;
      show(key, true, link);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [byKey, show]);

  // After the chosen project's content is in the DOM: open, reset scroll, lock the page, focus.
  // useLayoutEffect, not useEffect: when show()/hide() run this inside a View Transition's
  // callback (via flushSync), the browser takes its "after" snapshot as soon as that callback
  // returns -- a passive effect isn't guaranteed to have run by then, a layout effect is.
  useLayoutEffect(() => {
    const d = dialogRef.current;
    if (!d || !openKey) return;
    if (!d.open) {
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', ''); // browsers without <dialog> methods: open, not modal
    }
    d.scrollTop = 0;
    document.documentElement.classList.add('sheet-open');
    headingRef.current?.focus({ preventScroll: true });
  }, [openKey]);

  useEffect(() => () => document.documentElement.classList.remove('sheet-open'), []);

  return (
    <dialog
      ref={dialogRef}
      className="sheet"
      aria-labelledby="sheet-name"
      onCancel={(e) => {
        e.preventDefault(); // run our own close so the exit animation plays
        hide(true);
      }}
      onClose={() => {
        // The browser can force a close (repeated Esc); keep the URL and state honest.
        clearSheetHash();
        finish();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) hide(true); // the backdrop
      }}
    >
      {current && <SheetBody project={current} projects={projects} locale={locale} headingRef={headingRef} onClose={() => hide(true)} />}
    </dialog>
  );
}

// Assistive-tech attributes for a picture that is a drawing or a vignette: an image with the
// row's alt text when there is one, hidden when there is not (never a nameless role="img").
function pictureA11y(alt: string) {
  return alt ? ({ role: 'img', 'aria-label': alt } as const) : ({ 'aria-hidden': true } as const);
}

// The sheet's own [data-vt="shot"] media -- the "before"/"after" side of A07's shared-element
// transition (see the file header). Every branch renders exactly one: a real screenshot ('img'
// -- no address bar; 'win' -- with one, from its live URL's host), the drawn TAM/SAM/SOM rings or
// five-apps-become-one strip ('rings'/'five', receipts rule: never a stand-in screenshot for a
// business play that has none), or this site's own Notion row, drawn as a window ('notion').
// null (no media block at all) only for a pre-migration row with no screenshot -- there is
// nothing to name for the transition either, which runShotTransition already treats as "fall
// back to the plain exit animation".
function SheetMedia({ project, locale }: { project: Project; locale: Locale }) {
  const t = dict[locale];
  const alt = project.alt?.[locale] ?? '';

  // Business plays carry their receipts as line drawings (Talatify's TAM/SAM/SOM rings,
  // Tripedia's five apps -> one), never a stand-in screenshot.
  if (project.media === 'rings' || project.media === 'five') {
    return (
      <div className="smedia" data-media={project.media} data-vt="shot">
        <div className="smedia-draw" {...pictureA11y(alt)}>
          {/* C-6: the rings drawing gets its own "not to scale" caption (prototype copy); the
              five drawing has none. */}
          <Sketch name={project.media} caption={project.media === 'rings' ? t.sheetRingsCaption : undefined} />
        </div>
      </div>
    );
  }

  // This site's own Notion row, drawn as a window: the thing the visitor is reading, at its source.
  // Labels are Notion's property names and select literals, so they stay English on /th too.
  if (project.media === 'notion') {
    const rows = (
      [
        ['Name', project.name],
        ['Type', project.type === 'business' ? 'Business' : 'Build'],
        ['Stack', project.stack.join(' · ')],
        ['Status', project.status?.en ?? ''],
      ] as const
    ).filter(([, value]) => value);
    return (
      <div className="smedia" data-media="notion" data-vt="shot">
        <div className="win sheet-win" {...pictureA11y(alt)}>
          <div className="sheet-bar">
            <i />
            <i />
            <i />
            <span>Notion · Projects</span>
          </div>
          <div className="sheet-notion">
            {rows.map(([label, value]) => (
              <div key={label} className="sheet-notion-row">
                <b>{label}</b>
                <span>{value}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="sheet-note">{t.sheetNotionNote}</p>
      </div>
    );
  }

  // 'img' / 'win': a real screenshot or nothing (receipts rule) -- a pre-migration row with no
  // image gets no media block at all. 'win' adds the address bar from the live URL.
  if (!project.imageSrc) return null;
  const host = project.media === 'win' ? hostOf(project.liveUrl) : null;
  return (
    <div className="smedia" data-media={project.media} data-vt="shot" style={{ '--wash': washVar(project.wash) } as CSSProperties}>
      <div className="win sheet-win">
        {host && (
          <div className="sheet-bar" aria-hidden="true">
            <i />
            <i />
            <i />
            <span>{host}</span>
          </div>
        )}
        {/* S-5: the real files (public/images/*.jpg) are 1580x900, not the brief's nominal
            1600x900 -- checked directly, so this reserves the exact box (no CLS). Dark mode's
            dim comes free from globals.css's `.win img { filter: var(--shot-dim); }` (C-5). */}
        <img src={project.imageSrc} alt={alt || imageAlt(project.imageSrc, project.name)} width={1580} height={900} decoding="async" />
      </div>
    </div>
  );
}

// "Same idea, four years apart": shown on both ends of the pair. The question row comes from
// the two Project rows; the other rows are the prototype's fixed comparison copy (ruling C-10:
// this and the other lineage/signature strings live in code, not Notion).
function LineageCard({ lineage, locale }: { lineage: Lineage; locale: Locale }) {
  const t = dict[locale];
  const { earlier, later } = lineage;
  const rows: (readonly string[])[] = [
    [t.lineageQuestion, unbreak(earlier.question?.[locale] ?? ''), unbreak(later.question?.[locale] ?? '')],
    t.lineageExisted,
    t.lineageTeam,
    t.lineageResult,
  ];
  return (
    <section className="lin" aria-labelledby="sheet-lineage">
      <h3 id="sheet-lineage">
        <ThaiText text={t.lineageTitle} />
      </h3>
      <table>
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">{t.lineageRowHead}</span>
            </th>
            <th scope="col">{`${SIG_YEARS[0]} · ${earlier.name}`}</th>
            <th scope="col">{`${SIG_YEARS[SIG_YEARS.length - 1]} · ${later.name}`}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, a, b]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              <td>{a}</td>
              <td>{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function SheetBody({ project, projects, locale, headingRef, onClose }: SheetBodyProps) {
  const t = dict[locale];
  const kicker = project.kicker?.[locale];
  const question = project.question?.[locale];
  const outcomes = project.outcomes[locale];
  const lineage = lineageFor(project, projects);

  return (
    <>
      {/* C-5: .ctl (globals.css) is P0's own "sheet close" surface (blur, fill, every
          reduced-transparency/forced-colors fallback) -- this button only adds its own
          position and size on top of it, not a second background. */}
      <button type="button" className="sheet-close ctl" aria-label={t.sheetClose} onClick={onClose}>
        <Icon name="x" />
      </button>
      <SheetMedia project={project} locale={locale} />
      <div className="sbody">
        <div>
          {kicker && <p className="sheet-kick">{kicker}</p>}
          <h2 id="sheet-name" ref={headingRef} tabIndex={-1} className="sheet-name">
            {/* C-9: a project name can be Thai (a future Notion row), so it gets the same
                keep-run treatment as every other heading, even though today's fixtures are
                all Latin brand names and render unchanged. */}
            <ThaiText text={project.name} display />
          </h2>
          {question && (
            <p className="sheet-q">
              <ThaiText text={question} />
            </p>
          )}
          <h3>{t.sheetWhat}</h3>
          <p className="sheet-desc">{project.description[locale]}</p>
        </div>
        <div className="sheet-side">
          {project.status && (
            <>
              <h3>{t.sheetStatus}</h3>
              <StatusChip project={project} locale={locale} />
            </>
          )}
          {outcomes.length > 0 && (
            <>
              <h3>{t.sheetOutcomes}</h3>
              <ul className="sheet-list">
                {outcomes.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </>
          )}
          {project.stack.length > 0 && (
            <>
              <h3>{t.sheetStack}</h3>
              <div className="sheet-chips">
                {project.stack.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
            </>
          )}
          {(project.liveUrl || project.repoUrl) && (
            <div className="sheet-links">
              {project.liveUrl && (
                // GoNai's green belongs to GoNai alone (spec §5.1): keyed on its wash, not its name.
                <a
                  className={project.wash === 'gonai' ? 'btn btn-fill sheet-gonai' : 'btn btn-fill'}
                  href={project.liveUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t.workOpenApp} <span aria-hidden="true">↗</span>
                </a>
              )}
              {project.repoUrl && (
                <a className="btn btn-out" href={project.repoUrl} target="_blank" rel="noreferrer">
                  {t.viewCode} <span aria-hidden="true">↗</span>
                </a>
              )}
            </div>
          )}
          {project.slug && (
            <Link className="sheet-story" href={`/${locale}/work/${project.slug}`}>
              {t.readStory} <span aria-hidden="true">›</span>
            </Link>
          )}
        </div>
      </div>
      {lineage && <LineageCard lineage={lineage} locale={locale} />}
    </>
  );
}
