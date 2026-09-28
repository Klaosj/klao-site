import { describe, expect, it } from 'vitest';
import { fill, fillCount } from '@/lib/format';

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

// T12 m1: the ⌘K count read "1 results". English has a singular; Thai says both the same way,
// so the dictionary owns both forms per locale and code only picks one by the count.
describe('fillCount', () => {
  it('uses the singular form for exactly one, and the plural for everything else', () => {
    expect(fillCount(1, '{n} results', '{n} result')).toBe('1 result');
    expect(fillCount(0, '{n} results', '{n} result')).toBe('0 results');
    expect(fillCount(2, '{n} results', '{n} result')).toBe('2 results');
    expect(fillCount(11, '{n} results', '{n} result')).toBe('11 results');
  });
});
