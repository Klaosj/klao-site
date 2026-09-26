'use client';

import type { ReactNode } from 'react';
import { openPalette } from '@/lib/deep-link';

// Opens ⌘K from anywhere in the page (the FAQ's "Didn't find it?" line).
// Only an event: the palette's own code loads on first open (PaletteHost).
export default function PaletteButton({
  query,
  className,
  children,
}: {
  query?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button type="button" className={className} aria-keyshortcuts="Meta+K Control+K" onClick={() => openPalette(query)}>
      {children}
    </button>
  );
}
