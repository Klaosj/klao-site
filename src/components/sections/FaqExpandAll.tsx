'use client';

import { useEffect, useRef, useState } from 'react';

const detailsIn = (el: HTMLElement | null): HTMLDetailsElement[] =>
  Array.from(el?.closest('section')?.querySelectorAll('details') ?? []);

// "Expand all" is an enhancement: every <details> opens natively without
// JavaScript (Review Focus #4), so faq.css hides this button under
// html:not(.js) and it only ever flips the `open` state the browser owns.
export default function FaqExpandAll({ expandLabel, collapseLabel }: { expandLabel: string; collapseLabel: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [allOpen, setAllOpen] = useState(false);

  useEffect(() => {
    const button = ref.current;
    const section = button?.closest('section');
    if (!section) return;
    // `toggle` doesn't bubble, so one capture-phase listener on the section
    // keeps the label honest when questions are opened one by one.
    const sync = () => setAllOpen(detailsIn(button).every((d) => d.open));
    section.addEventListener('toggle', sync, true);
    return () => section.removeEventListener('toggle', sync, true);
  }, []);

  return (
    <button
      ref={ref}
      type="button"
      className="faq-xall"
      aria-expanded={allOpen}
      onClick={() => {
        const next = !detailsIn(ref.current).every((d) => d.open);
        for (const d of detailsIn(ref.current)) d.open = next;
        setAllOpen(next);
      }}
    >
      {allOpen ? collapseLabel : expandLabel}
    </button>
  );
}
