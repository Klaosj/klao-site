import { useLayoutEffect, useState } from 'react';
import { motionAllowed } from './motion';

// A one-shot entrance for a picture that is already on screen: the project sheet's drawn media
// (the Notion row, the TAM/SAM/SOM rings, five apps -> one) fills in once when the sheet opens,
// the moment a product clip would start (spec docs/superpowers/specs/2026-09-30-sheet-clips.md,
// "Every sheet moves once"). The phase goes on the element as `data-enter`; the CSS
// (project-sheet.css) keys the start state off "from" and the transition off "go".
//
// - 'rest': the server render, the first client render and reduced motion. No attribute, so no
//   CSS applies and every part is in its final state -- nothing is dimmed without JavaScript.
// - 'from': set in a layout effect, so it lands before the first paint (no flash of the final
//   state, and a View Transition's "after" snapshot already shows it). Parts are dimmed to .55,
//   never hidden.
// - 'go': once `startAfter` resolves (the sheet's own open animation has finished); the CSS
//   transitions every part to its final state. It stays 'go': the motion never repeats while
//   the picture stays mounted.
export type EnterPhase = 'rest' | 'from' | 'go';

/** `startAfter` must be stable (module-level): it is an effect dependency. */
export function useEnterOnce(startAfter: () => Promise<unknown>, enabled = true): EnterPhase {
  const [phase, setPhase] = useState<EnterPhase>('rest');
  useLayoutEffect(() => {
    if (!enabled || !motionAllowed()) return;
    let alive = true;
    setPhase('from');
    startAfter().then(
      () => {
        if (alive) setPhase('go');
      },
      // Nothing to wait for any more: show the final state without a transition.
      () => {
        if (alive) setPhase('rest');
      },
    );
    return () => {
      alive = false;
    };
  }, [enabled, startAfter]);
  return phase;
}
