'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { flushSync } from 'react-dom';
import './project-sheet.css';
import './film-sheet.css';
import { Icon } from '@/components/icons';
import ThaiText from '@/components/ThaiText';
import { dict } from '@/lib/dictionary';
import { FILM_BEATS, FILM_HASH, FILM_LABEL, filmCuts } from '@/lib/film';
import type { Locale } from '@/lib/models';
import { motionAllowed, saveDataOn } from '@/lib/motion';
import { PHONE_QUERY } from '@/lib/project-clips';

// The film sheet (spec 2026-10-01-film-og §4.2): one native <dialog> on the home page, next to
// ProjectSheet, on the same shell (project-sheet.css: radius, backdrop, phone grabber, the
// close button's look). It mirrors ProjectSheet's routing at `#film`, opened three ways --
//   1. a click on any `a[data-film]` (the tour pill's Film button) -> pushState `#film`, so Back
//      closes it; the only open that plays, from the click itself (sound on), unless reduced
//      motion or Save-Data;
//   2. a page load whose URL already carries `#film` (never plays);
//   3. `hashchange` / `popstate` landing on `#film` (never plays).
// Esc, the close button and a backdrop click pause, replaceState the hash away and hand focus
// back to the button. Any other hash closes it, which is also how it stays out of
// ProjectSheet's way: `#work/<key>` closes the film and opens that project.
//
// Nothing film-related loads until it opens: the dialog renders empty (server HTML included),
// and the <video> -- poster and sources -- exists only while it is open.

const EXIT_MS = 280; // .sheet.closing in project-sheet.css

type Cut = 'wide' | 'square';

