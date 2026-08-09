'use client';

import { Fragment, useEffect, useRef } from 'react';

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
          // The separating space is a sibling text node OUTSIDE the span,
          // not trailing content inside it (Task 11 browser verification
          // found the previous shape -- `<span>{w} </span>` -- rendering
          // with zero gap between words in every real browser: a trailing
          // space at the very end of an inline-block's own content is
          // trimmed by normal CSS white-space collapsing, since the box
          // treats it as trailing whitespace at the end of its own internal
          // line, regardless of what follows it in the outer flow. A space
          // between two sibling inline-block boxes, by contrast, lays out
          // normally. This affects every multi-word heading in both
          // locales, not just the Thai phrase-splitting question this
          // component already had an open question about.
          <Fragment key={`${w}-${i}`}>
            <span className="w" style={{ ['--wi' as string]: String(i) }}>
              {w}
            </span>
            {i < words.length - 1 ? ' ' : ''}
          </Fragment>
        ))}
      </Tag>
    </div>
  );
}
