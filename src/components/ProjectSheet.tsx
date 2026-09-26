'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import './project-sheet.css';
import { Icon } from '@/components/icons';
import ThaiText from '@/components/ThaiText';
import { dict } from '@/lib/dictionary';
import type { Locale, Project } from '@/lib/models';
import { parseSheetHash, projectKey, sheetHash } from '@/lib/sheet-url';

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
// querySelector. Task 10 gives the sheet itself a matching `[data-vt="shot"]` media element
// inside .sbody; until it exists, the "after" side of an opening transition (or the "before"
// side of a closing one) is simply absent, which the code below already treats as "nothing to
// name there" -- no change needed once Task 10 lands. See the report's Interfaces note.

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

function SheetBody({ project, locale, headingRef, onClose }: SheetBodyProps) {
  const t = dict[locale];
  return (
    <>
      {/* C-5: .ctl (globals.css) is P0's own "sheet close" surface (blur, fill, every
          reduced-transparency/forced-colors fallback) -- this button only adds its own
          position and size on top of it, not a second background. */}
      <button type="button" className="sheet-close ctl" aria-label={t.sheetClose} onClick={onClose}>
        <Icon name="x" />
      </button>
      <div className="sbody">
        <div>
          <h2 id="sheet-name" ref={headingRef} tabIndex={-1} className="sheet-name">
            {/* C-9: a project name can be Thai (a future Notion row), so it gets the same
                keep-run treatment as every other heading, even though today's fixtures are
                all Latin brand names and render unchanged. */}
            <ThaiText text={project.name} display />
          </h2>
        </div>
      </div>
    </>
  );
}
