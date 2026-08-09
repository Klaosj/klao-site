import { describe, expect, it } from 'vitest';
import { buildLattice, samplePoints } from '@/lib/particles';

describe('buildLattice', () => {
  it('produces nx*ny*nz points', () => {
    const l = buildLattice(3, 2, 3, [6, 3, 6]);
    expect(l.count).toBe(18);
    expect(l.positions).toHaveLength(18 * 3);
    expect(l.seeds).toHaveLength(18);
  });

  it('gives each point a varied random seed in [0, 1), not a fixed value', () => {
    // seeds feed the shader as each particle's animation phase (Task 5); a
    // regression that zeroes/fixes it would silently lock every particle in
    // step, so length alone isn't enough — check spread and range too.
    const l = buildLattice(3, 2, 3, [6, 3, 6]);
    const seeds = Array.from(l.seeds);
    expect(seeds.every((s) => s >= 0 && s < 1)).toBe(true);
    expect(new Set(seeds).size).toBeGreaterThan(1);
  });

  it('links each point to its +x, +y and +z neighbour only', () => {
    // a 2x2x2 cube has 12 edges
    const l = buildLattice(2, 2, 2, [1, 1, 1]);
    expect(l.links).toHaveLength(12 * 2);
  });

  it('centres the lattice on the origin', () => {
    const l = buildLattice(3, 3, 3, [4, 4, 4]);
    const xs = Array.from({ length: l.count }, (_, i) => l.positions[i * 3]);
    expect(Math.min(...xs)).toBeCloseTo(-2, 5);
    expect(Math.max(...xs)).toBeCloseTo(2, 5);
  });

  it('does not divide by zero on a single-slice axis', () => {
    const l = buildLattice(1, 2, 2, [4, 4, 4]);
    expect(Number.isNaN(l.positions[0])).toBe(false);
  });
});

describe('samplePoints', () => {
  const mask = { width: 4, height: 2, filled: [0, 1, 4, 5] };

  it('returns exactly n xyz triples', () => {
    expect(samplePoints(mask, 10, 8)).toHaveLength(30);
  });

  it('keeps every sample inside the requested span', () => {
    const pts = samplePoints(mask, 200, 8);
    for (let i = 0; i < 200; i++) {
      expect(Math.abs(pts[i * 3])).toBeLessThanOrEqual(4);
      expect(Math.abs(pts[i * 3 + 1])).toBeLessThanOrEqual(4);
    }
  });

  it('falls back to a ring rather than collapsing to the origin on an empty mask', () => {
    const spanX = 8;
    const pts = samplePoints({ width: 4, height: 2, filled: [] }, 50, spanX);
    const radii = Array.from({ length: 50 }, (_, i) => Math.hypot(pts[i * 3], pts[i * 3 + 1]));
    expect(Math.min(...radii)).toBeGreaterThan(0);
    // A ring of near-zero radius is visually indistinguishable from the
    // origin-collapse bug this fallback exists to avoid, so pin a real floor
    // (the implementation's own radius floor is 0.18 * spanX).
    expect(Math.min(...radii)).toBeGreaterThanOrEqual(spanX * 0.1);
  });
});
