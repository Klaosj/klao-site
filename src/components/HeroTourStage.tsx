'use client';

import { useEffect, useId, useReducer, useRef, useState, type FocusEvent, type KeyboardEvent, type PointerEvent } from 'react';
import { preload } from 'react-dom';
import { Icon } from '@/components/icons';
import ThaiText from '@/components/ThaiText';
import { dict } from '@/lib/dictionary';
import { fill } from '@/lib/format';
import type { Locale, ProjectWash } from '@/lib/models';
import type { TourSlide, TourVignette } from '@/lib/project-tour';
import { initialTourState, tourReducer } from '@/lib/tour-player';
import './hero-tour-stage.css';

const WASH: Record<ProjectWash, string> = {
  aje: 'var(--w-aje)',
  gonai: 'var(--w-gonai)',
  site: 'var(--w-site)',
  none: 'var(--mist)',
};
/** The crossfade takes 700 ms (CSS); the frame underneath goes a beat later. */
const SETTLE_MS = 800;
/** The camera keeps pushing through the next crossfade (prototype: dwell + 700). */
const CAMERA_TAIL_MS = 700;
/** The phone captures (P5 T18-f): the 6:5 phone stage at 2x of a 390-wide
 *  screen. Size hints on the <source>, like the <img>'s, reserve the box. */
const PHONE_W = 780;
const PHONE_H = 650;
/** The phone stage's own breakpoint (hero-tour-stage.css), and the one above it. */
const PHONE_MQ = '(max-width: 734px)';
const DESK_MQ = '(min-width: 735px)';
/** A drag this long, and clearly more sideways than down, is a swipe. */
const SWIPE_PX = 40;
const KEY_STEP: Record<string, (index: number, count: number) => number> = {
  ArrowRight: (i) => i + 1,
  ArrowLeft: (i) => i - 1,
  Home: () => 0,
  End: (_, count) => count - 1,
};

function saveDataOn(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return connection?.saveData === true;
}

type Props = { slides: TourSlide[]; vignette: TourVignette; locale: Locale };

/**
 * The hero tour (spec §6; prototype `tour`). It plays once through the tour
 * projects and ends on the last frame (klao-site's Notion-row vignette) with a
 * subtitle that leads into the Signature scene. Kept from the old tour: pause
 * on hover, focus, a hidden tab or out of view; reduced motion synced after
 * mount. Changed: no loop, a top-layer crossfade only, a slow 1.00 → 1.03
 * camera push, Pause first in the tab order, and a hold while a dialog is
 * open over the page.
 *
 * Timing: one JS clock (a setTimeout per frame, with the remaining time kept
 * across pauses) decides when frames change. Everything visual is a CSS
 * animation whose play-state follows `data-hold` on the section, so a paused
 * tour freezes where it stands. The playback rules live in tour-player.ts.
 *
 * Server render (and first paint without JS) is the idle state: the first
 * frame is on, with its subtitle, and nothing is hidden inline.
 */
