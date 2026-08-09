'use client';

import { useEffect, useRef, useState } from 'react';
import type { Locale } from '@/lib/models';
import { eyebrowFont } from '@/lib/typography';

// Rauno Freiberg's clipboard button, ported into React: the address is
// always plain readable text (a real fallback, not decoration -- it is
// still selectable/copyable by hand when the button below does nothing),
// and the "copied" label is always in the DOM so a screen reader's
// aria-live region has something to announce -- only its opacity toggles.
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
    <button type="button" onClick={copy} className="inline-flex items-center gap-2.5 text-[15px]">
      <span className="border-b border-on-dark-faint pb-[3px]">{email}</span>
      <span
        aria-live="polite"
        className={`text-[9px] uppercase text-peri transition-opacity ${eyebrowFont(
          locale,
          'tracking-[0.18em]',
        )} ${done ? 'opacity-100' : 'opacity-0'}`}
      >
        {copiedLabel}
      </span>
    </button>
  );
}
