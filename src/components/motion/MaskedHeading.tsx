'use client';

import { Fragment, useEffect, useRef } from 'react';

type Props = { text: string; level?: 1 | 2 | 3; className?: string };

/** The masking classes -- `rv-mask` on the wrapper (globals.css:
 *  `overflow: hidden`) and `w` on each word span (`transform:
 *  translateY(112%)`) -- are added ONLY from inside the effect, never in
 *  JSX. Mirrors Reveal.tsx's "hiding class added in an effect, never in
 *  JSX" rule for exactly the same reason: writing them into JSX (the
 *  previous shape here) means the CSS ships and clips every word away
 *  permanently whenever JS never runs -- no JS, a hydration failure, or an
 *  environment without IntersectionObserver. Verified in Chrome with JS
 *  disabled: the hero heading rendered "Business developer who builds his
 *  own" with "tools." missing entirely; About lost 1 of 11 words, Contact
 *  lost 2 of 5. Server-rendered/no-JS markup now carries neither class, so
 *  `.rv-mask{overflow:hidden}` / `.rv-mask .w{transform:translateY(112%)}`
 *  never match and the full heading text is visible by default -- the
 *  reveal animation is added as an enhancement once the effect runs, not a
 *  default state JS has to undo. */
export default function MaskedHeading({ text, level = 2, className = '' }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const words = text.trim().split(/\s+/);
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3';

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (typeof IntersectionObserver === 'undefined') return;
    el.classList.add('rv-mask');
    // `[data-word]` is a plain marker attribute, not a class -- it carries
    // no styling of its own, so it's safe to leave in the JSX unconditionally
    // and only decide here, at runtime, whether each span actually becomes
    // a `.w` (i.e. gets masked).
    for (const w of el.querySelectorAll('[data-word]')) w.classList.add('w');
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
    <div ref={wrap}>
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
            <span data-word style={{ ['--wi' as string]: String(i) }}>
              {w}
            </span>
            {i < words.length - 1 ? ' ' : ''}
          </Fragment>
        ))}
      </Tag>
    </div>
  );
}
