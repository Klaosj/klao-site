import { vi, type Mock } from 'vitest';

export type ViewTransitionStub = Mock<(update: () => void) => unknown> & {
  /** Only meaningful with `controlFinish: true`: settles `ready`/`finished`. A no-op otherwise
   *  (they're already settled), so it's always safe to call. */
  resolveFinished: () => void;
};

export interface StubViewTransitionOptions {
  /** Runs synchronously, before `update`, so a test can record DOM state (e.g. a
   *  view-transition-name) at the instant production code actually called
   *  `document.startViewTransition` -- checking that state right after `update` runs isn't a
   *  reliable witness, since production code's own callback may already have changed it by
   *  then (fix round 1, Important #2: a test that only checks the end state can't tell "this
   *  never ran" from "this ran and finished"). */
  onStart?: () => void;
  /** Holds `ready`/`finished` unsettled until the returned stub's own `.resolveFinished()` is
   *  called, instead of the default "settles on the next microtask". For a test proving a clear
   *  happens *because* the transition settled, not merely "eventually, for some other reason"
   *  (fix round 1, Important #2). Default false keeps the original auto-settling behaviour, so
   *  existing callers (T10's tests, and every call here that doesn't need this) are unaffected.
   */
  controlFinish?: boolean;
  /** Defers calling `update` to a microtask instead of the default "synchronously, as part of
   *  this call". A real `document.startViewTransition` doesn't hand control back to production
   *  code's own close/open until *after* it has captured a snapshot, which takes at least one
   *  microtask -- long enough for a second, immediately-following event (Back fires popstate
   *  then hashchange) to land before the first one's DOM update has actually run. The default
   *  (synchronous) stub can't reproduce that window: production code's own `finish()` would
   *  already be done by the time the second event arrives. Fix round 1, Important #1. */
  deferUpdate?: boolean;
  /** `ready`/`finished` reject (an `AbortError`, as a real skipped transition's do) instead of
   *  resolving -- `update` still runs, exactly like a real skip (only the animation is
   *  skipped; the DOM update it wraps is not). For proving `runShotTransition`'s own `.catch()`s
   *  keep a skipped transition from surfacing as an unhandled rejection. Fix round 1,
   *  Important #1. */
  reject?: boolean;
}

/**
 * A07: jsdom has no View Transitions API. This stands in for a browser that has one -- `update`
 * runs synchronously by default (as a real `startViewTransition` invokes its callback; pass
 * `deferUpdate` for the one test that needs the real, asynchronous timing instead).
 *
 * Promoted out of tests/project-sheet.test.tsx (T9) so T10's tests can reuse it rather than
 * re-inlining a third copy (the same D-3 reasoning as stubDialog/FakeIO/stubMatchMedia).
 */
export function stubViewTransition(options: StubViewTransitionOptions = {}): ViewTransitionStub {
  let resolve = () => {};
  const settled = options.reject
    ? Promise.reject(new DOMException('Transition was skipped', 'AbortError'))
    : options.controlFinish
      ? new Promise<void>((res) => (resolve = res))
      : Promise.resolve();
  const start = vi.fn((update: () => void) => {
    options.onStart?.();
    if (options.deferUpdate) queueMicrotask(update);
    else update();
    return { ready: settled, finished: settled, updateCallbackDone: settled, types: new Set(), skipTransition() {} };
  }) as ViewTransitionStub;
  start.resolveFinished = resolve;
  (document as unknown as { startViewTransition: typeof start }).startViewTransition = start;
  return start;
}
