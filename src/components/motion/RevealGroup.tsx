'use client';

import { useRef, type ElementType, type ReactNode } from 'react';
import { useRevealIn } from '@/components/motion/useRevealIn';

type Props = { children: ReactNode; as?: ElementType; className?: string };

/** One trigger for a list whose children settle in their own `--o` order (spec 2026-10-01
 *  §2.3). The server HTML carries `rvg` and hides nothing; globals.css dims the children only
 *  under html.js + no-preference, and only to .55. */
export default function RevealGroup({ children, as: Tag = 'div', className = '' }: Props) {
  const ref = useRef<HTMLElement | null>(null);
  useRevealIn(ref);
  return (
    <Tag ref={ref} className={['rvg', className].filter(Boolean).join(' ')}>
      {children}
    </Tag>
  );
}
