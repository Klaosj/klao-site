import { CAREER_EVENT } from './career';
import { parseTarget, targetHref } from './link-target';
import type { Locale } from './models';
import { sheetHash } from './sheet-url';

// Contract C8. The nav's ⌘K button (P1) and the FAQ's "ask Klao" line
// dispatch PALETTE_EVENT and PaletteHost (P4) listens. CAREER_EVENT is P3's
// constant (src/lib/career.ts, heard by CareerDetent), re-exported so P4
// callers import both event names from one place and the string exists once.
export const PALETTE_EVENT = 'klao:palette';
export { CAREER_EVENT };

export function openPalette(query?: string): void {
  window.dispatchEvent(new CustomEvent(PALETTE_EVENT, { detail: query ? { query } : {} }));
}

// The capsule nav floats over the top of the page; the prototype's
// scrollToEl lands a section 76 px below the viewport top so its heading
// clears the capsule. A jump (not smooth scrolling) is the prototype's
// choice and needs no reduced-motion branch.
const NAV_CLEARANCE = 76;

function reveal(el: HTMLElement): void {
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - NAV_CLEARANCE, behavior: 'auto' });
  // Move focus with the view, or a keyboard user's next Tab starts from
  // wherever they clicked. Headings get tabindex -1 so they take focus
  // without becoming Tab stops.
  const target =
    (el instanceof HTMLDetailsElement ? el.querySelector<HTMLElement>('summary') : el.querySelector<HTMLElement>('h2, h3')) ??
    el;
  if (!target.matches('a[href], button, summary, input, [tabindex]')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}

// Follows a link-target in place when its destination is on this page.
// Returns false when it can't (another route, an outside URL, a malformed
// target) so the caller lets the browser follow the href instead.
export function followTarget(raw: string): boolean {
  const t = parseTarget(raw);
  if (!t || t.kind === 'external') return false;
  if (t.kind === 'sheet') {
    if (!document.getElementById('work')) return false;
    // A real hash change (not pushState) so P2's sheet, which listens for
    // hashchange/popstate, opens exactly as it does for a pasted URL.
    window.location.hash = sheetHash(t.key);
    return true;
  }
  const el = document.getElementById(t.kind === 'career' ? 'career' : t.id);
  if (!el) return false;
  // Switch the pill first, so the panel is already right when it scrolls in.
  if (t.kind === 'career') window.dispatchEvent(new CustomEvent(CAREER_EVENT, { detail: { key: t.key } }));
  if (el instanceof HTMLDetailsElement) el.open = true;
  reveal(el);
  return true;
}

// For callers with no <a> of their own (⌘K rows, Ask sources): follow in
// place, else navigate to the target's href.
export function goToTarget(raw: string, locale: Locale): void {
  if (followTarget(raw)) return;
  const href = targetHref(raw, locale);
  if (!href) return;
  if (parseTarget(raw)?.kind === 'external') window.open(href, '_blank', 'noopener');
  else window.location.assign(href);
}
