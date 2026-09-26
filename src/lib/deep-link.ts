/**
 * Window-level events between client islands that never import each other
 * (contract C8). The nav's ⌘K button, the phone menu's search row and P4's FAQ
 * "ask Klao" link all ask the palette to open through one named event; the
 * palette (P4) is the only listener. Until P4 lands nothing listens, and the
 * dispatch is harmless.
 *
 * P1 starts this module with the palette half only. P4's plan grows the same
 * file (CAREER_EVENT, followTarget, goToTarget) with these two exports
 * unchanged, so SiteNav and NavMenu keep importing from here.
 */
export const PALETTE_EVENT = 'klao:palette';

interface PaletteDetail {
  query?: string;
}

export function openPalette(query?: string): void {
  const detail: PaletteDetail = query ? { query } : {};
  window.dispatchEvent(new CustomEvent<PaletteDetail>(PALETTE_EVENT, { detail }));
}
