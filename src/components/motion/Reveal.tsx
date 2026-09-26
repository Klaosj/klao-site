'use client';

import { useEffect, useRef, type ElementType, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  as?: ElementType;
  /** Stagger step for the dark-era sections (75 ms each, via --i). */
  delayIndex?: number;
  /** Headline blocks rise 24 px instead of 16 px (prototype `.rv.big`). */
  big?: boolean;
  className?: string;
};

/** Fade-rise once at the 85 % line (master plan C9).
 *
 *  The `rv` class is in the server HTML, but it hides nothing by itself:
 *  globals.css only dims `.rv` under `html.js` (set by the pre-paint script)
 *  AND `prefers-reduced-motion: no-preference`, and only to .55 opacity, never
 *  0. So a visitor without JavaScript, or before hydration, sees every word.
 *  This component's one job is to add `in` -- when the element crosses the
 *  line, or straight away when there is nothing to animate (reduced motion,
 *  no IntersectionObserver). */
export default function Reveal({ children, as: Tag = 'div', delayIndex = 0, big = false, className = '' }: Props) {
  const ref = useRef<HTMLElement | null>(null);

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
  }, []);

  const classes = ['rv', big ? 'big' : '', className].filter(Boolean).join(' ');
  return (
    <Tag ref={ref} className={classes} style={{ ['--i' as string]: String(delayIndex) }}>
      {children}
    </Tag>
  );
}
