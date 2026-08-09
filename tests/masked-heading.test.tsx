// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MaskedHeading from '@/components/motion/MaskedHeading';

// MaskedHeading now adds `rv-mask`/`w` only from inside its effect (never in
// JSX), mirroring Reveal.tsx -- see the component's own header comment for
// the no-JS clipping bug this fixes. Every `render()` below still goes
// through Testing Library's `act()` wrapper, which flushes the initial
// mount effect synchronously before `render()` returns, and `beforeEach`
// always stubs a working `matchMedia`/`IntersectionObserver` pair -- so
// every assertion here that checks for `rv-mask`/`.w` is implicitly
// asserting POST-EFFECT state, the same DOM shape the old JSX-based version
// always had in this test environment. The one case that differs is the
// true no-JS path, which cannot run any effect at all -- covered by its own
// test at the bottom of this file via `renderToStaticMarkup`.

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

  it('puts the mask on a wrapper, never on the observed element itself, once the effect has run', () => {
    // Chrome folds an element's own clip into its intersection rect, so a
    // clipped element reports 0% visible and the observer never fires it.
    // `rv-mask` is added by the effect, not JSX -- see the no-JS test below
    // for the state before any effect has run.
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

  it('never clips a single word when JS has not run -- the server-rendered markup carries neither masking class', () => {
    // The regression this guards against (see the component's own header
    // comment): a previous version of this component wrote `rv-mask`/`w`
    // directly into JSX, so globals.css's `.rv-mask{overflow:hidden}` and
    // `.rv-mask .w{transform:translateY(112%)}` clipped every word away
    // permanently whenever JS never ran -- no JS at all, a hydration
    // failure, or an environment without IntersectionObserver.
    // `renderToStaticMarkup` never executes effects (there is no DOM, no
    // commit phase, nothing to flush), so its output is exactly the markup
    // a visitor without working JS receives -- a stronger proof than
    // stubbing IntersectionObserver as undefined inside a jsdom `render()`,
    // which still runs the effect (down to its very first early-return
    // line) as a side effect of mounting into a real DOM.
    const text = 'Business developer who builds his own tools.';
    const html = renderToStaticMarkup(<MaskedHeading text={text} level={1} />);

    const parsed = document.createElement('div');
    parsed.innerHTML = html;
    expect(parsed.querySelector('.rv-mask')).toBeNull();
    expect(parsed.querySelector('.w')).toBeNull();
    // Every word survives, not just "some text remains" -- a regression
    // that clips only the last word (the real bug found in Chrome) would
    // still leave a non-empty textContent.
    expect(parsed.textContent?.replace(/\s+/g, ' ').trim()).toBe(text);
  });

  it('never observes anything when IntersectionObserver is unavailable, and never masks the words either', () => {
    // Same bail-out condition the effect checks for `prefers-reduced-motion`
    // above, exercised for the other guard on the same line: an
    // environment with no IntersectionObserver support at all (the brief's
    // third named no-JS-equivalent case, alongside JS-disabled and a
    // hydration failure) must not mask words it can then never reveal.
    vi.stubGlobal('IntersectionObserver', undefined);
    const { container } = render(<MaskedHeading text="two words" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).not.toContain('rv-mask');
    expect(container.querySelectorAll('.w')).toHaveLength(0);
    expect(container.textContent?.replace(/\s+/g, ' ').trim()).toBe('two words');
  });
});
