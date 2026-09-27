'use client';

import type { ReactNode } from 'react';
import { followTarget } from '@/lib/deep-link';
import { parseTarget, targetHref } from '@/lib/link-target';
import type { Locale } from '@/lib/models';

// A plain <a> with a real href (works with JavaScript off and from any
// route) that, when its destination is on this page, deep-links in place:
// switches the Career pill, opens the sheet, opens a FAQ answer. Plain <a>,
// not next/link: Link changes the hash with pushState, which fires no
// hashchange, and P2's sheet listens for exactly that.
export default function DeepLink({
  target,
  locale,
  className,
  children,
}: {
  target: string;
  locale: Locale;
  className?: string;
  children: ReactNode;
}) {
  const href = targetHref(target, locale);
  // The mappers already drop malformed Links lines; this only guards
  // hand-written callers, and a label is better than a dead link.
  if (!href) return <span className={className}>{children}</span>;
  const external = parseTarget(target)?.kind === 'external';
  return (
    <a
      href={href}
      className={className}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      onClick={(e) => {
        // New-tab clicks and outside links belong to the browser.
        if (external || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (followTarget(target)) e.preventDefault();
      }}
    >
      {children}
    </a>
  );
}
