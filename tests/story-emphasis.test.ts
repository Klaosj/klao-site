import { describe, expect, it } from 'vitest';
import { EMPHASIS_ORDER, emphasisRank } from '@/lib/story-emphasis';

describe('emphasisRank (spec 2026-10-01 §2.3, Klao 3A: deal chapter first)', () => {
  it('ranks orders 2, 4, 1, 3, 5, 6 as 0..5', () => {
    expect(EMPHASIS_ORDER).toEqual([2, 4, 1, 3, 5, 6]);
    expect([1, 2, 3, 4, 5, 6].map(emphasisRank)).toEqual([2, 0, 3, 1, 4, 5]);
  });
  it('puts unknown orders last, so the stagger never passes 6 steps (< 500 ms at 75 ms)', () => {
    for (const o of [0, 7, 99, -1, Number.NaN]) expect(emphasisRank(o)).toBe(6);
    expect(Math.max(...[0, 1, 2, 3, 4, 5, 6, 7, 99].map(emphasisRank)) * 75).toBeLessThan(500);
  });
});
