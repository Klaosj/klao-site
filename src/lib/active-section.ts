import { useSyncExternalStore } from 'react';
import type { ReadingAnchor } from './nav';

// The reading anchor: the home-page band the reader is on (Klao decision (a),
// 2026-09-28; P1 re-review Important 1), so a language switch lands on the
// same band, as the prototype's setLang/anchor() did. SiteNav publishes it
// from its IntersectionObserver band. It is not the nav's pill: it covers
// Signature, the four nav sections, Contact and the footer (as 'contact'),
// keeps the last band while the reading line sits in a gap between two, and
// is null on the hero and off the home page.
//
// A module store rather than a prop: every EN/ไทย toggle (capsule, phone
// menu, the footer's) and ⌘K's language command read it, and none of them
// has a line to SiteNav. The export names are stable. Client code only --
// useReadingAnchor is a React hook.
let current: ReadingAnchor | null = null;
const listeners = new Set<() => void>();

export function setReadingAnchor(anchor: ReadingAnchor | null): void {
  if (anchor === current) return;
  current = anchor;
  for (const listener of listeners) listener();
}

/** The anchor right now, for code that runs on an event rather than a
 *  render (⌘K's language command). */
export function getReadingAnchor(): ReadingAnchor | null {
  return current;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The anchor, live. Null on the server and during hydration, so the first
 *  render matches the server HTML. */
export function useReadingAnchor(): ReadingAnchor | null {
  return useSyncExternalStore(subscribe, getReadingAnchor, () => null);
}
