// Spec 2026-10-01 §2.3 (Klao 3A): the By day chapters settle in order of importance, not in
// DOM order — the deal chapter (order 2) first, then 4, 1, 3, 5, 6. Values are
// StoryChapter.order. Anything else (a chapter added in Notion later) ranks last, so the
// stagger never runs past 6 steps.
export const EMPHASIS_ORDER: readonly number[] = [2, 4, 1, 3, 5, 6];

export function emphasisRank(order: number): number {
  const i = EMPHASIS_ORDER.indexOf(order);
  return i >= 0 ? i : EMPHASIS_ORDER.length;
}
