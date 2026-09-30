'use client';

import { useRef, type ElementType, type ReactNode } from 'react';
import { useRevealIn } from '@/components/motion/useRevealIn';

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

  useRevealIn(ref);

  const classes = ['rv', big ? 'big' : '', className].filter(Boolean).join(' ');
  return (
    <Tag ref={ref} className={classes} style={{ ['--i' as string]: String(delayIndex) }}>
      {children}
    </Tag>
  );
}
