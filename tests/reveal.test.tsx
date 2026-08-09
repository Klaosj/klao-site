// @vitest-environment jsdom
// Only this file needs a DOM (Testing Library's `render`); the rest of the
// suite stays on the default `node` environment set in vitest.config.ts.
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Reveal from '@/components/motion/Reveal';

let observed: Element[] = [];
let trigger: (els: Element[]) => void = () => {};
let unobserveMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  observed = [];
  unobserveMock = vi.fn();
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

  it('adds the hiding class only from the effect, then reveals on intersection', () => {
    const { container } = render(<Reveal>hello</Reveal>);
    const el = container.firstElementChild as HTMLElement;
    expect(observed).toContain(el);
    expect(el.className).toContain('rv');
    trigger([el]);
    expect(el.className).toContain('in');
    expect(unobserveMock).toHaveBeenCalledOnce();
    expect(unobserveMock).toHaveBeenCalledWith(el);
  });

  it('stays visible when the visitor asked for reduced motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    const { container } = render(<Reveal>hello</Reveal>);
    expect((container.firstElementChild as HTMLElement).className).not.toContain('rv');
    expect(observed).toHaveLength(0);
  });

  it('sets the stagger index as a custom property', () => {
    const { container } = render(<Reveal delayIndex={3}>x</Reveal>);
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue('--i')).toBe('3');
  });
});
