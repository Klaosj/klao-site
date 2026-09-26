import { describe, expect, it } from 'vitest';
import { initialTourState, tourReducer, type TourState } from '@/lib/tour-player';

const at = (over: Partial<TourState>): TourState => ({ ...initialTourState, ...over });

describe('tourReducer', () => {
  it('starts idle on the first frame, nothing underneath', () => {
    expect(initialTourState).toEqual({ index: 0, under: null, phase: 'idle', run: 0 });
  });

  it('start: plays from the given frame and bumps `run` so the clock restarts', () => {
    expect(tourReducer(initialTourState, { type: 'start', at: 0 })).toEqual({ index: 0, under: null, phase: 'playing', run: 1 });
  });

  it('advance: moves one frame on and keeps the old frame underneath for the crossfade', () => {
    expect(tourReducer(at({ phase: 'playing', run: 1 }), { type: 'advance', count: 3 })).toEqual({
      index: 1,
      under: 0,
      phase: 'playing',
      run: 1,
    });
  });

  it('advance on the last frame ends the tour there — it plays once, never wraps', () => {
    expect(tourReducer(at({ index: 2, phase: 'playing', run: 1 }), { type: 'advance', count: 3 })).toEqual({
      index: 2,
      under: null,
      phase: 'done',
      run: 1,
    });
  });

  it('advance is ignored unless playing (a late timer after a pause or a visitor click)', () => {
    for (const phase of ['idle', 'paused', 'manual', 'done'] as const) {
      const s = at({ phase });
      expect(tourReducer(s, { type: 'advance', count: 3 })).toBe(s);
    }
  });

  it('pause and resume only move between playing and paused', () => {
    const paused = tourReducer(at({ phase: 'playing' }), { type: 'pause' });
    expect(paused.phase).toBe('paused');
    expect(tourReducer(paused, { type: 'resume' }).phase).toBe('playing');
    const idle = at({});
    expect(tourReducer(idle, { type: 'pause' })).toBe(idle);
    expect(tourReducer(idle, { type: 'resume' })).toBe(idle);
  });

  it('go: a visitor pick hands control to the visitor, wraps at both ends, and crossfades from the old frame', () => {
    expect(tourReducer(at({ phase: 'playing' }), { type: 'go', to: -1, count: 3 })).toMatchObject({ index: 2, under: 0, phase: 'manual' });
    expect(tourReducer(at({ index: 2, phase: 'done' }), { type: 'go', to: 3, count: 3 })).toMatchObject({ index: 0, under: 2, phase: 'manual' });
  });

  it('go to the frame already showing only changes the mode', () => {
    expect(tourReducer(at({ index: 1, phase: 'playing' }), { type: 'go', to: 1, count: 3 })).toEqual({
      index: 1,
      under: null,
      phase: 'manual',
      run: 0,
    });
  });

  it('go on an empty tour does nothing (never a NaN index)', () => {
    const s = at({});
    expect(tourReducer(s, { type: 'go', to: 1, count: 0 })).toBe(s);
  });

  it('replay from done starts again at the first frame, crossfading from the last', () => {
    expect(tourReducer(at({ index: 2, phase: 'done', run: 1 }), { type: 'start', at: 0 })).toEqual({
      index: 0,
      under: 2,
      phase: 'playing',
      run: 2,
    });
  });

  it('settled drops the frame underneath once the crossfade is over', () => {
    expect(tourReducer(at({ index: 1, under: 0 }), { type: 'settled' })).toMatchObject({ index: 1, under: null });
    const clean = at({});
    expect(tourReducer(clean, { type: 'settled' })).toBe(clean);
  });

  it('stop (reduced motion switched on mid-tour) hands control to the visitor', () => {
    expect(tourReducer(at({ phase: 'playing' }), { type: 'stop' }).phase).toBe('manual');
    expect(tourReducer(at({ phase: 'paused' }), { type: 'stop' }).phase).toBe('manual');
    const done = at({ phase: 'done' });
    expect(tourReducer(done, { type: 'stop' })).toBe(done);
  });
});
