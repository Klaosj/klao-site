'use client';

import { useEffect, useRef } from 'react';

type Props = { text: string; level?: 1 | 2 | 3; className?: string };

export default function MaskedHeading({ text, level = 2, className = '' }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const words = text.trim().split(/\s+/);
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3';

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} className="rv-mask">
      <Tag className={className}>
        {words.map((w, i) => (
          <span key={`${w}-${i}`} className="w" style={{ ['--wi' as string]: String(i) }}>
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </Tag>
    </div>
  );
}
