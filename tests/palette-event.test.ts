// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { PALETTE_EVENT, openPalette } from '@/lib/deep-link';

describe('openPalette (C8)', () => {
  const seen: unknown[] = [];
  const listener = (e: Event) => seen.push((e as CustomEvent).detail);

  afterEach(() => {
    window.removeEventListener(PALETTE_EVENT, listener);
    seen.length = 0;
  });

  it("dispatches 'klao:palette' on window with an empty detail when there is no query", () => {
    window.addEventListener(PALETTE_EVENT, listener);
    openPalette();
    expect(PALETTE_EVENT).toBe('klao:palette');
    expect(seen).toEqual([{}]);
  });

  it('carries the query when there is one', () => {
    window.addEventListener(PALETTE_EVENT, listener);
    openPalette('talatify');
    expect(seen).toEqual([{ query: 'talatify' }]);
  });
});
