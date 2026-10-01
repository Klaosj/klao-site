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

/** Like stubMatchMedia, but live: `set(query, matches)` flips one query and calls its 'change'
 *  listeners, as a phone rotation or a window resize would. Unlisted queries never match.
 *  `listeners(query)` counts who is still subscribed (to check the cleanup). */
export function liveMatchMedia(initial: Record<string, boolean> = {}) {
  const state = new Map(Object.entries(initial));
  const subscribers = new Map<string, Set<(e: MediaQueryListEvent) => void>>();
  const of = (query: string) => {
    let set = subscribers.get(query);
    if (!set) subscribers.set(query, (set = new Set()));
    return set;
  };
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      return state.get(query) === true;
    },
    media: query,
    onchange: null,
    addEventListener(type: string, fn: (e: MediaQueryListEvent) => void) {
      if (type === 'change') of(query).add(fn);
    },
    removeEventListener(type: string, fn: (e: MediaQueryListEvent) => void) {
      if (type === 'change') of(query).delete(fn);
    },
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  }));
  return {
    set(query: string, matches: boolean) {
      state.set(query, matches);
      for (const fn of [...of(query)]) fn({ matches, media: query } as MediaQueryListEvent);
    },
    listeners: (query: string) => of(query).size,
  };
}
