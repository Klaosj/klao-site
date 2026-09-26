import { act } from '@testing-library/react';
import { vi } from 'vitest';

/**
 * Advance fake time in 50 ms steps, each inside act(). The tour schedules each
 * frame's timer from an effect, and React flushes effects only when act()
 * returns, so one big advanceTimersByTime() would stop after the first frame.
 * Every tour duration is a multiple of 50 ms, so a timer due on a step
 * boundary is re-armed on time.
 */
export function tick(ms: number): void {
  for (let left = ms; left > 0; left -= 50) {
    const step = Math.min(50, left);
    act(() => {
      vi.advanceTimersByTime(step);
    });
  }
}
