import { useSyncExternalStore } from 'react';
import type { NavSection } from './nav';

// The home-page section the capsule marks as being read (SiteNav's
// IntersectionObserver band), shared with every LocaleToggle so a language
// switch lands on the same section (Klao decision (a), 2026-09-28, as the
// prototype's setLang did). A module store rather than a prop: the footer's
// toggle (P4's SiteFooter) has no line to SiteNav, and it should carry the
// section too. Client components only -- it imports a React hook.
let current: NavSection | null = null;
const listeners = new Set<() => void>();

export function setActiveSection(sec: NavSection | null): void {
  if (sec === current) return;
  current = sec;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The section being read, or null (none in the band, or not the home page).
 *  Null on the server and during hydration, so the first render matches the
 *  server HTML. */
export function useActiveSection(): NavSection | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}