export default function HeroTourStage({ slides, vignette, locale }: Props) {
  const t = dict[locale];
  const count = slides.length;
  const uid = useId();
  const [s, dispatch] = useReducer(tourReducer, initialTourState);
  const [reduced, setReduced] = useState(false);
  const [canHover, setCanHover] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [focusInside, setFocusInside] = useState(false);
  const [inView, setInView] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const playRef = useRef<HTMLButtonElement>(null);
  const dotRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const swipeFrom = useRef<{ x: number; y: number } | null>(null);
  const clock = useRef({ key: '', left: 0 });

  const autoplay = s.phase === 'playing' || s.phase === 'paused';
  const ended = s.phase === 'done';
  const held = hovering || focusInside || !inView || pageHidden || dialogOpen;
  const running = s.phase === 'playing' && !held;

  // Media preferences are read after mount, so the server HTML and the first
  // client render agree (no hydration mismatch for reduced-motion visitors).
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    setCanHover(matchMedia('(hover: hover)').matches);
    const onChange = (e: MediaQueryListEvent) => {
      setReduced(e.matches);
      if (e.matches) dispatch({ type: 'stop' });
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    // Fix round 1 (Important #7): a browser may deliver more than one entry
    // in a single callback (e.g. two threshold crossings coalesced into one
    // frame); the LAST one is the current state, not the first.
    const io = new IntersectionObserver(
      (entries) => setInView(entries[entries.length - 1].intersectionRatio >= 0.5),
      { threshold: [0, 0.5, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const sync = () => setPageHidden(document.hidden);
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  // P1 final review I-2: hold while a modal dialog (a project sheet, ⌘K, the
  // phone menu) covers the page, so the tour doesn't move on behind it. All
  // three open with the `open` attribute, which is the one change watched;
  // <details> toggles it too, hence the check for a dialog.
  useEffect(() => {
    const sync = () => setDialogOpen(document.querySelector('dialog[open]') !== null);
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
    return () => mo.disconnect();
  }, []);

  // Plays once: the only automatic start is from 'idle', the first time at
  // least half of the stage is in view. Never under reduced motion or Save-Data.
  useEffect(() => {
    if (s.phase === 'idle' && inView && !reduced && count > 1 && !saveDataOn()) dispatch({ type: 'start', at: 0 });
  }, [s.phase, inView, reduced, count]);

  // The clock. A new (run, frame) pair takes that frame's full dwell; a pause
  // or hold keeps whatever time was left.
  const clockKey = `${s.run}:${s.index}`;
  useEffect(() => {
    if (!running) return;
    if (clock.current.key !== clockKey) clock.current = { key: clockKey, left: slides[s.index].dwellMs };
    const startedAt = Date.now();
    let fired = false;
    const id = setTimeout(() => {
      fired = true;
      dispatch({ type: 'advance', count });
    }, clock.current.left);
    return () => {
      clearTimeout(id);
      if (!fired) clock.current.left = Math.max(0, clock.current.left - (Date.now() - startedAt));
    };
  }, [running, clockKey, slides, s.index, count]);

  // Drop the frame underneath once the new one has fully faded in on top.
  useEffect(() => {
    if (s.under === null) return;
    const id = setTimeout(() => dispatch({ type: 'settled' }), SETTLE_MS);
    return () => clearTimeout(id);
  }, [s.under, s.index]);

  const go = (to: number, moveFocus = false) => {
    if (count === 0) return;
    const next = ((to % count) + count) % count;
    dispatch({ type: 'go', to: next, count });
    if (moveFocus) dotRefs.current[next]?.focus();
  };

  const onPlay = () => {
    if (s.phase === 'playing') dispatch({ type: 'pause' });
    else if (s.phase === 'paused') dispatch({ type: 'resume' });
    else dispatch({ type: 'start', at: ended ? 0 : s.index });
  };

  const onDotsKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = KEY_STEP[e.key];
    if (!step) return;
    e.preventDefault();
    go(step(s.index, count), true);
  };

  // Focus anywhere in the tour holds it, so a keyboard visitor reading a
  // subtitle is never overtaken, except on Play/Pause itself, the control
  // whose whole job is to let the tour run.
  const onFocus = (e: FocusEvent<HTMLElement>) => setFocusInside(e.target !== playRef.current);
  const onBlur = () => setFocusInside(false);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    swipeFrom.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const from = swipeFrom.current;
    swipeFrom.current = null;
    if (!from) return;
    const dx = e.clientX - from.x;
    const dy = e.clientY - from.y;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > 1.5 * Math.abs(dy)) go(s.index + (dx < 0 ? 1 : -1));
  };

  const of = (n: number) => fill(t.tourOf, { n, total: count });
  // P5 T18-f: the first frame is the LCP image. React preloads an eager
  // server-rendered <img> by itself, but not one inside a <picture> (a
  // <source> may win), so the stage asks for it: per screen size when a
  // phone capture exists, so each screen fetches only the file it shows.
  const first = slides[0];
  if (first?.src && first.media === 'img') {
    if (first.phoneSrc) {
      preload(first.src, { as: 'image', fetchPriority: 'high', media: DESK_MQ });
      preload(first.phoneSrc, { as: 'image', fetchPriority: 'high', media: PHONE_MQ });
    } else {
      preload(first.src, { as: 'image', fetchPriority: 'high' });
    }
  }

  const current = slides[s.index];
  const playLabel = ended ? t.tourReplay : s.phase === 'playing' ? t.tourPause : t.tourPlay;
  // The vignette plays its EN -> TH beat while autoplay sits on it; at rest it
  // shows EN before the tour has run and TH after (prototype vigBeat).
  const beatFor = (i: number): VignetteBeat => (i === s.index && autoplay ? 'play' : s.phase === 'idle' ? 'en' : 'th');

  return (
    <section
      id="tour"
      className="ht-tour"
      aria-roledescription="carousel"
      aria-label={t.tourListLabel}
      data-hold={held || s.phase === 'paused' ? '' : undefined}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <div className="ht-stage-z">
        <div
          ref={stageRef}
          className="ht-stage"
          onPointerEnter={canHover ? () => setHovering(true) : undefined}
          onPointerLeave={canHover ? () => setHovering(false) : undefined}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          {slides.map((slide, i) => {
            const on = i === s.index || i === s.under;
            const camera = (autoplay || ended) && on;
            return (
              <div
                key={slide.id}
                id={`${uid}-slide-${i}`}
                className="ht-slide"
                role="tabpanel"
                aria-roledescription="slide"
                aria-label={of(i + 1)}
                aria-hidden={i === s.index ? undefined : true}
                data-on={on ? '' : undefined}
                data-top={i === s.index && s.under !== null ? '' : undefined}
                data-wash={slide.wash}
                style={{ ['--ht-wash' as string]: WASH[slide.wash] }}
              >
                <div className="ht-card">
                  {slide.media === 'notion' ? (
                    <Vignette vignette={vignette} beat={beatFor(i)} />
                  ) : slide.src ? (
                    // P5 T18-f (CO-06): the prototype's art direction -- a phone
                    // gets the project's own 6:5 capture when it has one (a
                    // <source> the browser reads before the <img>); otherwise
                    // the phone stage keeps centre-cropping the desktop shot.
                    <picture className="ht-pic">
                      {slide.phoneSrc && (
                        <source media={PHONE_MQ} srcSet={slide.phoneSrc} width={PHONE_W} height={PHONE_H} />
                      )}
                      <img
                        className="ht-cam"
                        src={slide.src}
                        alt={slide.alt}
                        width={1580}
                        height={900}
                        loading={i === 0 ? 'eager' : 'lazy'}
                        fetchPriority={i === 0 ? 'high' : undefined}
                        decoding="async"
                        data-run={camera ? '' : undefined}
                        style={{ ['--ht-cam-ms' as string]: `${slide.dwellMs + CAMERA_TAIL_MS}ms` }}
                      />
                    </picture>
                  ) : null}
                </div>
              </div>
            );
          })}
          {reduced && count > 1 && (
            <>
              <button type="button" className="ht-paddle ht-prev ctl" aria-label={t.tourPrev} onClick={() => go(s.index - 1)}>
                <Icon name="caret-left" />
              </button>
              <button type="button" className="ht-paddle ht-next ctl" aria-label={t.tourNext} onClick={() => go(s.index + 1)}>
                <Icon name="caret-right" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="ht-pill glass glass-pill">
        {!reduced && count > 1 && (
          <button
            ref={playRef}
            type="button"
            className="ht-play ctl"
            aria-label={playLabel}
            // Fix round 1 (Important #6): Replay (phase 'done') is a
            // one-shot action, not a toggle -- it must not claim a pressed
            // state either way. aria-pressed only ever applies to the
            // Pause/Play toggle itself.
            aria-pressed={ended ? undefined : s.phase === 'paused'}
            onClick={onPlay}
          >
            {ended ? (
              <ReplayGlyph />
            ) : (
              // Polish A04: a clip-path morph on a 20 px glyph (named
              // exception, master Global Constraints), not an icon swap.
              // `data-paused` is the glyph's own visual state -- it tracks
              // "not playing" (idle/paused/manual all look like Play), which
              // is broader than aria-pressed's "phase is exactly 'paused'".
              <span className="ht-pp" aria-hidden="true" data-paused={s.phase !== 'playing' ? '' : undefined}>
                <i />
                <i />
              </span>
            )}
          </button>
        )}
        <div className="ht-cap" aria-live={s.phase === 'playing' ? 'off' : 'polite'}>
          {/* Keyed so a new subtitle remounts and replays its small entrance;
              the live region around it stays put so it can announce. */}
          <div key={ended ? 'end' : current.id} className="ht-cap-in">
            {ended ? (
              <a className="ht-q" href="#signature">
                <span className="ht-qt">
                  <ThaiText text={t.tourEndTitle} display />
                </span>
              </a>
            ) : current.href ? (
              // P1 final review I-2: following the caption is a visitor pick
              // (spec §6), so it stops the tour on this frame. Played on, the
              // frame would change behind the sheet and this keyed <a> would
              // be recreated, leaving the sheet's close nothing to hand focus
              // back to.
              <a className="ht-q" href={current.href} onClick={() => dispatch({ type: 'stop' })}>
                <span className="ht-qt">
                  <ThaiText text={current.question} display />
                </span>
                <span className="ht-chev" aria-hidden="true">
                  ›
                </span>
              </a>
            ) : (
              // S-7 (carried from ProjectsIndex's Row): a project with no sheet to open
              // (Thai-only name, no Notion Slug) gets `href: null` from toTourSlides, not the
              // unparseable '#work/'. Plain text, not a link to nowhere -- and no chevron,
              // which would promise a click that does nothing.
              <span className="ht-q">
                <span className="ht-qt">
                  <ThaiText text={current.question} display />
                </span>
              </span>
            )}
            <span className="ht-k">{ended ? t.tourEndKicker : current.kicker}</span>
          </div>
        </div>
        {count > 1 && (
          <div className="ht-dots" role="tablist" aria-label={t.tourChapters} onKeyDown={onDotsKey}>
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                ref={(el) => {
                  dotRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                className="ht-dot"
                aria-selected={i === s.index}
                aria-controls={`${uid}-slide-${i}`}
                aria-label={`${slide.name} · ${of(i + 1)}`}
                tabIndex={i === s.index ? 0 : -1}
                data-done={ended || (i < s.index && s.phase !== 'idle') ? '' : undefined}
                onClick={() => go(i)}
              >
                <i>
                  <b
                    data-run={autoplay && i === s.index ? '' : undefined}
                    style={{ ['--ht-ms' as string]: `${slide.dwellMs}ms` }}
                  />
                </i>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

type VignetteBeat = 'en' | 'th' | 'play';

/**
 * klao-site's frame: the site's own headline as a Notion row, then as the page
 * it becomes, English first and Thai 3.2 s later (prototype renderVignette).
 * It depicts Notion's light UI, so its colours and labels are fixed on
 * purpose, not tokens or dictionary copy. Decorative: the subtitle below
 * carries the meaning.
 */
function Vignette({ vignette, beat }: { vignette: TourVignette; beat: VignetteBeat }) {
  return (
    <div className="ht-vig" data-beat={beat} aria-hidden="true">
      <div className="ht-vig-n">
        <div className="ht-vt">Notion · Site copy</div>
        <div className="ht-vrow" data-row="en">
          <b>Title EN</b>
          <span lang="en">{vignette.titleEn}</span>
          <i className="ht-ul" />
        </div>
        <div className="ht-vrow" data-row="th">
          <b>Title TH</b>
          {/* Fix round 2 (#4): this row is forced to one line on phone
              (nowrap + ellipsis, hero-tour-stage.css) to leave room for the
              headline below -- the `|` only ever marked where THAT text is
              allowed to wrap, which no longer applies once it never wraps
              here. Left in, it would still make ThaiText emit two adjacent
              keep-runs with a <wbr> between them, an explicit break
              opportunity `white-space: nowrap` does not suppress (it only
              disables ordinary space-based wrapping) -- so the row would
              still take two lines despite nowrap. Stripped, keepRuns sees
              one Thai token instead of two, so no <wbr> and no forced break. */}
          <span lang="th">
            <ThaiText text={vignette.titleTh.replace(/\|/g, '')} display />
          </span>
          <i className="ht-ul" />
        </div>
        <div className="ht-vrow" data-row="status">
          <b>Status</b>
          <span>Published</span>
        </div>
      </div>
      <div className="ht-vig-h">
        {vignette.photoSrc && <img src={vignette.photoSrc} alt="" width={36} height={36} loading="lazy" />}
        <div className="ht-vh1" data-v="en" lang="en">
          {vignette.titleEn}
        </div>
        <div className="ht-vh1" data-v="th" lang="th">
          <ThaiText text={vignette.titleTh} display />
        </div>
        <small>klao-site · EN / TH</small>
      </div>
    </div>
  );
}

/** Replay glyph (prototype, inline: not part of the Phosphor subset). */
function ReplayGlyph() {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4v4h4"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
