'use client';

import { useEffect, useRef, useState } from 'react';

// Rauno Freiberg's clipboard button, ported into React: the address is
// always plain readable text (a real fallback, not decoration -- it is
// still selectable/copyable by hand when the button below does nothing),
// and the "copied" label is always in the DOM so a screen reader's
// aria-live region has something to announce -- only its opacity toggles.
export default function CopyEmail({ email, copiedLabel }: { email: string; copiedLabel: string }) {
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      // navigator.clipboard is only available in a secure context (HTTPS or
      // localhost), so this branch is real, reachable code in production --
      // not just a defensive catch. document.execCommand('copy') is
      // deprecated (MDN flags it as such) and already removed from some
      // engines, so it is not a durable long-term fallback -- see the task
      // report for what a proper replacement would look like. Kept here
      // because the button already degrades to plain readable/selectable
      // text below it, so a fallback that also fails costs nothing beyond
      // its own dead code.
      const t = document.createElement('textarea');
      t.value = email;
      t.style.position = 'fixed';
      t.style.opacity = '0';
      document.body.appendChild(t);
      t.select();
      try { document.execCommand('copy'); } catch { /* nothing left to try */ }
      t.remove();
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
        className={`font-mono text-[9px] uppercase tracking-[0.18em] text-peri transition-opacity ${
          done ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {copiedLabel}
      </span>
    </button>
  );
}
