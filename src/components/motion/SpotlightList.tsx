'use client';

import { useEffect, useRef } from 'react';
import './spotlight.css';

type Props = {
  lines: readonly string[];
  className?: string;
  itemClassName?: string;
};

/** Scroll-driven spotlight: the line whose vertical center is nearest a
 *  focal band 45% down the viewport carries `spot-on`. SSR ships the first
 *  line already emphasized, so nothing depends on JS to be readable (A2).
 *  Under prefers-reduced-motion no listener attaches and the CSS forces
 *  every line fully opaque (A3). */
export default function SpotlightList({ lines, className, itemClassName }: Props) {
  const ref = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    const ul = ref.current;
    if (!ul) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const items = Array.from(ul.children) as HTMLElement[];
    let raf = 0;
    const update = () => {
      raf = 0;
      const focus = window.innerHeight * 0.45;
      let best = 0;
      let bestD = Infinity;
      items.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - focus);
        if (d < bestD) { bestD = d; best = i; }
      });
      items.forEach((el, i) => el.classList.toggle('spot-on', i === best));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <ul ref={ref} className={className}>
      {lines.map((line, i) => (
        <li key={line} className={`spot ${i === 0 ? 'spot-on' : ''} ${itemClassName ?? ''}`.trim()}>
          {line}
        </li>
      ))}
    </ul>
  );
}
