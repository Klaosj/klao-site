/**
 * The hero tour's playback rules (spec §6: plays once and ends on the last
 * frame; a visitor pick stops it; Play resumes). Pure, so the rules are tested
 * without a DOM. HeroTourStage owns the clock (one setTimeout with
 * remaining-time bookkeeping) and dispatches these actions.
 *
 * `under` is the frame that stays visible underneath while the new one fades
 * in on top — a top-layer crossfade, never a 50/50 blend. `run` bumps on every
 * (re)start, so the stage's clock knows to take a fresh dwell.
 */
export type TourPhase = 'idle' | 'playing' | 'paused' | 'manual' | 'done';

export interface TourState {
  index: number;
  under: number | null;
  phase: TourPhase;
  run: number;
}

export type TourAction =
  | { type: 'start'; at: number }
  | { type: 'advance'; count: number }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'go'; to: number; count: number }
  | { type: 'settled' }
  | { type: 'stop' };

export const initialTourState: TourState = { index: 0, under: null, phase: 'idle', run: 0 };

const wrap = (i: number, count: number): number => ((i % count) + count) % count;

function moveTo(s: TourState, to: number): Pick<TourState, 'index' | 'under'> {
  return to === s.index ? { index: s.index, under: s.under } : { index: to, under: s.index };
}

export function tourReducer(s: TourState, a: TourAction): TourState {
  switch (a.type) {
    case 'start':
      return { ...s, ...moveTo(s, a.at), phase: 'playing', run: s.run + 1 };
    case 'advance':
      if (s.phase !== 'playing') return s;
      return s.index + 1 < a.count ? { ...s, ...moveTo(s, s.index + 1) } : { ...s, phase: 'done' };
    case 'pause':
      return s.phase === 'playing' ? { ...s, phase: 'paused' } : s;
    case 'resume':
      return s.phase === 'paused' ? { ...s, phase: 'playing' } : s;
    case 'go':
      if (a.count < 1) return s;
      return { ...s, ...moveTo(s, wrap(a.to, a.count)), phase: 'manual' };
    case 'settled':
      return s.under === null ? s : { ...s, under: null };
    case 'stop':
      return s.phase === 'playing' || s.phase === 'paused' ? { ...s, phase: 'manual' } : s;
  }
}
