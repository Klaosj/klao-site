'use client';

import { Fragment, useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import ThaiText from '@/components/ThaiText';
import {
  CAREER_EVENT,
  careerDates,
  findCareerIndex,
  labelAlign,
  monthsBetween,
  pillYears,
  railLabelOffset,
  railModel,
  splitFigureValue,
} from '@/lib/career';
import { dict } from '@/lib/dictionary';
import type { CareerEntry, Locale } from '@/lib/models';

type Props = {
  entries: CareerEntry[];
  locale: Locale;
  // 'YYYY-MM', computed once on the server (currentYm). Durations use this,
  // never the client clock, so hydration always matches the server HTML.
  now: string;
};

// Desktop pill pitch: 56 px pill + 8 px gap. The server HTML places the
// detent with this so it already sits under the first pill before
// hydration; after hydration the real offset is measured (a pill that wraps
// to two lines is taller).
const PILL_PITCH = 64;

export default function CareerDetent({ entries, locale, now }: Props) {
  const t = dict[locale];
  const [selected, setSelected] = useState(0);
  // Only a visitor's own choice replays the panel entrance; the first paint
  // (server HTML and hydration) never animates.
  const [swapped, setSwapped] = useState(false);
  const pills = useRef<(HTMLButtonElement | null)[]>([]);
  const detent = useRef<HTMLSpanElement | null>(null);
  const railEl = useRef<HTMLDivElement | null>(null);
  const rlabEl = useRef<HTMLSpanElement | null>(null);

  const select = useCallback((index: number, focus: boolean) => {
    setSelected(index);
    setSwapped(true);
    if (focus) pills.current[index]?.focus();
  }, []);

  // Rail geometry for the selected role -- computed here, above the
  // `entries.length === 0` early return below, so the rail-label effect
  // (fix wave finding 3) can depend on `center` without breaking the rules
  // of hooks (every hook must run before any early return).
  const rail = railModel(entries, now);
  const center = rail?.centers[selected] ?? null;

  useEffect(() => {
    const pill = pills.current[selected];
    const el = detent.current;
    // offsetHeight is 0 without layout (jsdom, display:none on phone): keep
    // the pitch-based position from render in that case.
    if (!pill || !el || pill.offsetHeight === 0) return;
    el.style.setProperty('--dy', `${pill.offsetTop}px`);
    el.style.height = `${pill.offsetHeight}px`;
  }, [selected]);

  useEffect(() => {
    // Fix wave finding 3: `labelAlign`'s fixed 12/88% thresholds (used for
    // the CSS `data-align` fallback below) know nothing about the label's
    // actual rendered width, so a long one ("A Bun Dance · 20 mo") could
    // still clip at 390/360px. Once hydrated, measure the real rail and
    // label widths and clamp the label's own offset instead. Re-runs on
    // resize too, since the rail's width -- and so the clamp -- tracks the
    // viewport; window is the right target for that, not an ancestor.
    const update = () => {
      const railNode = railEl.current;
      const label = rlabEl.current;
      // clientWidth is 0 without layout (jsdom, or the marker not rendered
      // this selection): leave the CSS default (--lx unset -> -50%, same
      // as the server HTML) rather than clamp against a width of 0.
      if (!railNode || !label || center === null || railNode.clientWidth === 0) return;
      const lx = railLabelOffset(center, railNode.clientWidth, label.offsetWidth);
      label.style.setProperty('--lx', `${lx}px`);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [center]);

  useEffect(() => {
    // C8 (master plan): FAQ answers, ⌘K and the footer open a role by key. A
    // stale or unknown key does nothing; it never throws and never opens the
    // wrong role. Ruling C-4 (P3 preflight): this handler only SELECTS the
    // pill -- P4's `followTarget` owns scrolling the band into view and
    // moving focus, so neither happens here (avoids two owners fighting over
    // one scroll/focus).
    const onCareer = (event: Event) => {
      const key = (event as CustomEvent<{ key?: unknown } | null>).detail?.key;
      const index = findCareerIndex(entries, typeof key === 'string' ? key : '');
      if (index < 0) return;
      select(index, false);
    };
    window.addEventListener(CAREER_EVENT, onCareer);
    return () => window.removeEventListener(CAREER_EVENT, onCareer);
  }, [entries, select]);

  if (entries.length === 0) return null;

  const current = entries[Math.min(selected, entries.length - 1)];
  const next = entries[selected + 1];
  const dates = careerDates(current, now, {
    months: t.monthsShort,
    present: t.careerPresent,
    unit: t.careerMonthsUnit,
  });
  const nowWord = t.careerNow.toLowerCase();

  // Tabs pattern with automatic activation: focus and selection move together.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = entries.length - 1;
    let to: number | null = null;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') to = selected >= last ? 0 : selected + 1;
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') to = selected <= 0 ? last : selected - 1;
    else if (event.key === 'Home') to = 0;
    else if (event.key === 'End') to = last;
    if (to === null) return;
    event.preventDefault();
    select(to, true);
  };

  return (
    <>
      {rail && (
        // Decorative: the pills below carry the same choice for keyboard and
        // screen readers.
        <div className="car-rail" aria-hidden="true" ref={railEl}>
          <span className="car-rtrack" />
          {rail.segments.map((segment) => (
            <span
              key={segment.index}
              className="car-rseg"
              data-on={segment.index === selected}
              style={{ left: `${segment.left}%`, width: `calc(${segment.width}% - 3px)` }}
            />
          ))}
          {center !== null && current.start && (
            <span className="car-rmark" style={{ ['--mx' as string]: `${center}%` }}>
              <i />
              <span className="car-rlab" data-align={labelAlign(center)} ref={rlabEl}>
                {`${current.company} · ${monthsBetween(current.start, current.end ?? now)} ${t.careerMonthsUnit}`}
              </span>
            </span>
          )}
          <div className="car-ryears">
            {rail.ticks.map((tick) => (
              <span key={tick.year} data-first={tick.first} data-alt={tick.alt} style={{ left: `${tick.left}%` }}>
                {tick.year}
              </span>
            ))}
            <span data-now="true" style={{ left: '100%' }}>
              {t.careerNow}
            </span>
          </div>
        </div>
      )}
      <div className="car-grid">
        <div
          className="car-pills"
          role="tablist"
          aria-labelledby="career-h"
          aria-orientation="vertical"
          onKeyDown={onKeyDown}
        >
          <span
            ref={detent}
            className="car-detent"
            aria-hidden="true"
            style={{ ['--dy' as string]: `${selected * PILL_PITCH}px` }}
          />
          {entries.map((entry, index) => {
            const years = pillYears(entry, nowWord);
            return (
              <button
                key={entry.id}
                ref={(el) => {
                  pills.current[index] = el;
                }}
                type="button"
                role="tab"
                id={`career-tab-${index}`}
                className="car-pill"
                aria-selected={index === selected}
                aria-controls="career-panel"
                tabIndex={index === selected ? 0 : -1}
                onClick={() => select(index, false)}
              >
                <b>{entry.company}</b>
                {years && <span>{years}</span>}
              </button>
            );
          })}
        </div>
        {/* Keyed by the selection so a new role mounts fresh and the
            entrance (.car-panel[data-swap]) replays -- opacity + transform only. */}
        <div
          key={selected}
          id="career-panel"
          className="car-panel"
          role="tabpanel"
          aria-labelledby={`career-tab-${selected}`}
          tabIndex={0}
          data-swap={swapped}
        >
          <div className="car-ph">
            <div>
              <h3 className="t-panel">{current.company}</h3>
              <p className="car-role">
                <ThaiText text={current.role[locale]} />
              </p>
            </div>
            <p className="car-dates">
              <ThaiText text={dates} />
            </p>
          </div>
          {current.figure && (
            <>
              <p className="car-fig t-stat">
                {splitFigureValue(current.figure.value).map((part, k) => (
                  <Fragment key={k}>
                    {k > 0 && ' '}
                    {part.unit ? <span className="u">{part.text}</span> : part.text}
                  </Fragment>
                ))}
              </p>
              {current.figure.note && (
                <p className="car-note">
                  <ThaiText text={current.figure.note[locale]} />
                </p>
              )}
              {current.figure.label[locale] && (
                <p className="car-cap">
                  <ThaiText text={current.figure.label[locale]} />
                </p>
              )}
            </>
          )}
          {current.wins[locale].length > 0 && (
            <ul className="car-wins">
              {current.wins[locale].map((win, k) => (
                <li key={k}>
                  <ThaiText text={win} />
                </li>
              ))}
            </ul>
          )}
          {(selected === 0 || next) && (
            <div className="car-pf">
              {/* By day tells the current job's method, so only the first
                  (current) role links to it -- the prototype's `deal` flag.
                  Ruling C-5 (P3 preflight): a display-ish string, so it goes
                  through ThaiText even though it renders plain in English. */}
              {selected === 0 && (
                <a href="#story">
                  <ThaiText text={t.careerDealLink} />
                </a>
              )}
              {next && (
                <button type="button" onClick={() => select(selected + 1, true)}>
                  {`${t.careerEarlier}${next.company} ›`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
