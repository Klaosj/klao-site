import { vi } from 'vitest';

/** Stubs matchMedia as tests/hero.test.tsx always has, but lets a test choose
 *  which queries match (reduced motion, hover). Listeners are accepted and
 *  never called. */
export function stubMatchMedia(matches: (query: string) => boolean = () => false): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: matches(query),
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  }));
}
