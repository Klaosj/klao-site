// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Reveal from '@/components/motion/Reveal';

let observed: Element[] = [];
let options: IntersectionObserverInit | undefined;
let trigger: (els: Element[], isIntersecting?: boolean) => void = () => {};
let unobserveMock: ReturnType<typeof vi.fn>;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  observed = [];
  options = undefined;
  unobserveMock = vi.fn();
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  class IO {
    constructor(private cb: IntersectionObserverCallback, opts?: IntersectionObserverInit) {
      options = opts;
      trigger = (els, isIntersecting = true) =>
        this.cb(els.map((t) => ({ target: t, isIntersecting }) as IntersectionObserverEntry), this as never);
    }
    observe(el: Element) { observed.push(el); }
    unobserve(el: Element) { unobserveMock(el); }
    disconnect() {}
  }
  vi.stubGlobal('IntersectionObserver', IO);
});

describe('Reveal', () => {
  it('renders its children', () => {
    render(<Reveal>hello</Reveal>);
    expect(screen.getByText('hello')).toBeTruthy();
  });

  // Review Focus #4: the server HTML carries the class but no inline style
  // that could hide anything; CSS alone decides, and only under html.js.
  it('ships `rv` in the server HTML with no inline opacity or transform', () => {
    const html = renderToStaticMarkup(<Reveal as="h2">Title</Reveal>);
    expect(html).toContain('class="rv"');
    expect(html).toContain('Title');
    expect(html).not.toMatch(/opacity|transform|visibility|display:\s*none/);
  });

  it('adds `in` once the element crosses the 85 % line, then stops watching it', () => {
    const { container } = render(<Reveal>hello</Reveal>);
    const el = container.firstElementChild as HTMLElement;
    expect(observed).toContain(el);
    expect(options?.rootMargin).toBe('0px 0px -15% 0px');
    trigger([el], false);
    expect(el.classList.contains('in')).toBe(false);
    trigger([el]);
    expect(el.classList.contains('in')).toBe(true);
    expect(unobserveMock).toHaveBeenCalledWith(el);
  });

  it('reveals at once under reduced motion, without observing', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    const { container } = render(<Reveal>hello</Reveal>);
    expect((container.firstElementChild as HTMLElement).classList.contains('in')).toBe(true);
    expect(observed).toHaveLength(0);
  });

  it('reveals at once where IntersectionObserver does not exist', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const { container } = render(<Reveal>hello</Reveal>);
    expect((container.firstElementChild as HTMLElement).classList.contains('in')).toBe(true);
  });

  it('marks headline blocks `big` and keeps caller classes', () => {
    const { container } = render(
      <Reveal big className="car-h">
        x
      </Reveal>,
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toBe('rv big car-h');
  });

  it('sets the stagger index as a custom property', () => {
    const { container } = render(<Reveal delayIndex={3}>x</Reveal>);
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue('--i')).toBe('3');
  });
});
