'use client';

import { useEffect, useRef, useState } from 'react';
import { copyShortcutHint, copyText } from '@/lib/clipboard';
import { dict } from '@/lib/dictionary';
import type { Locale } from '@/lib/models';
import './copy-email.css';

type State = 'idle' | 'ok' | 'fail';

// The prototype's `.mailrow`: the address as plain text (always readable and
// selectable by hand, the real fallback) + a 44 px icon button + a status
// word. The status is written twice on purpose (QA C2): once visibly
// (aria-hidden, so it never joins the button's name) and once in an
// sr-only live region that only changes text on a real outcome, so screen
// readers hear exactly one announcement per click.
//
// Polish amendment A03: the icon does not swap outright on success. The
// button holds two stacked 18 px glyphs -- a clipboard that fades/scales out
// (transform + opacity only) and a check that draws itself via
// `stroke-dashoffset`, a named exception (master R27) allowed only on this
// one 18 px inline-stroke icon. Both are hand-written inline SVGs rather
// than the shared `Icon` component: `Icon`'s paths (including
// `check-duotone`) are filled 256x256 duotone shapes, not open strokes, so
// none of them can "draw on" -- and a filled glyph stacked over a stroked
// one would read as two different icon languages, not one resolving into
// the other.
export default function CopyEmail({ email, locale }: { email: string; locale: Locale }) {
  const t = dict[locale];
  const [state, setState] = useState<State>('idle');
  const addr = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Fix round 1 (minor): copyText() awaits the Clipboard API, so a visitor
  // can navigate away or the parent can unmount this component mid-flight.
  // Without this guard, the code after that await still calls setState and
  // schedules a new setTimeout on an unmounted component -- a timer the
  // cleanup below already ran and can no longer cancel.
  const mounted = useRef(true);

  // Fix round 2: the effect body must set this back to true. Next's App
  // Router runs in StrictMode by default, and StrictMode's dev-only double
  // invoke (mount -> cleanup -> mount) ran the cleanup below once with no
  // matching "re-mounted" signal -- leaving mounted.current stuck at false
  // for the component's entire real lifetime, so copy() silently did
  // nothing after every click's await. useRef(true)'s initial value only
  // covers the very first mount, not a StrictMode remount.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function settle(next: State, ms: number) {
    setState(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), ms);
  }

  async function copy() {
    const ok = await copyText(email);
    if (!mounted.current) return;
    if (ok) {
      settle('ok', 2000);
      return;
    }
    // Honest failure (no clipboard, or permission denied): select the
    // address so ⌘C / Ctrl+C works, and say so. No execCommand fallback --
    // it is deprecated and used to report success it couldn't verify.
    const node = addr.current;
    const selection = window.getSelection();
    if (node && selection) {
      const range = document.createRange();
      range.selectNodeContents(node);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    settle('fail', 3000);
  }

  const message = state === 'ok' ? t.copied : state === 'fail' ? copyShortcutHint(t.closeCopyFail) : '';

  return (
    <span className="mail-row">
      <span ref={addr} className="mail-addr">
        {email}
      </span>
      <button type="button" className="copy-b" data-state={state} aria-label={t.copyEmailAction} onClick={copy}>
        <span className="copy-box">
          <svg
            className="copy-clip"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="8" y="8" width="12" height="12" rx="2.5" />
            <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
          </svg>
          {/* Named exception (master R27): stroke-dashoffset draws this
              path on success -- the one place on the page anything other
              than transform/opacity animates. */}
          <svg
            className="copy-ok"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
      </button>
      <span className="copy-l" aria-hidden="true">
        {message}
      </span>
      <span className="sr-only" aria-live="polite">
        {message}
      </span>
    </span>
  );
}
