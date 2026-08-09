'use client';

import { useEffect, useRef, useState } from 'react';
import type { Locale } from '@/lib/models';
import { dict } from '@/lib/dictionary';
import { eyebrowFont } from '@/lib/typography';

// Rauno Freiberg's clipboard button, ported into React: the address is
// always plain readable text (a real fallback, not decoration -- it is
// still selectable/copyable by hand when the button below does nothing).
//
// QA C2 (WCAG 4.1.2 + 4.1.3): the original single "Copied" span was wrong
// two ways at once, and fixing one without the other just trades one bug
// for the other:
//   1. It was always in the DOM with static text, only toggling opacity --
//      an aria-live region announces on *text* mutation, not on a style
//      change, so a screen-reader user never heard a confirmation.
//   2. Being static text inside the <button>, it was concatenated into the
//      button's accessible name from the very first render (before any
//      click): "a@b.co Copied, button".
// The fix splits the one node into two, so each side can do the thing the
// other couldn't: a purely visual label (`aria-hidden`, same fade
// in/out as before, still driven by `done`) for sighted users, plus a
// visually-hidden (`sr-only`) sibling that is genuinely empty and only
// gets the copied label's text -- and therefore only *mutates* -- on a
// real successful copy, clearing again when `done` resets. The button's
// own accessible name now comes from a fixed `aria-label`
// (`copyEmailAction`, added to the dictionary for this) instead of from
// its child content, so it reads the same before, during and after a
// click, and never announces on the failure paths (aria-label is static;
// the live region only ever holds text when `done` is true, and `done`
// only becomes true after `writeText` resolves).
// `locale` is required rather than defaulted: the whole point of the prop is
// to keep Thai out of the monospace stack, and a default of 'en' would hand
// the broken treatment to exactly the callers that forgot to pass it.
export default function CopyEmail({
  email,
  copiedLabel,
  locale,
}: {
  email: string;
  copiedLabel: string;
  locale: Locale;
}) {
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      // navigator.clipboard is only available in a secure context (HTTPS or
      // localhost), so this branch is real, reachable code in production --
      // not a defensive catch that never fires. There used to be a
      // document.execCommand('copy') fallback here, but it was dropped
      // (Task 10/11 review): the API is deprecated, fires only in the same
      // narrow non-secure-context case this catch already covers, and the
      // old code called setDone(true) unconditionally even when
      // execCommand's own return value was false -- telling the visitor an
      // address was on their clipboard when it might not be. Doing nothing
      // here is honest; the always-present plain-text <span> below is the
      // real fallback, still selectable/copyable by hand.
      return;
    }
    setDone(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDone(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={dict[locale].copyEmailAction}
      className="inline-flex items-center gap-2.5 text-[15px]"
    >
      <span className="border-b border-on-dark-faint pb-[3px]">{email}</span>
      <span
        aria-hidden="true"
        className={`text-[9px] uppercase text-peri transition-opacity ${eyebrowFont(
          locale,
          'tracking-[0.18em]',
        )} ${done ? 'opacity-100' : 'opacity-0'}`}
      >
        {copiedLabel}
      </span>
      {/* sr-only: the actual announcement. Empty except in the brief window
          after a successful copy, so it mutates (and therefore fires the
          live region) exactly once per success and never on failure. */}
      <span aria-live="polite" className="sr-only">
        {done ? copiedLabel : ''}
      </span>
    </button>
  );
}
