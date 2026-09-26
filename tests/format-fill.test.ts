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
});
