'use client';

import { useEffect, type RefObject } from 'react';

/** Adds `in` to the element once it crosses the 85 % line (master plan C9), or straight away
 *  when there is nothing to animate (reduced motion, no IntersectionObserver). Shared by Reveal
 *  (`.rv`, a fade-rise) and RevealGroup (`.rvg`, children settle in `--o` order). */
export function useRevealIn(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (calm || typeof IntersectionObserver === 'undefined') {
      el.classList.add('in');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        }
      },
      // Bottom margin -15 %: "in view" starts at 85 % of the viewport height.
      { rootMargin: '0px 0px -15% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
}
