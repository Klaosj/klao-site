// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MaskedHeading from '@/components/motion/MaskedHeading';

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

  it('observes the wrapper, reveals it on intersection, then stops observing', () => {
    const { container } = render(<MaskedHeading text="two words" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(observed).toContain(wrapper);
    expect(wrapper.className).not.toContain('in');
    trigger([wrapper]);
    expect(wrapper.className).toContain('in');
    expect(unobserveMock).toHaveBeenCalledOnce();
    expect(unobserveMock).toHaveBeenCalledWith(wrapper);
  });

  it('never observes anything when the visitor asked for reduced motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    render(<MaskedHeading text="two words" />);
    expect(observed).toHaveLength(0);
  });

  it('keeps the separating space outside each word span, not as trailing content inside it', () => {
    // Regression test for a real bug found in Task 11's browser
    // verification: a trailing space as the LAST character inside a
    // `display: inline-block` span is trimmed away by normal CSS
    // white-space collapsing (the box treats it as trailing whitespace at
    // the end of its own internal line), so adjacent words rendered with
    // zero gap between them -- "Business developer" as
    // "Businessdeveloper". jsdom never computes real layout, so this can
    // only assert DOM *structure* (space as a sibling text node after the
    // span, never inside it) -- the actual visual gap was confirmed
    // separately via a real Chrome instance (getBoundingClientRect showed
    // 0px between adjacent word boxes before this fix, a normal gap after).
    const { container } = render(<MaskedHeading text="two words" />);
    const spans = container.querySelectorAll<HTMLElement>('.w');
    expect(spans[0].textContent).toBe('two');
    expect(spans[1].textContent).toBe('words');
    // The space lives between the two spans as its own text node, a
    // sibling of both -- not inside either one.
    expect(spans[0].nextSibling?.textContent).toBe(' ');
    expect(spans[0].nextSibling?.nodeType).toBe(Node.TEXT_NODE);
  });

  it('sets the word index as a custom property on each span', () => {
    const { container } = render(<MaskedHeading text="a b c" />);
    const spans = container.querySelectorAll<HTMLElement>('.w');
    expect(spans[0].style.getPropertyValue('--wi')).toBe('0');
    expect(spans[1].style.getPropertyValue('--wi')).toBe('1');
    expect(spans[2].style.getPropertyValue('--wi')).toBe('2');
  });
});
