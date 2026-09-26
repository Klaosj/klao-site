import { describe, expect, it } from 'vitest';
import { fill } from '@/lib/format';

describe('fill', () => {
  it('fills named slots', () => {
    expect(fill('{n} results', { n: 3 })).toBe('3 results');
    expect(fill('Ask Klao: “{q}”', { q: 'hi' })).toBe('Ask Klao: “hi”');
  });

  it('leaves an unknown slot visible, so a typo shows on screen instead of vanishing', () => {
    expect(fill('{x} stays', {})).toBe('{x} stays');
  });

  it('only fills slots the caller passed, never names inherited from Object.prototype', () => {
    // `'toString' in {}` is true through the prototype chain; the slot must
    // stay as written instead of rendering a native function's source.
    expect(fill('{toString}', {})).toBe('{toString}');
    expect(fill('{constructor} {hasOwnProperty}', {})).toBe('{constructor} {hasOwnProperty}');
  });
});
