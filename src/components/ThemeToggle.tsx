'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { dict } from '@/lib/dictionary';
import type { Locale } from '@/lib/models';
import { THEME_EVENT, readThemePref, writeThemePref, type ThemePref } from '@/lib/theme';

const PREFS: readonly ThemePref[] = ['auto', 'light', 'dark'];

type Props = {
  locale: Locale;
  /** The footer shows the sun/moon glyph beside the control; a denser
   *  context (phone menu, ⌘K) can drop it and keep only the segmented
   *  control itself. Default true. */
  icons?: boolean;
  className?: string;
};

/** What the page actually looks like right now. The glyph must follow the
 *  RESOLVED theme, not the stored preference -- under Auto it has to track
 *  the system, including a live OS-level flip while the page stays open. */
function resolvedIsDark(): boolean {
  if (typeof document === 'undefined') return false;
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'dark') return true;
  if (attr === 'light') return false;
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
}

/** The sun <-> moon eclipse (amendment A01, polish lab §01): a mask circle
 *  slides over the sun's core while the rays rotate and fade -- transform
 *  and opacity only, so it needs neither of the plan's two named CSS
 *  exceptions. `aria-hidden`: the segmented control next to it already
 *  carries the accessible name and the checked state. */
function ThemeGlyph({ dark }: { dark: boolean }) {
  const uid = useId();
  const maskId = `${uid}-eclipse`;
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      aria-hidden="true"
      focusable="false"
      className={`seg-glyph${dark ? ' is-dark' : ''}`}
    >
      <mask id={maskId}>
        <rect x="-4" y="-4" width="32" height="32" fill="#fff" />
        <circle className="cut" cx="17" cy="7" r="5.5" fill="#000" />
      </mask>
      <circle className="core" cx="12" cy="12" r="4.6" fill="currentColor" mask={`url(#${maskId})`} />
      <g className="rays" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
      </g>
    </svg>
  );
}

/** Appearance: Auto / Light / Dark (spec §6 "Theme"; amendment A01). Lives
 *  in the footer, the phone menu and ⌘K -- never in the nav. A
 *  role="radiogroup" segmented control with ONE sliding thumb, not three
 *  independent buttons: only one option is ever "on", which is exactly what
 *  radio semantics say and what lets the thumb be a single element that
 *  moves (`--i`) instead of three that each redraw their own background.
 *  The server cannot know the stored choice, so the first render marks Auto
 *  and the mount effect syncs to whatever the pre-paint script already
 *  applied -- the page itself never flashes, only this control's checked
 *  state and glyph settle after hydration. */
export default function ThemeToggle({ locale, icons = true, className = '' }: Props) {
  const t = dict[locale];
  const labels: Record<ThemePref, string> = { auto: t.themeAuto, light: t.themeLight, dark: t.themeDark };
  const [pref, setPref] = useState<ThemePref>('auto');
  const [dark, setDark] = useState(false);
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    setPref(readThemePref());
    setDark(resolvedIsDark());
    // Every toggle on the page (and ⌘K) follows whichever one was used (R18).
    const follow = (e: Event) => {
      setPref((e as CustomEvent<{ pref: ThemePref }>).detail.pref);
      setDark(resolvedIsDark());
    };
    window.addEventListener(THEME_EVENT, follow);
    // Auto only: the glyph must also follow a live OS-level dark/light flip.
    const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
    const onSystemChange = () => setDark(resolvedIsDark());
    mq?.addEventListener?.('change', onSystemChange);
    return () => {
      window.removeEventListener(THEME_EVENT, follow);
      mq?.removeEventListener?.('change', onSystemChange);
    };
  }, []);

  const choose = (next: ThemePref) => {
    const apply = () => writeThemePref(next);
    // A 320 ms cross-fade where the browser has View Transitions (styles in
    // globals.css); a plain switch otherwise, and always under reduced motion.
    const doc = document as Document & { startViewTransition?: (update: () => void) => unknown };
    const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!calm && typeof doc.startViewTransition === 'function') doc.startViewTransition(apply);
    else apply();
  };

  // ARIA APG radiogroup pattern: arrow keys move the checked option (and
  // apply it at once, same as a click); every other key is left alone.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const i = PREFS.indexOf(pref);
    const next = PREFS[(i + dir + PREFS.length) % PREFS.length];
    choose(next);
    btnRefs.current[PREFS.indexOf(next)]?.focus();
  };

  return (
    <span className={['inline-flex items-center gap-2', className].filter(Boolean).join(' ')}>
      {icons && <ThemeGlyph dark={dark} />}
      <div
        role="radiogroup"
        aria-label={t.appearance}
        className="seg"
        style={{ ['--i' as string]: String(PREFS.indexOf(pref)) }}
        onKeyDown={onKeyDown}
      >
        <span className="thumb" aria-hidden="true" />
        {PREFS.map((p, i) => (
          <button
            key={p}
            ref={(el) => {
              btnRefs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={pref === p}
            tabIndex={pref === p ? 0 : -1}
            onClick={() => choose(p)}
          >
            {labels[p]}
          </button>
        ))}
      </div>
    </span>
  );
}
