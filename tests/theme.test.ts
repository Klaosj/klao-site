import { describe, expect, it } from 'vitest';
import { HEX, PARTICLE_COLORS, rgbFloat } from '@/lib/theme';

describe('theme tokens', () => {
  it('exposes the approved palette', () => {
    expect(HEX.dark).toBe('#17171a');
    expect(HEX.deep).toBe('#101013');
    expect(HEX.light).toBe('#fafafd');
    expect(HEX.peri).toBe('#a8aecb');
  });

  it('converts hex to 0..1 floats for the shader', () => {
    expect(rgbFloat('#ffffff')).toEqual([1, 1, 1]);
    expect(rgbFloat('#000000')).toEqual([0, 0, 0]);
    const [r, g, b] = rgbFloat(HEX.peri);
    expect(r).toBeCloseTo(0.659, 2);
    expect(g).toBeCloseTo(0.682, 2);
    expect(b).toBeCloseTo(0.796, 2);
  });

  it('rejects a malformed hex instead of silently producing NaN', () => {
    expect(() => rgbFloat('#fff')).toThrow();
  });

  it('derives particle colours from the palette, not from literals', () => {
    expect(PARTICLE_COLORS.pointA).toEqual(rgbFloat(HEX.peri));
  });

  it('defines a glow colour for the resolved wordmark', () => {
    expect(PARTICLE_COLORS.glow).toHaveLength(3);
    // Brighter than pointA on every channel — the whole point of the glow.
    PARTICLE_COLORS.glow.forEach((c, i) => {
      expect(c).toBeGreaterThanOrEqual(PARTICLE_COLORS.pointA[i]);
    });
  });
});
