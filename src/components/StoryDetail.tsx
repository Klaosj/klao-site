'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import BoldText from '@/components/BoldText';
import { Icon } from '@/components/icons';
import Reveal from '@/components/motion/Reveal';
import { Sketch } from '@/components/sketches';
import ThaiText from '@/components/ThaiText';
import type { UiDict } from '@/lib/dictionary';
import type { Locale, StoryChapter } from '@/lib/models';
import { isStoryIcon, isStorySketch } from '@/lib/story';

type Detail = 'short' | 'full';
const DETAIL_OPTIONS: readonly Detail[] = ['short', 'full'];
const STORY_DETAIL_KEY = 'klao-story-detail';
const isDetail = (value: unknown): value is Detail => value === 'short' || value === 'full';

// The three project-health states as shape + word (spec §5.1: status marks
// are monochrome): full, half and empty circle.
function HealthMark({ index }: { index: number }) {
  if (index === 0) {
    return (
      <svg viewBox="0 0 12 12" aria-hidden="true">
        <circle cx="6" cy="6" r="5" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <circle cx="6" cy="6" r="4.4" fill="none" stroke="currentColor" strokeWidth="1.2" />
      {index === 1 && <path d="M6 1.6a4.4 4.4 0 0 1 0 8.8z" fill="currentColor" />}
    </svg>
  );
}

// Chapter 6 ("Know the week it slips.") shows the launch checklist's five
// phases and the three health words instead of a sketch (prototype PHASES /
// HEALTH). It attaches to the last chapter in Order. `hidden` follows the
// Short/Full choice the same way the sketch and body do (amendment A10):
// for the last chapter this strip is the "sketch" slot.
function LaunchPhases({ t, hidden }: { t: UiDict; hidden: boolean }) {
  return (
    <>
      <ol className="bd-phases" aria-label={t.storyPhasesLabel} hidden={hidden}>
        {t.storyPhases.map((phase) => (
          <li key={phase}>
            <ThaiText text={phase} />
          </li>
        ))}
      </ol>
      <ul className="bd-legend" hidden={hidden}>
        {t.storyHealth.map((word, i) => (
          <li key={word}>
            <HealthMark index={i} />
            {word}
          </li>
        ))}
      </ul>
    </>
  );
}

type Props = { chapters: StoryChapter[]; locale: Locale; t: UiDict };

/** The chapters list plus its Short/Full segmented control (amendment A10,
 *  polish plan row A10). Short shows only each chapter's number, rule label
 *  and title; Full also shows the body and the sketch (or, on the last
 *  chapter, the launch-phases strip that stands in for it). Reuses the ONE
 *  `.seg` segmented control ThemeToggle/LocaleToggle already define in
 *  globals.css (R19) -- no new segmented-control CSS here, only the `bd-seg`
 *  class that positions this instance above the chapters.
 *
 *  Every chapter's body and sketch are unconditionally in the server HTML:
 *  this component sets the native `hidden` attribute on the client only,
 *  after the mount effect below runs, so a visitor without JavaScript, and
 *  the pre-hydration frame, both read Full (global constraint: nothing this
 *  page ever renders is missing from the server HTML). The amendment's
 *  actual default (Short) is therefore applied by that effect, not by the
 *  initial `useState`, which starts at 'full' for exactly that reason. */
export default function StoryDetail({ chapters, locale, t }: Props) {
  const [detail, setDetail] = useState<Detail>('full');
  // Same mount-time guard as ThemeToggle/LocaleToggle's `data-ready`: before
  // it settles, the segmented control's own CSS transition (globals.css
  // `.seg:not([data-ready]) .thumb`) is suppressed, so the server's Full
  // guess snapping to the visitor's actual Short default never itself
  // plays as a slide.
  const [ready, setReady] = useState(false);
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    // Storage read: try/catch per amendment A10 -- Safari private mode and
    // "block site data" make localStorage throw on access, and a display
    // preference is never worth a crashed page.
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(STORY_DETAIL_KEY);
    } catch {
      stored = null;
    }
    setDetail(isDetail(stored) ? stored : 'short');
    const raf =
      typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => setReady(true)) : undefined;
    return () => {
      if (raf !== undefined) cancelAnimationFrame(raf);
    };
  }, []);

  const choose = (next: Detail) => {
    setDetail(next);
    try {
      window.localStorage.setItem(STORY_DETAIL_KEY, next);
    } catch {
      // Blocked or full storage: the choice still applies for this page view.
    }
  };

  // Same ARIA APG radiogroup arrow-key support as ThemeToggle (roving
  // tabindex below gives each button tabIndex 0 only when checked).
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const dir =
      e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const i = DETAIL_OPTIONS.indexOf(detail);
    const next = DETAIL_OPTIONS[(i + dir + DETAIL_OPTIONS.length) % DETAIL_OPTIONS.length];
    choose(next);
    btnRefs.current[DETAIL_OPTIONS.indexOf(next)]?.focus();
  };

  const short = detail === 'short';
  const last = chapters.length - 1;
  const labels: Record<Detail, string> = { short: t.storyShort, full: t.storyFull };

  return (
    <>
      <div
        role="radiogroup"
        aria-label={t.storyDetailLabel}
        className="seg bd-seg"
        data-ready={ready ? 'true' : undefined}
        style={{ ['--n' as string]: '2', ['--i' as string]: String(DETAIL_OPTIONS.indexOf(detail)) }}
        onKeyDown={onKeyDown}
      >
        <span className="thumb" aria-hidden="true" />
        {DETAIL_OPTIONS.map((option, i) => (
          <button
            key={option}
            ref={(el) => {
              btnRefs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={detail === option}
            tabIndex={detail === option ? 0 : -1}
            onClick={() => choose(option)}
          >
            <span className="seg-label" data-label={labels[option]}>
              {labels[option]}
            </span>
          </button>
        ))}
      </div>
      <ol className="bd-chapters">
        {chapters.map((chapter, i) => (
          <Reveal key={chapter.id} as="li" className="bd-ch">
            <i className="bd-dot" aria-hidden="true" />
            <div className="bd-ch-l">
              <span className="bd-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="bd-rule">
                {isStoryIcon(chapter.icon) && <Icon name={chapter.icon} />}
                <span>
                  <ThaiText text={chapter.rule[locale]} />
                </span>
              </span>
              {isStorySketch(chapter.sketch) ? (
                <span className="bd-sk" hidden={short}>
                  <Sketch name={chapter.sketch} />
                </span>
              ) : (
                // Keeps a sketch-less chapter's title level with its row
                // partner in the two-column layout (by-day.css). Fix wave
                // finding 1: it must follow Short/Full too -- a real sketch
                // collapses to zero height in Short, so this spacer has to
                // as well, or its chapter stays ~100px taller than its row
                // partner and its title sits that far below (only its
                // ≥1068px CSS box is decorative; visibility still tracks
                // the choice like every other sketch).
                <span className="bd-sk bd-sk-none" aria-hidden="true" hidden={short} />
              )}
            </div>
            <div className="bd-ch-r">
              <h3 className="t-title">
                <ThaiText text={chapter.title[locale]} display />
              </h3>
              <p className="bd-body" hidden={short}>
                <BoldText text={chapter.body[locale]} />
              </p>
              {i === last && <LaunchPhases t={t} hidden={short} />}
            </div>
          </Reveal>
        ))}
      </ol>
    </>
  );
}
