export type GlyphMask = { width: number; height: number; filled: number[] };

export type Lattice = {
  positions: Float32Array;
  seeds: Float32Array;
  links: Uint32Array;
  count: number;
};

/** A 3D grid of points plus the +x/+y/+z edges between them. Deliberately free
 *  of any WebGL reference so it can be unit tested under jsdom. */
export function buildLattice(
  nx: number,
  ny: number,
  nz: number,
  span: [number, number, number],
): Lattice {
  const count = nx * ny * nz;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const links: number[] = [];
  const at = (i: number, j: number, k: number) => (i * ny + j) * nz + k;
  const axis = (v: number, n: number, s: number) => (n === 1 ? 0 : (v / (n - 1) - 0.5) * s);

  for (let i = 0; i < nx; i++)
    for (let j = 0; j < ny; j++)
      for (let k = 0; k < nz; k++) {
        const p = at(i, j, k);
        positions[p * 3] = axis(i, nx, span[0]);
        positions[p * 3 + 1] = axis(j, ny, span[1]);
        positions[p * 3 + 2] = axis(k, nz, span[2]);
        seeds[p] = Math.random();
        if (i < nx - 1) links.push(p, at(i + 1, j, k));
        if (j < ny - 1) links.push(p, at(i, j + 1, k));
        if (k < nz - 1) links.push(p, at(i, j, k + 1));
      }

  return { positions, seeds, links: new Uint32Array(links), count };
}

/** Scatter n points across the filled pixels of a rasterised glyph, preserving
 *  the mask's aspect ratio. */
export function samplePoints(mask: GlyphMask, n: number, spanX: number): Float32Array {
  const out = new Float32Array(n * 3);
  const spanY = spanX * (mask.height / mask.width);

  if (mask.filled.length === 0) {
    // An empty mask means the font had no glyph for this string. A ring is an
    // obvious "something is wrong" shape; collapsing to the origin is not.
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = spanX * 0.18 + Math.random() * spanX * 0.05;
      out[i * 3] = Math.cos(a) * r;
      out[i * 3 + 1] = Math.sin(a) * r;
      out[i * 3 + 2] = (Math.random() - 0.5) * 0.42;
    }
    return out;
  }

  for (let i = 0; i < n; i++) {
    const idx = mask.filled[Math.floor(Math.random() * mask.filled.length)];
    const px = idx % mask.width;
    const py = Math.floor(idx / mask.width);
    out[i * 3] = ((px + Math.random()) / mask.width - 0.5) * spanX;
    out[i * 3 + 1] = -((py + Math.random()) / mask.height - 0.5) * spanY;
    out[i * 3 + 2] = (Math.random() - 0.5) * 0.42;
  }
  return out;
}
