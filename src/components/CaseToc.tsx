'use client';

import { useEffect, useState } from 'react';

/**
 * The case page's "On this page" list with the section being read marked
 * (aria-current), so the sticky column doubles as a progress map. Without
 * JavaScript it is a plain list of anchor links.
 */
export default function CaseToc({ items, label }: { items: { id: string; text: string }[]; label: string }) {
  const [active, setActive] = useState<string | null>(null);
  const ids = items.map((i) => i.id).join(',');

  useEffect(() => {
    const els = ids
      .split(',')
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;
    let frame = 0;
    // The section whose top has passed 35 % of the viewport is the one being read.
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.35;
      let current: string | null = null;
      for (const el of els) if (el.getBoundingClientRect().top <= line) current = el.id;
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [ids]);

  return (
    <nav className="cst-toc" aria-label={label}>
      {items.map((i) => (
        <a key={i.id} href={`#${i.id}`} aria-current={active === i.id ? 'true' : undefined}>
          {i.text}
        </a>
      ))}
    </nav>
  );
}