function clearFilmHash() {
  if (window.location.hash === FILM_HASH) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

const anotherDialogOpen = () => document.querySelector('dialog[open]') !== null;

export default function FilmSheet({ locale }: { locale: Locale }) {
  const t = dict[locale];
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const exitTimer = useRef(0);
  // Back fires popstate then hashchange; both land on hide(). One close at a time.
  const closing = useRef(false);
  // Which cut is showing, chosen once at open (a rotation while open does not swap it); null =
  // closed, and no <video> in the page.
  const [cut, setCut] = useState<Cut | null>(null);

  const show = useCallback(() => {
    window.clearTimeout(exitTimer.current);
    closing.current = false;
    dialogRef.current?.classList.remove('closing');
    const phone = typeof matchMedia === 'function' && matchMedia(PHONE_QUERY).matches;
    setCut((open) => open ?? (phone ? 'square' : 'wide'));
  }, []);

  // Idempotent: the close button, Esc, Back and the dialog's own `close` event can all land
  // here, sometimes twice for one close.
  const finish = useCallback(() => {
    const d = dialogRef.current;
    const trigger = triggerRef.current;
    triggerRef.current = null;
    window.clearTimeout(exitTimer.current);
    closing.current = false;
    videoRef.current?.pause();
    if (d) {
      d.classList.remove('closing');
      if (d.open) {
        if (typeof d.close === 'function') d.close();
        else d.removeAttribute('open');
      }
    }
    // A project sheet opened by the same hash change keeps the page locked and keeps focus.
    if (!anotherDialogOpen()) document.documentElement.classList.remove('sheet-open');
    setCut(null);
    if (trigger && !anotherDialogOpen()) trigger.focus({ preventScroll: true });
  }, []);

  const hide = useCallback(
    (clearHash: boolean) => {
      if (clearHash) clearFilmHash();
      videoRef.current?.pause(); // the sound stops now, not after the exit animation
      const d = dialogRef.current;
      if (!d || !d.open) {
        finish();
        return;
      }
      if (closing.current) return;
      closing.current = true;
      if (!motionAllowed()) {
        finish();
        return;
      }
      d.classList.add('closing');
      exitTimer.current = window.setTimeout(finish, EXIT_MS);
    },
    [finish],
  );

  // The URL is the source of truth: #film is open, anything else is closed.
  const sync = useCallback(() => {
    if (window.location.hash === FILM_HASH) show();
    else if (dialogRef.current?.open) hide(false);
  }, [show, hide]);

  useEffect(() => {
    sync(); // a URL loaded with #film opens the sheet (and does not play)
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, [sync]);

  // The Film button stays a real link to the 16:9 file (it works without JS); with JS a plain
  // click opens the sheet in place and starts the film from that click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>('a[data-film]') : null;
      if (!link) return;
      e.preventDefault();
      triggerRef.current = link;
      if (window.location.hash !== FILM_HASH) window.history.pushState(null, '', FILM_HASH);
      // Rendered synchronously, so play() below still runs inside the click (sound allowed).
      flushSync(show);
      const video = videoRef.current;
      if (video && motionAllowed() && !saveDataOn()) {
        const started = video.play() as Promise<void> | undefined;
        started?.catch(() => {}); // refused (Low Power Mode, a policy): poster and controls stay
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [show]);

  // Once the video is in the DOM: open, reset scroll, lock the page, focus the heading. A layout
  // effect, so the click handler's flushSync has an open dialog before it calls play().
  useLayoutEffect(() => {
    const d = dialogRef.current;
    if (!d || !cut) return;
    if (!d.open) {
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', '');
    }
    d.scrollTop = 0;
    document.documentElement.classList.add('sheet-open');
    headingRef.current?.focus({ preventScroll: true });
  }, [cut]);

  // A hidden tab never keeps playing.
  useEffect(() => {
    if (!cut) return;
    const onVisibility = () => {
      if (document.hidden) videoRef.current?.pause();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [cut]);

  useEffect(
    () => () => {
      if (!anotherDialogOpen()) document.documentElement.classList.remove('sheet-open');
    },
    [],
  );

  const file = cut ? filmCuts(locale)[cut] : null;

  return (
    <dialog
      ref={dialogRef}
      className="sheet film-sheet"
      aria-labelledby="film-title"
      onCancel={(e) => {
        e.preventDefault(); // run our own close so the exit animation plays
        hide(true);
      }}
      onClose={() => {
        // The browser can force a close (repeated Esc); keep the URL and state honest.
        clearFilmHash();
        finish();
      }}
      onClick={(e) => {
        // A backdrop click: a click on the dialog element itself, outside its box (the same
        // check as ProjectSheet -- an inner control's keyboard click lands on that control).
        if (e.target !== e.currentTarget) return;
        const r = e.currentTarget.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) hide(true);
      }}
    >
      {file && (
        <>
          {/* The header row sits above the film, so no control ever covers it (the square cut
              keeps its words in its top 84 px). */}
          <div className="film-head">
            <h2 id="film-title" ref={headingRef} tabIndex={-1} className="film-title">
              <ThaiText text={t.filmTitle} />
            </h2>
            <button type="button" className="sheet-close ctl" aria-label={t.sheetClose} onClick={() => hide(true)}>
              <Icon name="x" />
            </button>
          </div>
          <video
            ref={videoRef}
            className="film-video"
            controls
            playsInline
            preload="none"
            poster={file.poster}
            width={file.width}
            height={file.height}
            aria-label={FILM_LABEL[locale]}
            style={{ '--film-ratio': `${file.width} / ${file.height}` } as CSSProperties}
          >
            <source src={file.webm} type="video/webm" />
            <source src={file.mp4} type="video/mp4" />
          </video>
          <div className="film-body">
            <p className="film-meta">{t.filmMeta}</p>
            {/* The text alternative: every word on screen, beat by beat (spec §3.1). */}
            <details className="film-text">
              <summary>{t.filmTextVersion}</summary>
              <ol>
                {FILM_BEATS.map((beat) => (
                  <li key={beat.at}>
                    {beat.lines[locale].map((line, i) => (
                      <p key={i}>
                        <ThaiText text={line} />
                      </p>
                    ))}
                  </li>
                ))}
              </ol>
            </details>
          </div>
        </>
      )}
    </dialog>
  );
}
