# klao-site Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the presentation layer of the shipped bilingual site with the approved charcoal/periwinkle design — portrait hero, annotation pills, alternating bands, and a procedural WebGL wordmark — without touching the Notion data layer.

**Architecture:** Design tokens live in `@theme` in `globals.css` and are mirrored as typed float triplets in `src/lib/theme.ts`, so the WebGL shader and the CSS cannot drift apart. Motion is three reusable client components (`Reveal`, `MaskedHeading`, `ParticleField`) that every section composes; each attaches its own classes at runtime so a no-JS page renders fully visible. Sections are server components reading the existing `getProfile/getFeaturedProjects/getCareer` API and passing plain data down.

**Tech Stack:** Next.js 15 App Router · React 19 · TypeScript strict · Tailwind CSS v4 (`@theme`) · Vitest + Testing Library (jsdom) · raw WebGL2 (no Three.js)

## Global Constraints

- **Do not modify** `src/lib/notion.ts`, `src/lib/notion-mappers.ts`, `src/lib/content.ts`, or `src/app/api/img/[...ref]/route.ts`. Presentation layer only.
- **Never invent owner data.** Wordmark text, portrait, email and career rows are owner-supplied. Where absent, render an explicit placeholder — do not guess. A Thai spelling of the owner's name was invented once during prototyping and was wrong.
- **Language selection is server-side.** Render only the active locale. Do not port the prototype's `.en`/`.th` dual-span pattern — it doubles the DOM.
- **Reveal classes are attached by JS, never written into JSX `className`.** No element may be hidden behind `opacity: 0` when JS is off.
- `prefers-reduced-motion: reduce` disables all animation and the custom cursor.
- Zero `.glb` / `.gltf` / texture files in `public/`.
- Every `<img>` carries explicit `width` and `height`.
- Colours: `--color-dark: #17171a`, `--color-deep: #101013`, `--color-light: #ffffff`, `--color-peri: #a8aecb`.
- Gate on `npm run check` (tsc + eslint + vitest). Green before every commit.
- All shell commands run in the **foreground** with an explicit timeout.

---

## File Structure

**Create:**
- `src/lib/theme.ts` — token values shared by CSS and WebGL
- `src/lib/particles.ts` — pure lattice/glyph maths, no WebGL reference
- `src/components/motion/Reveal.tsx` — IntersectionObserver reveal wrapper
- `src/components/motion/MaskedHeading.tsx` — per-word masked headline
- `src/components/motion/ParticleField.tsx` — WebGL2 canvas (client)
- `src/components/sections/Hero.tsx`
- `src/components/sections/AboutBand.tsx`
- `src/components/sections/CraftBand.tsx`
- `src/components/sections/WorkGrid.tsx`
- `src/components/sections/CvBand.tsx`
- `src/components/sections/ContactBand.tsx`
- `src/components/CopyEmail.tsx` — clipboard button with copied state
- Tests: `tests/theme.test.ts`, `tests/particles.test.ts`, `tests/reveal.test.tsx`,
  `tests/masked-heading.test.tsx`, `tests/particle-field.test.tsx`,
  `tests/dictionary.test.ts`, `tests/hero.test.tsx`, `tests/bands.test.tsx`,
  `tests/work-grid.test.tsx`, `tests/cv-band.test.tsx`, `tests/copy-email.test.tsx`,
  `tests/no-placeholders.test.tsx`

**Modify:**
- `src/app/globals.css` — replace the six light tokens with the dark system
- `src/lib/dictionary.ts` — add the new UI strings
- `src/components/SiteNav.tsx` — monogram + band inversion
- `src/components/SiteFooter.tsx` — dark footer
- `src/app/[locale]/page.tsx` — compose the new sections

**Untouched:** everything under `src/lib/notion*`, `src/lib/content.ts`, `src/app/api/`.

---

### Task 1: Design tokens shared by CSS and WebGL

**Files:**
- Create: `src/lib/theme.ts`
- Modify: `src/app/globals.css`
- Test: `tests/theme.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `HEX: Record<TokenName, string>`, `rgbFloat(hex: string): [number, number, number]`, `PARTICLE_COLORS: { pointA: [number,number,number]; pointB: [number,number,number]; line: [number,number,number] }`

- [ ] **Step 1: Write the failing test**

```ts
// tests/theme.test.ts
import { describe, expect, it } from 'vitest';
import { HEX, PARTICLE_COLORS, rgbFloat } from '@/lib/theme';

