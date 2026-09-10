'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import './project-tour.css';
import ProjectFrame from '@/components/ProjectFrame';
import { dict } from '@/lib/dictionary';
import type { Locale, Project } from '@/lib/models';
import { TOUR_MS, tourProjects, windowTitle } from '@/lib/project-tour';

// The hero tour (spec 2026-09-10 §4): a vertical tablist of the projects that
// have a real screenshot, and one stage that shows the active one inside a
// window frame. Returns a Fragment of TWO siblings on purpose — TourBand's
// `.tour-band` grid places `.tour-list-wrap` in area "list" and `.tour-stage`
// in area "stage"; state has to live in one component, so this one owns both
// halves.
export default function ProjectTour({ projects, locale }: { projects: Project[]; locale: Locale }) {
  const t = dict[locale];
  const items = tourProjects(projects);
  const count = items.length;

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false); // the visitor pressed pause
  const [hovering, setHovering] = useState(false); // pointer or focus inside the band (tab list or stage), not just the stage
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const [announce, setAnnounce] = useState('');
  const stageRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const uid = useId();

  // Reduced motion is read in an effect (not lazily in useState) so the server
  // and the first client render agree — otherwise the play/pause control
  // would mismatch on hydration for visitors with the preference on.
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onChange = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  const playing = count > 1 && !reduced && !paused && !hovering && inView && pageVisible;

  // Shared across .tour-list-wrap and .tour-stage so pointer/focus inside
  // EITHER half of the band holds playback still (not just the stage) — one
  // object so the two elements cannot drift apart.
  const holdHandlers = {
    onMouseEnter: () => setHovering(true),
    onMouseLeave: () => setHovering(false),
    onFocus: () => setHovering(true),
    onBlur: () => setHovering(false),
  };

  // One timeout per slide, re-armed whenever the slide or the playing state
  // changes. Autoplay never announces (spec §4) — only visitor actions do.
  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => setIndex((i) => (i + 1) % count), TOUR_MS);
    return () => clearTimeout(id);
  }, [playing, index, count]);

  if (count === 0) return null;

  const safe = Math.min(index, count - 1);
  const current = items[safe];

  const select = (i: number, moveFocus = false) => {
    const next = (i + count) % count;
    setIndex(next);
    setAnnounce(`${items[next].name} · ${next + 1} / ${count}`);
    if (moveFocus) tabRefs.current[next]?.focus();
  };

  const onKey = (e: KeyboardEvent<HTMLOListElement>) => {
    const targets: Record<string, number> = {
      ArrowDown: safe + 1,
      ArrowRight: safe + 1,
      ArrowUp: safe - 1,
      ArrowLeft: safe - 1,
      Home: 0,
      End: count - 1,
    };
    if (!(e.key in targets)) return;
    e.preventDefault();
    select(targets[e.key], true);
  };

  const storyHref = current.slug ? `/${locale}/work/${current.slug}` : null;
  const kicker = current.type === 'business' ? t.workTypeBusiness : t.workTypeBuild;
  const line = (current.outcome ?? current.description)[locale];
  const panelId = `${uid}-panel`;
  const tabId = (i: number) => `${uid}-tab-${i}`;

  return (
    <>
      <div className="tour-list-wrap" data-tour-playing={playing ? 'true' : 'false'} {...holdHandlers}>
        {/* The band's real heading. TourBand wraps this component in a
            <section> with no heading of its own, so the label carries the
            section break — styled like SectionLabel (peri rule + 12px) in
            project-tour.css. */}
        <h2 className="tour-label">{t.tourLabel}</h2>
        <ol className="tour-list" role="tablist" aria-label={t.tourListLabel} aria-orientation="vertical" onKeyDown={onKey}>
          {items.map((p, i) => {
            const active = i === safe;
            return (
              <li key={p.id} role="presentation">
                <button
                  type="button"
                  role="tab"
                  id={tabId(i)}
                  aria-selected={active}
                  aria-controls={panelId}
                  tabIndex={active ? 0 : -1}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  onClick={() => select(i)}
                >
                  <small>{String(i + 1).padStart(2, '0')}</small>
                  <span>{p.name}</span>
                  {active && p.question && <em>{p.question[locale]}</em>}
                  {active && (
                    <i
                      // Remounted whenever playback restarts (index or playing
                      // changes) so the CSS fill animation always measures the
                      // timeout that is actually running -- otherwise a pause
                      // mid-fill leaves the bar full while the re-armed JS
                      // timer still has most of TOUR_MS left to run.
                      key={`${safe}-${playing}`}
                      className="tour-bar"
                      aria-hidden="true"
                      style={{ ['--tour-ms' as string]: `${TOUR_MS}ms` }}
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div
        ref={stageRef}
        className="tour-stage"
        role="tabpanel"
        id={panelId}
        aria-labelledby={tabId(safe)}
        {...holdHandlers}
      >
        {/* key swap = the only image in the DOM is the active one; the class
            fades/rises it in (450 ms, house curve; zeroed under reduced
            motion by project-tour.css's own rule, not the global one --
            globals.css's reduced-motion block lists selectors one by one and
            does not cover new classes). */}
        <div key={current.id} className="tour-enter">
          <ProjectFrame project={current} title={windowTitle(current)} />
        </div>
        <div className="tour-caption">
          <span className="tour-kicker">{kicker}</span>
          <span className="tour-line">{line}</span>
          {storyHref ? (
            <Link href={storyHref}>
              {t.readStory} <span aria-hidden="true">↗</span>
            </Link>
          ) : current.liveUrl ? (
            <a href={current.liveUrl} target="_blank" rel="noreferrer">
              {t.liveSite} <span aria-hidden="true">↗</span>
            </a>
          ) : current.repoUrl ? (
            <a href={current.repoUrl} target="_blank" rel="noreferrer">
              {t.viewCode} <span aria-hidden="true">↗</span>
            </a>
          ) : null}
        </div>
        <div className="tour-controls">
          <button type="button" aria-label={t.tourPrev} onClick={() => select(safe - 1)}>
            ‹
          </button>
          <span className="tour-count" aria-hidden="true">
            {safe + 1} / {count}
          </span>
          <button type="button" aria-label={t.tourNext} onClick={() => select(safe + 1)}>
            ›
          </button>
          {reduced ? (
            <span className="tour-still">{t.tourStill}</span>
          ) : (
            <button
              type="button"
              className="tour-toggle"
              aria-pressed={paused}
              aria-label={paused ? t.tourPlay : t.tourPause}
              onClick={() => setPaused((p) => !p)}
            >
              {paused ? '▶' : 'Ⅱ'}
            </button>
          )}
        </div>
        <span className="sr-only" aria-live="polite">
          {announce}
        </span>
      </div>
    </>
  );
}
