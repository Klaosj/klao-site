// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { Sketch, SKETCH_NAMES, TileIcon, isSketchName } from '@/components/sketches';

afterEach(cleanup);

describe('Sketch', () => {
  it('knows the five chapter sketches plus rings and five', () => {
    expect(SKETCH_NAMES).toEqual(['room', 'cases', 'formats', 'rollout', 'handover', 'rings', 'five']);
  });

  it.each(SKETCH_NAMES)('renders %s as a decorative svg by default', (name) => {
    const { container } = render(<Sketch name={name} />);
    const svg = container.querySelector('svg')!;
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('role')).toBeNull();
    expect(svg.querySelectorAll('path, rect, circle').length).toBeGreaterThan(0);
  });

  it('gives chapter sketches the 160 x 64 box and the `sk` class the By-day layout sizes', () => {
    const { container } = render(<Sketch name="room" className="mt-4" />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toBe('0 0 160 64');
    expect(svg.getAttribute('class')).toBe('sk mt-4');
    expect(svg.textContent).toBe('NDA');
  });

  it('becomes an image with an accessible name when given a label', () => {
    const { container } = render(<Sketch name="rings" label="Three nested rings labelled TAM, SAM and SOM." />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Three nested rings labelled TAM, SAM and SOM.');
    expect(svg.hasAttribute('aria-hidden')).toBe(false);
  });

  it('labels the full rings TAM / SAM / SOM with the caption, and drops all text in the thumbnail', () => {
    const full = renderToStaticMarkup(<Sketch name="rings" caption="Method, not to scale." />);
    for (const word of ['TAM', 'SAM', 'SOM', 'Method, not to scale.']) expect(full).toContain(word);
    expect(full).toContain('viewBox="0 0 320 260"');
    const thumb = renderToStaticMarkup(<Sketch name="rings" small caption="Method, not to scale." />);
    expect(thumb).not.toMatch(/TAM|SAM|SOM|Method/);
    expect(thumb).toContain('viewBox="0 0 320 182"');
  });

  it('draws five app tiles collapsing into one GoNai tile, icons only at full size', () => {
    const { container } = render(<Sketch name="five" />);
    // Six parts (five tiles + GoNai), each a transform-free group around its positioned tile
    // (the sheet's fill-in transforms the outer group; see the rings/five staging test below).
    expect(container.querySelectorAll('svg > g')).toHaveLength(6);
    expect(container.querySelectorAll('svg > g > g[transform^="translate"]')).toHaveLength(6);
    // GoNai's own mark, per --gonai (master green rule, preflight A6): styled through the
    // CSS var rather than a hard-coded hex, so dark mode swaps to the dark-mode green too.
    expect(container.querySelector('rect[style*="--gonai"]')).toBeTruthy();
    // Fix wave finding 10: the pin icon inside that tile used to be a
    // literal #FFFFFF, which stayed white-on-white in dark mode where
    // --canvas (what "on the tile" means everywhere else) is near-black.
    expect(container.querySelector('g[style*="--canvas"]')).toBeTruthy();
    expect(container.querySelector('g[stroke="#FFFFFF"], g[stroke="#fff"]')).toBeNull();
    // The icons: five app glyphs and GoNai's pin, one level inside each positioned tile.
    expect(container.querySelectorAll('svg > g > g > g').length).toBe(6);
    cleanup();
    const thumb = render(<Sketch name="five" small />);
    expect(thumb.container.querySelectorAll('svg > g > g > g')).toHaveLength(0);
  });

  // "Every sheet moves once" (spec 2026-09-30-sheet-clips.md): the sheet fills these parts in,
  // in this order. A CSS transform replaces an SVG transform attribute instead of adding to it,
  // so a staged part must never carry one itself -- or the fill-in would throw it to the origin.
  it('stages the rings outer to inner, each ring with its own label', () => {
    const { container } = render(<Sketch name="rings" caption="Method, not to scale." />);
    const parts = Array.from(container.querySelectorAll<SVGGElement>('svg > .sk-step'));
    expect(parts.map((g) => g.getAttribute('class'))).toEqual(['sk-step sk-ring', 'sk-step sk-ring', 'sk-step sk-ring']);
    expect(parts.map((g) => g.style.getPropertyValue('--i'))).toEqual(['0', '1', '2']);
    expect(parts.map((g) => g.textContent)).toEqual(['TAM', 'SAM', 'SOM']);
    expect(parts.map((g) => Number(g.querySelector('circle')!.getAttribute('r')))).toEqual([105, 72, 34]);
    for (const g of parts) expect(g.hasAttribute('transform')).toBe(false);
    // The caption is not a part: it never moves.
    expect(container.querySelector('svg > text')?.textContent).toBe('Method, not to scale.');
  });

  it('stages five apps -> one as tiles left to right, the arrow, then GoNai', () => {
    const { container } = render(<Sketch name="five" />);
    const parts = Array.from(container.querySelectorAll<SVGElement>('svg > .sk-step'));
    expect(parts.map((el) => el.getAttribute('class'))).toEqual([
      'sk-step',
      'sk-step',
      'sk-step',
      'sk-step',
      'sk-step',
      'sk-step sk-arrow',
      'sk-step sk-one',
    ]);
    expect(parts.map((el) => el.style.getPropertyValue('--i'))).toEqual(['0', '1', '2', '3', '4', '5', '6']);
    for (const el of parts) expect(el.hasAttribute('transform')).toBe(false);
    expect(parts[6].querySelector('rect[style*="--gonai"]')).toBeTruthy();
  });

  it('draws the same final picture in the server HTML: no start state is baked into the markup', () => {
    for (const name of ['rings', 'five'] as const) {
      const html = renderToStaticMarkup(<Sketch name={name} />);
      expect(html).not.toMatch(/opacity|scale\(|data-enter/);
    }
  });

  it('renders nothing, without throwing, for an unknown or empty name (chapter 6 has no sketch)', () => {
    expect(() => render(<Sketch name="phases" />)).not.toThrow();
    expect(renderToStaticMarkup(<Sketch name="phases" />)).toBe('');
    expect(renderToStaticMarkup(<Sketch name="" />)).toBe('');
  });

  it('narrows strings with isSketchName', () => {
    expect(isSketchName('five')).toBe(true);
    expect(isSketchName('Five')).toBe(false);
  });
});

describe('TileIcon', () => {
  it('renders a decorative 24-unit line icon', () => {
    const { container } = render(<TileIcon name="pin" className="size-6" />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('fill')).toBe('none');
    expect(svg.getAttribute('stroke')).toBe('currentColor');
    expect(svg.getAttribute('class')).toBe('size-6');
  });
});