describe('theme tokens', () => {
  it('exposes the approved palette', () => {
    expect(HEX.dark).toBe('#17171a');
    expect(HEX.deep).toBe('#101013');
    expect(HEX.light).toBe('#ffffff');
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/theme.test.ts`
Expected: FAIL — `Cannot find module '@/lib/theme'`

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/theme.ts

/** Single source of truth for colour. `globals.css` mirrors these into
 *  Tailwind's `@theme`; the WebGL shader reads the float form. Changing a
 *  colour in one place and not the other is the failure this file prevents. */
export const HEX = {
  dark: '#17171a',
  deep: '#101013',
  light: '#ffffff',
  peri: '#a8aecb',
  periDeep: '#7d86ad',
} as const;

export type TokenName = keyof typeof HEX;

/** WebGL wants 0..1 per channel, CSS wants hex. Convert in exactly one place. */
export function rgbFloat(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`rgbFloat expects #rrggbb, got "${hex}"`);
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

export const PARTICLE_COLORS = {
  pointA: rgbFloat(HEX.peri),
  pointB: rgbFloat(HEX.periDeep),
  line: rgbFloat('#3d4054'),
} as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/theme.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Replace the CSS tokens**

```css
/* src/app/globals.css */
@import "tailwindcss";

/* Mirrors src/lib/theme.ts — keep the two in step. */
@theme {
  --color-dark: #17171a;
  --color-deep: #101013;
  --color-light: #ffffff;
  --color-peri: #a8aecb;
  --color-peri-deep: #7d86ad;
  --color-on-dark: #ffffff;
  --color-on-dark-soft: rgba(255, 255, 255, 0.60);
  --color-on-dark-faint: rgba(255, 255, 255, 0.13);
  --color-on-light: #17171a;
  --color-on-light-soft: #63636b;
  --color-on-light-faint: #e6e6ea;
  --font-display: "Avenir Next", Futura, "Helvetica Neue", -apple-system, sans-serif;
  --font-thai: -apple-system, "Sukhumvit Set", "IBM Plex Sans Thai", "Noto Sans Thai", sans-serif;
}

@layer base {
  body {
    background: var(--color-dark);
    color: var(--color-on-dark);
    -webkit-font-smoothing: antialiased;
  }
  /* Thai needs more leading than Latin at the same size. */
  :lang(th) {
    font-family: var(--font-thai);
    line-height: 1.75;
  }
}
```

- [ ] **Step 6: Run the full gate**

Run: `npm run check`
Expected: tsc clean, eslint clean, tests pass. If `tests/smoke.test.tsx` asserts
an old token name, update the assertion to the new token — do not delete the test.

- [ ] **Step 7: Commit**

```bash
git add src/lib/theme.ts src/app/globals.css tests/theme.test.ts
git commit -m "feat: dark/periwinkle design tokens shared by CSS and WebGL"
```

---

### Task 2: Reveal primitive

**Files:**
- Create: `src/components/motion/Reveal.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/reveal.test.tsx`

**Interfaces:**
- Consumes: nothing
- Produces: `<Reveal as?: ElementType delayIndex?: number className?: string children>` — adds class `rv`, then `in` on intersection

- [ ] **Step 1: Write the failing test**

```tsx
// tests/reveal.test.tsx
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Reveal from '@/components/motion/Reveal';

let observed: Element[] = [];
let trigger: (els: Element[]) => void = () => {};

beforeEach(() => {
  observed = [];
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  class IO {
    constructor(private cb: IntersectionObserverCallback) {
      trigger = (els) =>
        this.cb(
          els.map((t) => ({ target: t, isIntersecting: true }) as IntersectionObserverEntry),
          this as never,
        );
    }
    observe(el: Element) { observed.push(el); }
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('IntersectionObserver', IO);
});

describe('Reveal', () => {
  it('renders its children', () => {
    render(<Reveal>hello</Reveal>);
    expect(screen.getByText('hello')).toBeTruthy();
  });

  it('adds the hiding class only from the effect, then reveals on intersection', () => {
    const { container } = render(<Reveal>hello</Reveal>);
    const el = container.firstElementChild as HTMLElement;
    expect(observed).toContain(el);
    expect(el.className).toContain('rv');
    trigger([el]);
    expect(el.className).toContain('in');
  });

  it('stays visible when the visitor asked for reduced motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    const { container } = render(<Reveal>hello</Reveal>);
    expect((container.firstElementChild as HTMLElement).className).not.toContain('rv');
  });

  it('sets the stagger index as a custom property', () => {
    const { container } = render(<Reveal delayIndex={3}>x</Reveal>);
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue('--i')).toBe('3');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/reveal.test.tsx`
Expected: FAIL — `Cannot find module '@/components/motion/Reveal'`

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/motion/Reveal.tsx
'use client';

import { useEffect, useRef, type ElementType, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  as?: ElementType;
  delayIndex?: number;
  className?: string;
};

/** The hiding class is added in an effect, never in JSX. With JS disabled the
 *  element ships fully visible instead of stranded at opacity:0. */
export default function Reveal({ children, as: Tag = 'div', delayIndex = 0, className = '' }: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (typeof IntersectionObserver === 'undefined') return;

    el.classList.add('rv');
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={className} style={{ ['--i' as string]: String(delayIndex) }}>
      {children}
    </Tag>
  );
}
```

- [ ] **Step 4: Add the reveal CSS**

Append to `src/app/globals.css`:

```css
@layer components {
  .rv {
    opacity: 0;
    transform: translateY(26px);
    transition:
      opacity 0.95s cubic-bezier(0.16, 1, 0.3, 1),
      transform 0.95s cubic-bezier(0.16, 1, 0.3, 1);
    transition-delay: calc(var(--i, 0) * 75ms);
  }
  .rv.in { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  .rv { transition: none !important; opacity: 1 !important; transform: none !important; }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/reveal.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/components/motion/Reveal.tsx tests/reveal.test.tsx src/app/globals.css
git commit -m "feat: Reveal primitive that stays visible without JS"
```

---

### Task 3: Masked per-word heading

**Files:**
- Create: `src/components/motion/MaskedHeading.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/masked-heading.test.tsx`

**Interfaces:**
- Consumes: nothing
- Produces: `<MaskedHeading text: string level?: 1|2|3 className?: string>`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/masked-heading.test.tsx
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MaskedHeading from '@/components/motion/MaskedHeading';

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class {
    observe() {} unobserve() {} disconnect() {}
  });
});

describe('MaskedHeading', () => {
  it('splits into one span per word without losing the sentence', () => {
    const { container } = render(<MaskedHeading text="I close the deal" level={1} />);
    expect(container.querySelectorAll('.w')).toHaveLength(4);
    expect(container.textContent?.replace(/\s+/g, ' ').trim()).toBe('I close the deal');
  });

  it('puts the mask on a wrapper, never on the observed element itself', () => {
    // Chrome folds an element's own clip into its intersection rect, so a
    // clipped element reports 0% visible and the observer never fires it.
    const { container } = render(<MaskedHeading text="two words" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('rv-mask');
    expect(wrapper.style.clipPath).toBe('');
    expect(wrapper.querySelector('h2')).toBeTruthy();
  });

  it('renders the requested heading level', () => {
    const { container } = render(<MaskedHeading text="x" level={1} />);
    expect(container.querySelector('h1')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/masked-heading.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/motion/MaskedHeading.tsx
'use client';

import { useEffect, useRef } from 'react';

type Props = { text: string; level?: 1 | 2 | 3; className?: string };

export default function MaskedHeading({ text, level = 2, className = '' }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const words = text.trim().split(/\s+/);
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3';

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} className="rv-mask">
      <Tag className={className}>
        {words.map((w, i) => (
          <span key={`${w}-${i}`} className="w" style={{ ['--wi' as string]: String(i) }}>
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </Tag>
    </div>
  );
}
```

- [ ] **Step 4: Add the mask CSS**

Inside the existing `@layer components` block in `globals.css`:

```css
  .rv-mask { overflow: hidden; }
  .rv-mask .w {
    display: inline-block;
    transform: translateY(112%);
    transition: transform 0.95s cubic-bezier(0.16, 1, 0.3, 1);
    transition-delay: calc(var(--wi, 0) * 52ms);
  }
  .rv-mask.in .w { transform: none; }
```

And inside the reduced-motion block:

```css
  .rv-mask .w { transform: none !important; transition: none !important; }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/masked-heading.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/components/motion/MaskedHeading.tsx tests/masked-heading.test.tsx src/app/globals.css
git commit -m "feat: per-word masked heading with the mask on a wrapper"
```

---

### Task 4: Particle maths (pure, no WebGL)

**Files:**
- Create: `src/lib/particles.ts`
- Test: `tests/particles.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `type GlyphMask = { width: number; height: number; filled: number[] }`, `type Lattice = { positions: Float32Array; seeds: Float32Array; links: Uint32Array; count: number }`, `buildLattice(nx, ny, nz, span: [number,number,number]): Lattice`, `samplePoints(mask: GlyphMask, n: number, spanX: number): Float32Array`

- [ ] **Step 1: Write the failing test**

```ts
// tests/particles.test.ts
import { describe, expect, it } from 'vitest';
import { buildLattice, samplePoints } from '@/lib/particles';

describe('buildLattice', () => {
  it('produces nx*ny*nz points', () => {
    const l = buildLattice(3, 2, 3, [6, 3, 6]);
    expect(l.count).toBe(18);
    expect(l.positions).toHaveLength(18 * 3);
    expect(l.seeds).toHaveLength(18);
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
    const pts = samplePoints({ width: 4, height: 2, filled: [] }, 50, 8);
    const radii = Array.from({ length: 50 }, (_, i) => Math.hypot(pts[i * 3], pts[i * 3 + 1]));
    expect(Math.min(...radii)).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/particles.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/particles.ts

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/particles.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/particles.ts tests/particles.test.ts
git commit -m "feat: pure lattice and glyph-sampling maths for the particle field"
```

---

### Task 5: ParticleField WebGL component

**Files:**
- Create: `src/components/motion/ParticleField.tsx`
- Test: `tests/particle-field.test.tsx`

**Interfaces:**
- Consumes: `buildLattice`, `samplePoints`, `GlyphMask` (Task 4); `PARTICLE_COLORS` (Task 1)
- Produces: `<ParticleField word: string heroSelector: string>` — fixed full-viewport canvas, `aria-hidden="true"`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/particle-field.test.tsx
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ParticleField from '@/components/motion/ParticleField';

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});

describe('ParticleField', () => {
  it('renders a decorative canvas that assistive tech ignores', () => {
    const { container } = render(<ParticleField word="SUWICHAK" heroSelector="#hero" />);
    const c = container.querySelector('canvas');
    expect(c).toBeTruthy();
    expect(c?.getAttribute('aria-hidden')).toBe('true');
  });

  it('degrades silently when WebGL2 is unavailable', () => {
    // jsdom has no WebGL. The component must not throw and must not block paint.
    expect(() => render(<ParticleField word="X" heroSelector="#hero" />)).not.toThrow();
  });

  it('does not throw when the hero element is absent', () => {
    expect(() => render(<ParticleField word="X" heroSelector="#nope" />)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/particle-field.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

Port the working shader pair and render loop from the prototype's second
`<script>` block at
`.superpowers/brainstorm/11719-1786211516/content/studio.html`
into a `'use client'` component whose whole body runs inside one
`useEffect(() => { … }, [word])`. Required deviations from the prototype:

1. Colours come from `PARTICLE_COLORS`, never from inline literals.
2. Geometry comes from `buildLattice(17, 10, 17, [6.4, 3.5, 6.4])` and
   `samplePoints(rasterise(word), lattice.count, 9.2)`.
3. `rasterise(word): GlyphMask` draws to an offscreen 2D canvas and returns the
   indices of filled pixels. When `/[฀-๿]/.test(word)`, switch to the
   Thai font stack and drop the letter gap to `0.02` — a Latin display face has
   no Thai glyphs and rasterises to empty boxes, which the particles would then
   faithfully assemble into.
4. Guard the context: `const gl = canvas.getContext('webgl2'); if (!gl) return;`
5. On coarse pointers (`matchMedia('(pointer: coarse)').matches`) build
   `buildLattice(11, 7, 11, [6.4, 3.5, 6.4])` instead. Mobile target is ≥ 30 fps.
6. Under `prefers-reduced-motion: reduce`, draw one static frame and never start
   the loop.
7. Stop the loop the moment the canvas is invisible:

```ts
const onScroll = () => {
  const hero = document.querySelector(heroSelector) as HTMLElement | null;
  if (!hero) return;
  const p = Math.min(Math.max(window.scrollY / Math.max(hero.offsetHeight, 1), 0), 1);
  morph = Math.min(p / 0.62, 1);
  fade = (1 - Math.min(Math.max((p - 0.82) / 0.18, 0), 1)) * 0.85;
  canvas.style.opacity = String(fade);
  if (fade <= 0.001) {
    running = false;
  } else if (!running) {
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }
};
```

8. Return a cleanup that cancels the pending frame and removes both listeners.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/particle-field.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Verify in a real browser**

Run `npm run dev` in the foreground with a 30s timeout, open `/th`, confirm the
field renders and the wordmark resolves as you scroll.

**Before trusting any frame-rate number,** confirm the browser window is in a
normal state — not minimised, not occluded. Exactly-1000ms frame gaps mean
Chrome is throttling an occluded window to 1 Hz, which is not a page problem.
Measure with:

```js
let n = 0; const t0 = performance.now();
const f = () => { n++; performance.now() - t0 < 1000 ? requestAnimationFrame(f) : console.log('fps', n); };
requestAnimationFrame(f);
```

Expected: ≥ 60 on desktop.

- [ ] **Step 6: Commit**

```bash
git add src/components/motion/ParticleField.tsx tests/particle-field.test.tsx
git commit -m "feat: procedural WebGL particle field, loop stops past the hero"
```

---

### Task 6: Dictionary strings for the new sections

**Files:**
- Modify: `src/lib/dictionary.ts`
- Test: `tests/dictionary.test.ts`

**Interfaces:**
- Consumes: the existing `UiDict` type
- Produces: new keys `greeting`, `roleLine`, `about`, `howIWork`, `selectedWork`, `craft` (a `readonly string[]` of six), `copied`, `startConversation`, `basedIn`, `workingIn`, `photoPlaceholder`, `careerUnpublished`

- [ ] **Step 1: Write the failing test**

```ts
// tests/dictionary.test.ts
import { describe, expect, it } from 'vitest';
import { dict } from '@/lib/dictionary';

describe('dictionary', () => {
  it('has the same key set in both locales', () => {
    expect(Object.keys(dict.th).sort()).toEqual(Object.keys(dict.en).sort());
  });

  it('carries exactly six craft imperatives in both locales', () => {
    expect(dict.en.craft).toHaveLength(6);
    expect(dict.th.craft).toHaveLength(6);
  });

  it('has no empty strings in either locale', () => {
    for (const d of [dict.en, dict.th]) {
      for (const [k, v] of Object.entries(d)) {
        if (typeof v === 'string') expect(v.length, `${k} is empty`).toBeGreaterThan(0);
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/dictionary.test.ts`
Expected: FAIL — `dict.en.craft` is undefined

- [ ] **Step 3: Extend the dictionary**

Add to the `en` object in `src/lib/dictionary.ts`:

```ts
  greeting: "Hi, I'm",
  roleLine: 'Business Development · builds his own tools',
  about: 'About',
  howIWork: 'How I work',
  selectedWork: 'Selected work',
  craft: [
    'Scope it honestly.',
    'Ship something that runs.',
    'Write it in both languages.',
    'Leave it maintainable.',
    'Say the number out loud.',
    'Then hand over the keys.',
  ] as readonly string[],
  copied: 'Copied',
  startConversation: 'Start a conversation',
  basedIn: 'Based in',
  workingIn: 'Working in',
  photoPlaceholder: 'Photo',
  careerUnpublished: 'Career data not yet published',
```

And the matching entries in `th`:

```ts
  greeting: 'สวัสดีครับ ผม',
  roleLine: 'Business Development · สร้างเครื่องมือเอง',
  about: 'เกี่ยวกับ',
  howIWork: 'วิธีทำงานของผม',
  selectedWork: 'ผลงานที่เลือกมา',
  craft: [
    'ประเมินตามจริง',
    'ส่งของที่รันได้จริง',
    'เขียนให้ครบสองภาษา',
    'ทิ้งไว้ให้ดูแลต่อได้',
    'พูดตัวเลขออกมาตรงๆ',
    'แล้วส่งกุญแจให้',
  ] as readonly string[],
  copied: 'คัดลอกแล้ว',
  startConversation: 'เริ่มคุยกัน',
  basedIn: 'ประจำอยู่',
  workingIn: 'ทำงานเป็น',
  photoPlaceholder: 'รูป',
  careerUnpublished: 'ยังไม่ได้เผยแพร่ประวัติการทำงาน',
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/dictionary.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/dictionary.ts tests/dictionary.test.ts
git commit -m "feat: dictionary entries for the redesigned sections"
```

---

### Task 7: Hero section

**Files:**
- Create: `src/components/sections/Hero.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/hero.test.tsx`

**Interfaces:**
- Consumes: `Reveal` (T2), `MaskedHeading` (T3), `dict` (T6), `Locale` and `Profile` from `@/lib/models`
- Produces: `<Hero profile: Profile locale: Locale wordmark: string>`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/hero.test.tsx
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Hero from '@/components/sections/Hero';

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
});

const profile = {
  name: 'Suwichak Jarunopratamp',
  headline: { en: 'I close the deal and ship the thing.', th: 'ผมปิดดีลเอง แล้วสร้างของเอง' },
  byline: { en: 'BD who builds', th: 'BD ที่สร้างเอง' },
  email: 'real@example.com',
  photoSrc: '',
  linkedin: '',
  github: '',
  resumeUrl: '',
} as never;

describe('Hero', () => {
  it('renders the headline from the profile, not a hardcoded string', () => {
    render(<Hero profile={profile} locale="en" wordmark="SUWICHAK" />);
    expect(screen.getByText(/close the deal/)).toBeTruthy();
  });

  it('hides the annotation pills from assistive tech', () => {
    const { container } = render(<Hero profile={profile} locale="en" wordmark="SUWICHAK" />);
    expect(container.querySelector('[data-pills]')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows a labelled placeholder when no portrait is supplied', () => {
    const { container } = render(<Hero profile={profile} locale="en" wordmark="SUWICHAK" />);
    expect(container.querySelector('[data-portrait-placeholder]')).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
  });

  it('gives the portrait explicit dimensions and real alt text when one exists', () => {
    const withPhoto = { ...profile, photoSrc: '/api/img/page/abc/Photo' } as never;
    const { container } = render(<Hero profile={withPhoto} locale="en" wordmark="S" />);
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('width')).toBe('118');
    expect(img.getAttribute('height')).toBe('118');
    expect(img.getAttribute('alt')).toBe('Suwichak Jarunopratamp');
  });

  it('never ships a dead link', () => {
    const { container } = render(<Hero profile={profile} locale="en" wordmark="S" />);
    for (const a of container.querySelectorAll('a')) {
      expect(a.getAttribute('href')).not.toBe('#');
    }
  });

  it('omits the CTA entirely when no email is published', () => {
    const noMail = { ...profile, email: '' } as never;
    const { container } = render(<Hero profile={noMail} locale="en" wordmark="S" />);
    expect(container.querySelector('a')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/hero.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/sections/Hero.tsx
import MaskedHeading from '@/components/motion/MaskedHeading';
import Reveal from '@/components/motion/Reveal';
import { dict } from '@/lib/dictionary';
import type { Locale, Profile } from '@/lib/models';

const PILLS: Record<Locale, readonly string[]> = {
  en: ['Business Development', 'Builds the systems too', 'Bangkok'],
  th: ['พัฒนาธุรกิจ', 'สร้างระบบเองด้วย', 'กรุงเทพฯ'],
};

export default function Hero({
  profile,
  locale,
}: {
  profile: Profile;
  locale: Locale;
  wordmark: string;
}) {
  const t = dict[locale];

  return (
    <section
      id="hero"
      className="relative z-[2] flex min-h-screen flex-col items-center justify-center px-6 pt-32 pb-24 text-center"
    >
      <Reveal className="relative mb-7 h-[118px] w-[118px]">
        <span className="pointer-events-none absolute -inset-2 rounded-full border border-dashed border-peri/50" />
        {profile.photoSrc ? (
          <img
            src={profile.photoSrc}
            alt={profile.name}
            width={118}
            height={118}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <span
            data-portrait-placeholder
            className="grid h-full w-full place-items-center rounded-full bg-peri text-[8px] uppercase tracking-[0.16em] text-dark/55"
          >
            {t.photoPlaceholder}
          </span>
        )}
      </Reveal>

      {/* The same three facts appear in the byline below, so these are decoration. */}
      <div data-pills aria-hidden="true">
        {PILLS[locale].map((label, i) => (
          <span key={label} className={`pill pill-${i + 1}`} style={{ ['--pi' as string]: String(i) }}>
            {label}
          </span>
        ))}
      </div>

      <p className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {t.greeting} {profile.name.split(' ')[0]}
      </p>
      <p className="mt-2 text-[12.5px] text-on-dark-soft">{t.roleLine}</p>

      <MaskedHeading
        text={profile.headline[locale]}
        level={1}
        className="mt-8 max-w-[15ch] text-[clamp(34px,6.4vw,84px)] font-bold leading-[1.08] tracking-[-0.03em]"
      />

      <Reveal as="p" className="mt-9 max-w-[60ch] text-[14.5px] leading-[1.95] text-on-dark-soft">
        {profile.byline[locale]}
      </Reveal>

      {profile.email && (
        <Reveal delayIndex={1}>
          <a
            href={`mailto:${profile.email}`}
            className="mt-10 inline-flex items-center gap-3 rounded-full bg-light px-8 py-4 text-[13.5px] font-semibold text-dark"
          >
            {t.startConversation} <span aria-hidden="true">→</span>
          </a>
        </Reveal>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Add the pill CSS**

Inside `@layer components` in `globals.css`, port `.pill`, `.pill-1/2/3` and the
drift keyframes from the prototype. Two rules that must be obeyed:

```css
  /* One rule for the lit state. A second rule setting `transform: none` at
     equal specificity later in the sheet silently kills the pointer lag. */
  #hero .pill { transform: translate(var(--lagX, 0px), var(--lagY, 0px)); }
```

Do **not** give `.pill` a `backdrop-filter`: it sits over a live canvas and
forces a backdrop recompute on every painted frame.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/hero.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add src/components/sections/Hero.tsx tests/hero.test.tsx src/app/globals.css
git commit -m "feat: hero with portrait, annotation pills and masked statement"
```

---

### Task 8: About and Craft bands

**Files:**
- Create: `src/components/sections/AboutBand.tsx`, `src/components/sections/CraftBand.tsx`
- Test: `tests/bands.test.tsx`

**Interfaces:**
- Consumes: `Reveal` (T2), `MaskedHeading` (T3), `dict` (T6), `Locale`/`Profile`
- Produces: `<AboutBand profile: Profile locale: Locale>`, `<CraftBand locale: Locale>`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/bands.test.tsx
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CraftBand from '@/components/sections/CraftBand';
import { dict } from '@/lib/dictionary';

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
});

describe('CraftBand', () => {
  it('renders all six imperatives for the active locale only', () => {
    render(<CraftBand locale="th" />);
    for (const line of dict.th.craft) expect(screen.getByText(line)).toBeTruthy();
    // The other language must not be in the DOM at all — that is the whole
    // point of rendering per-locale on the server.
    for (const line of dict.en.craft) expect(screen.queryByText(line)).toBeNull();
  });

  it('marks the imperatives up as a list', () => {
    const { container } = render(<CraftBand locale="en" />);
    expect(container.querySelectorAll('li')).toHaveLength(6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/bands.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Write CraftBand**

```tsx
// src/components/sections/CraftBand.tsx
import MaskedHeading from '@/components/motion/MaskedHeading';
import Reveal from '@/components/motion/Reveal';
import { dict } from '@/lib/dictionary';
import type { Locale } from '@/lib/models';

export default function CraftBand({ locale }: { locale: Locale }) {
  const t = dict[locale];
  return (
    <section id="craft" className="relative z-[2] bg-deep px-6 py-[11vh]">
      <p className="mb-5 font-mono text-[9.5px] uppercase tracking-[0.24em] text-on-dark-soft">
        {t.howIWork}
      </p>
      <MaskedHeading
        text={t.howIWork}
        level={2}
        className="max-w-[17ch] text-[clamp(30px,5.1vw,64px)] font-bold leading-[1.1] tracking-[-0.028em]"
      />
      <ul className="mt-14 flex list-none flex-col gap-[2px]">
        {t.craft.map((line, i) => (
          <Reveal
            as="li"
            key={line}
            delayIndex={i}
            className={`text-[clamp(24px,4.2vw,52px)] font-bold leading-[1.14] tracking-[-0.03em] ${
              i === 0 ? 'text-on-dark' : 'text-on-dark-soft'
            }`}
          >
            {line}
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 4: Write AboutBand**

Same shape, white band. `<section className="relative z-[2] bg-light text-on-light px-6 py-[11vh]">`,
a `MaskedHeading` for the big heading, then a two-column grid
(`grid gap-[clamp(30px,6vw,96px)] md:grid-cols-2`) whose prose column is
`max-w-[68ch]` — the reference sites hold their reading column at ~644px, and
past ~70ch it stops being comfortable. Source the prose from
`profile.byline[locale]` plus static bilingual copy; do not invent biography.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/bands.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add src/components/sections/AboutBand.tsx src/components/sections/CraftBand.tsx tests/bands.test.tsx
git commit -m "feat: about and craft bands"
```

---

### Task 9: Work grid

**Files:**
- Create: `src/components/sections/WorkGrid.tsx`
- Test: `tests/work-grid.test.tsx`

**Interfaces:**
- Consumes: `Reveal` (T2), `dict` (T6), the existing `Project` model
- Produces: `<WorkGrid projects: Project[] locale: Locale>`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/work-grid.test.tsx
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorkGrid from '@/components/sections/WorkGrid';

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
});

const projects = [
  {
    slug: 'gonai',
    title: { en: 'GoNai', th: 'GoNai' },
    summary: { en: 'Trip planner', th: 'วางแผนทริป' },
    coverSrc: '/api/img/page/1/Cover',
    year: 2026,
    liveUrl: 'https://gonai.example',
    repoUrl: '',
  },
] as never[];

describe('WorkGrid', () => {
  it('links each card to its live URL, never to "#"', () => {
    const { container } = render(<WorkGrid projects={projects} locale="en" />);
    expect((container.querySelector('a') as HTMLAnchorElement).getAttribute('href')).toBe(
      'https://gonai.example',
    );
  });

  it('gives every cover explicit dimensions, lazy loading and real alt text', () => {
    const { container } = render(<WorkGrid projects={projects} locale="en" />);
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('width')).toBeTruthy();
    expect(img.getAttribute('height')).toBeTruthy();
    expect(img.getAttribute('alt')).toContain('GoNai');
    expect(img.getAttribute('loading')).toBe('lazy');
  });

  it('renders a project with no cover as text rather than a broken frame', () => {
    const noCover = [{ ...projects[0], coverSrc: '' }] as never[];
    const { container } = render(<WorkGrid projects={noCover} locale="en" />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('GoNai')).toBeTruthy();
  });

  it('renders a non-link card when a project has neither live nor repo URL', () => {
    const noLink = [{ ...projects[0], liveUrl: '', repoUrl: '' }] as never[];
    const { container } = render(<WorkGrid projects={noLink} locale="en" />);
    expect(container.querySelector('a')).toBeNull();
    expect(screen.getByText('GoNai')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/work-grid.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

Render `<section className="relative z-[2] bg-dark px-6 py-[11vh]">` containing a
12-column grid (`grid grid-cols-12 gap-6`). The first project spans 12 columns,
the rest span 6 (`md:col-span-6`). Each card:

- If `project.liveUrl || project.repoUrl` exists, wrap in `<a href={that}>`.
  Otherwise wrap in a plain `<div>`. **Never emit `href="#"`.**
- If `project.coverSrc` is non-empty, render the browser-chrome frame — a
  rounded 12px border with three 8px dots along a 1px divider — then the
  `<img>` with `width`, `height`, `loading="lazy"`, `decoding="async"` and
  `alt={`${title} — ${summary}`}`.
- Below the frame, a flex row with the title and a mono meta line
  (`{summary} · {year}`).
- Wrap each card in `<Reveal delayIndex={i}>`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/work-grid.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/WorkGrid.tsx tests/work-grid.test.tsx
git commit -m "feat: work grid of real product captures in browser chrome"
```

---

### Task 10: CV band, contact band and copy-to-clipboard

**Files:**
- Create: `src/components/sections/CvBand.tsx`, `src/components/sections/ContactBand.tsx`, `src/components/CopyEmail.tsx`
- Test: `tests/cv-band.test.tsx`, `tests/copy-email.test.tsx`

**Interfaces:**
- Consumes: `Reveal` (T2), `MaskedHeading` (T3), `dict` (T6), the existing `CareerEntry` and `Profile` models
- Produces: `<CvBand entries: CareerEntry[] locale: Locale>`, `<ContactBand profile: Profile locale: Locale>`, `<CopyEmail email: string copiedLabel: string>`

- [ ] **Step 1: Write the failing tests**

```tsx
// tests/copy-email.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CopyEmail from '@/components/CopyEmail';

afterEach(() => vi.unstubAllGlobals());

describe('CopyEmail', () => {
  it('writes the address to the clipboard and shows a copied state', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    render(<CopyEmail email="a@b.co" copiedLabel="Copied" />);
    fireEvent.click(screen.getByRole('button'));

    expect(writeText).toHaveBeenCalledWith('a@b.co');
    expect(await screen.findByText('Copied')).toBeTruthy();
  });

  it('still shows the address as readable text when the clipboard API is absent', () => {
    vi.stubGlobal('navigator', {});
    render(<CopyEmail email="a@b.co" copiedLabel="Copied" />);
    expect(screen.getByText('a@b.co')).toBeTruthy();
  });
});
```

```tsx
// tests/cv-band.test.tsx
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CvBand from '@/components/sections/CvBand';
import { dict } from '@/lib/dictionary';

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
});

describe('CvBand', () => {
  it('renders real career rows', () => {
    const entries = [
      { company: 'Acme', role: { en: 'BD Lead', th: 'หัวหน้า BD' }, start: '2024', end: '' },
    ] as never[];
    render(<CvBand entries={entries} locale="en" />);
    expect(screen.getByText('Acme')).toBeTruthy();
  });

  it('says the data is missing rather than inventing a company', () => {
    render(<CvBand entries={[]} locale="en" />);
    expect(screen.getByText(dict.en.careerUnpublished)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/copy-email.test.tsx tests/cv-band.test.tsx`
Expected: FAIL — modules not found

- [ ] **Step 3: Write CopyEmail**

```tsx
// src/components/CopyEmail.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

export default function CopyEmail({ email, copiedLabel }: { email: string; copiedLabel: string }) {
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      // The Clipboard API needs a secure context. Selecting the text is a weak
      // fallback, but it beats a button that appears to do nothing.
      const t = document.createElement('textarea');
      t.value = email;
      t.style.position = 'fixed';
      t.style.opacity = '0';
      document.body.appendChild(t);
      t.select();
      try { document.execCommand('copy'); } catch { /* nothing left to try */ }
      t.remove();
    }
    setDone(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDone(false), 2000);
  }

  return (
    <button type="button" onClick={copy} className="inline-flex items-center gap-2.5 text-[15px]">
      <span className="border-b border-on-dark-faint pb-[3px]">{email}</span>
      <span
        aria-live="polite"
        className={`font-mono text-[9px] uppercase tracking-[0.18em] text-peri transition-opacity ${
          done ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {copiedLabel}
      </span>
    </button>
  );
}
```

- [ ] **Step 4: Write CvBand and ContactBand**

`CvBand`: `<section id="cv" className="relative z-[2] bg-deep px-6 py-[11vh]">` with a
2×2 stat grid beside a timeline `<ul>`. Each `<li>` is a `Reveal` carrying company,
role for the active locale, and the year range. When `entries.length === 0`, render
`{dict[locale].careerUnpublished}` — do not fabricate rows.

`ContactBand`: dark band, centred, `MaskedHeading` for the statement, then the
three channels. The email channel renders `<CopyEmail email={profile.email}
copiedLabel={t.copied} />` when `profile.email` is non-empty and is omitted
entirely when it is not.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/copy-email.test.tsx tests/cv-band.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/components/CopyEmail.tsx src/components/sections/CvBand.tsx src/components/sections/ContactBand.tsx tests/copy-email.test.tsx tests/cv-band.test.tsx
git commit -m "feat: CV band and clipboard-backed contact"
```

---

### Task 11: Compose the page, rewrite nav and footer, add the ship guard

**Files:**
- Modify: `src/app/[locale]/page.tsx`, `src/components/SiteNav.tsx`, `src/components/SiteFooter.tsx`, `tests/smoke.test.tsx`
- Test: `tests/no-placeholders.test.tsx`

**Interfaces:**
- Consumes: every section from Tasks 7–10, `ParticleField` (T5)
- Produces: the assembled home route

- [ ] **Step 1: Write the failing guard test**

```tsx
// tests/no-placeholders.test.tsx
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Spec acceptance criteria A7 and A8, enforced. These strings are fine in the
 *  prototypes under .superpowers/ but must never reach src/. */
const BANNED = ['example.dev', 'from Notion · Career', 'lorem ipsum', 'Lorem ipsum'];

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}

describe('shipped source', () => {
  const files = walk('src').filter((f) => /\.(tsx|ts|css)$/.test(f));

  it('contains no placeholder copy', () => {
    for (const f of files) {
      const body = readFileSync(f, 'utf8');
      for (const bad of BANNED) expect(body, `${f} contains "${bad}"`).not.toContain(bad);
    }
  });

  it('contains no dead links', () => {
    for (const f of files.filter((n) => n.endsWith('.tsx'))) {
      const body = readFileSync(f, 'utf8');
      expect(body, `${f} has href="#"`).not.toMatch(/href=["']#["']/);
    }
  });
});
```

- [ ] **Step 2: Run test to see where the source actually stands**

Run: `npx vitest run tests/no-placeholders.test.tsx`
Expected: FAIL if any placeholder crept in during Tasks 7–10. Fix the source,
never the banned list.

- [ ] **Step 3: Compose the page**

```tsx
// src/app/[locale]/page.tsx
import ParticleField from '@/components/motion/ParticleField';
import AboutBand from '@/components/sections/AboutBand';
import ContactBand from '@/components/sections/ContactBand';
import CraftBand from '@/components/sections/CraftBand';
import CvBand from '@/components/sections/CvBand';
import Hero from '@/components/sections/Hero';
import WorkGrid from '@/components/sections/WorkGrid';
import { getCareer, getFeaturedProjects, getProfile } from '@/lib/content';
import { assertLocale } from '@/lib/locale';

// See layout.tsx: a layout-level `dynamicParams = false` poisons
// writing/[slug], so it is set per leaf page instead.
export const dynamicParams = false;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = assertLocale((await params).locale);
  const [profile, projects, career] = await Promise.all([
    getProfile(),
    getFeaturedProjects(),
    getCareer(),
  ]);

  // Owner-supplied and still undecided. Until it is, derive from the profile
  // rather than guessing a brand name.
  const wordmark = (profile.name.split(' ')[0] ?? '').toUpperCase();

  return (
    <>
      <ParticleField word={wordmark} heroSelector="#hero" />
      <Hero profile={profile} locale={locale} wordmark={wordmark} />
      <AboutBand profile={profile} locale={locale} />
      <CraftBand locale={locale} />
      <WorkGrid projects={projects} locale={locale} />
      <CvBand entries={career} locale={locale} />
      <ContactBand profile={profile} locale={locale} />
    </>
  );
}
```

Rewrite `SiteNav.tsx`: a circular monogram badge showing the first initial of
`profile.name`, four in-page anchors (`#hero`, `#about`, `#work`, `#cv`), social
links rendered only when the corresponding profile field is non-empty, and the
existing `LocaleToggle`. Add a scroll listener that toggles a `nav-on-light`
class when a `bg-light` band is under the header — the header is fixed and
transparent, so without this the links disappear over the white band.

Rewrite `SiteFooter.tsx` to the dark treatment: `bg-deep`, a top hairline, the
copyright line, and nothing that links to `#`.

- [ ] **Step 4: Run the full gate**

Run: `npm run check`
Expected: tsc clean, eslint clean, every test green. Update `tests/smoke.test.tsx`
assertions that reference removed markup — adjust them to the new structure
rather than deleting coverage.

- [ ] **Step 5: Verify both locales in a real browser**

Run `npm run dev` in the foreground with a 30s timeout. Open `/th` and `/en` and
confirm all of:

1. No language leaking — searching the DOM for an English craft line while on
   `/th` returns nothing.
2. The wordmark resolves as the hero scrolls, face-on at the end.
3. The nav inverts over the white About band and back.
4. With `prefers-reduced-motion: reduce` forced on, nothing animates and every
   section is visible.
5. With JavaScript disabled, every section is visible.
6. Lighthouse accessibility ≥ 95 on `/en`.

- [ ] **Step 6: Commit**

```bash
git add -A src tests
git commit -m "feat: compose redesigned home route, nav and footer"
```

---

## Blocked on owner input

These cannot be closed by the implementer. Track them; do not invent them.

| Input | Blocks | Behaviour until supplied |
|---|---|---|
| Wordmark text | A8 | Falls back to first name, uppercased |
| Portrait image | — | Labelled placeholder disc |
| Licensed display typeface (woff2) | Visual fidelity | System `Avenir Next` stand-in |
| Real email address | A7, A8 | CTA and email channel omitted entirely |
| Career rows in Notion | A8 | "Career data not yet published" |
| Written pieces | Spec §12 | Home stays a landing page, not a doorway |

---

## Self-Review

**Spec coverage.** §2 direction → T1. §3 zones → T7–T11. §4 motion → T2, T3, T7.
§5 particle field → T4, T5. §6 content model → T9, T10, T11. §7 budget → T5 step 5
and T11 step 5. §8 accessibility → T2 (no-JS), T5 (aria-hidden, reduced motion),
T7 and T9 (alt text, explicit dimensions). §9 traps → inline warnings in T3 step 1,
T5 steps 3 and 5, T7 step 4. §10 open items → the blocked table above.
§13 A1 → T8/T11 step 5; A2 → T2; A3 → T2/T3/T5; A4 → T5 step 5; A5 → T4/T5
(procedural only, no asset files introduced); A6 → T11 step 5; A7/A8 → T11 guard
test; A9 → `npm run check` in every task; A10 → T11 step 5.

**Gap found and closed:** the spec's A10 (Lighthouse ≥ 95) had no task when first
drafted. It is now item 6 of T11 step 5. The spec's no-JS requirement (A2) also had
no assertion; it is now item 5 of the same step, backed by the T2 unit test.

**Placeholder scan.** No "TBD", "TODO", or "similar to Task N". T5, T8 step 4, T9
step 3, T10 step 4 and T11 step 3 describe porting or composing rather than inlining
another 300 lines of shader and grid CSS; each names the exact source file and lists
the required deviations, which is a concrete instruction rather than a deferral.

**Type consistency.** `Locale` and `Profile` come from `@/lib/models` in every task
that uses them. `rgbFloat` and `PARTICLE_COLORS` (T1) keep the same names at their
T5 call sites. `buildLattice`/`samplePoints`/`GlyphMask` (T4) match T5 exactly.
`Reveal`'s `delayIndex` prop is spelled identically in T2, T7, T8, T9, T10.
`MaskedHeading`'s `text`/`level`/`className` are identical in T3, T7, T8, T10.
`dict[locale].careerUnpublished` is defined in T6 and asserted in T10's test.
