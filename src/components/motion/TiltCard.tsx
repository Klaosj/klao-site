'use client';

import { useRef, type ReactNode } from 'react';
import './tilt.css';

const MAX_DEG = 3.2;

/** Springy pointer-tracked tilt for cards. Writes CSS custom properties
 *  straight onto the node per pointermove — no React state, no rAF needed
 *  (the CSS transition smooths between event samples). Disabled for
 *  reduced-motion and touch by the CSS media queries in tilt.css. */
export default function TiltCard({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--ty', `${(px * 2 * MAX_DEG).toFixed(2)}deg`);
    el.style.setProperty('--tx', `${(-py * 2 * MAX_DEG).toFixed(2)}deg`);
    el.style.setProperty('--lift', '-5px');
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--tx', '0deg');
    el.style.setProperty('--ty', '0deg');
    el.style.setProperty('--lift', '0px');
  };

  return (
    <div ref={ref} data-tilt className={className} onPointerMove={onMove} onPointerLeave={onLeave}>
      {children}
    </div>
  );
}
