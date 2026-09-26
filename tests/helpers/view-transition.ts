import { vi } from 'vitest';

/**
 * A07: jsdom has no View Transitions API. This stands in for a browser that has one --
 * `update` runs synchronously (as a real `startViewTransition` invokes its callback), and
 * `finished` settles on the next microtask, close enough for a test to `await` past it.
 *
 * Promoted out of tests/project-sheet.test.tsx (T9) so T10's tests can reuse it rather than
 * re-inlining a third copy (the same D-3 reasoning as stubDialog/FakeIO/stubMatchMedia).
 */
export function stubViewTransition() {
  const start = vi.fn((update: () => void) => {
    update();
    const settled = Promise.resolve();
    return { ready: settled, finished: settled, updateCallbackDone: settled, types: new Set(), skipTransition() {} };
  });
  (document as unknown as { startViewTransition: typeof start }).startViewTransition = start;
  return start;
}
