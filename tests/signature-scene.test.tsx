// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SignatureScene, { type SignatureCopy } from '@/components/SignatureScene';

const COPY: SignatureCopy = {
  eyebrow: '2022 → 2026',
  title: 'The idea, then the app.',
  sub: 'Tripedia made the final 30 of 500 teams in 2022. Four years later, GoNai is that idea, built and live.',
  cardKicker: '2022 · Tripedia · Co-founder',
  cardQuestion: 'Why does planning one trip take five apps?',
  statValue: '30',
  statTotal: '500',
  cardLabel: 'final teams · KATALYST Startup Launchpad',
  capTitle: 'Four years. The idea stayed.',
  capSub: 'Same question, now with the tools to build the answer alone.',
  endTitle: 'GoNai · Live',
  endSub: 'One-day Bangkok trip planner with exact budgets, built as a weekend project.',
  openLabel: 'Open app',
  openHref: 'https://gonai-three.vercel.app',
  frameSrc: '/images/gonai.jpg',
  frameAlt: 'GoNai home screen: Plan a full day out, know every baht before you leave, with a budget prompt.',
};

type Observed = { cb: IntersectionObserverCallback; targets: Element[]; disconnected: boolean };
let observers: Observed[] = [];
let reduce = false;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers(); // safety net for the fake-timer resize test below, even if it throws first
});

beforeEach(() => {
  observers = [];
  reduce = false;
  // "(prefers-reduced-motion: reduce)" follows `reduce`; "(… no-preference)" is its inverse.
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: q.includes(': reduce') ? reduce : q.includes('no-preference') ? !reduce : false,
    media: q,
    addEventListener() {},
    removeEventListener() {},
  }));
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      entry: Observed;
      constructor(cb: IntersectionObserverCallback) {
        this.entry = { cb, targets: [], disconnected: false };
        observers.push(this.entry);
      }
      observe(el: Element) {
        this.entry.targets.push(el);
      }
      unobserve() {}
      disconnect() {
        this.entry.disconnected = true;
      }
    },
  );
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  // jsdom 30 implements CSS.supports and answers true for 'animation-timeline: view()'. Default
  // these tests to the fallback path (Firefox today); the CSS-path test opts in explicitly.
  vi.stubGlobal('CSS', { supports: () => false });
  // The pin decision now reads `document.documentElement.clientHeight` (fix round 1, Important),
  // not `window.innerHeight` -- toolbar-proof on mobile. jsdom has no layout engine and defaults
  // it to 0; give it the same 768 jsdom already gives `window.innerHeight` so the existing
  // "pinned by default" tests keep their prior baseline, and let individual tests override it.
  Object.defineProperty(document.documentElement, 'clientHeight', { value: 768, configurable: true });
});

const sectionOf = (c: HTMLElement) => c.querySelector('#signature') as HTMLElement;
// Reveal (the headline) runs its own observer; the scene's is the one watching the section.
const sceneObserver = (root: Element) => observers.find((o) => o.targets.includes(root));
const intersect = (o: Observed, root: Element) =>
  act(() => o.cb([{ isIntersecting: true, target: root } as unknown as IntersectionObserverEntry], {} as IntersectionObserver));

// jsdom has no ResizeObserver at all (unlike IntersectionObserver, stubbed above), so this
// scene's card/body watch (fix round 1, item 3) never ran in this suite until now.
type ObservedRO = { cb: ResizeObserverCallback; targets: Element[] };
const stubResizeObserver = () => {
  const ros: ObservedRO[] = [];
  vi.stubGlobal(
    'ResizeObserver',
    class {
      entry: ObservedRO;
      constructor(cb: ResizeObserverCallback) {
        this.entry = { cb, targets: [] };
        ros.push(this.entry);
      }
      observe(el: Element) {
        this.entry.targets.push(el);
      }
      unobserve() {}
      disconnect() {}
    },
  );
  return ros;
};
const resize = (o: ObservedRO, target: Element) => act(() => o.cb([{ target } as unknown as ResizeObserverEntry], {} as ResizeObserver));

describe('SignatureScene: server HTML (Review Focus #4)', () => {
  it('is the static stack: every caption present, nothing hidden inline, not pinned', () => {
    const html = renderToStaticMarkup(<SignatureScene copy={COPY} />);
    for (const s of [COPY.eyebrow, COPY.title, COPY.sub, COPY.cardKicker, COPY.cardQuestion!, COPY.cardLabel, COPY.capTitle, COPY.capSub, COPY.endTitle, COPY.endSub, COPY.openLabel]) {
      expect(html).toContain(s);
    }
    expect(html).toMatch(/>30<span[^>]*> \/ <\/span>500</);
    expect(html).toMatch(/<section id="signature" class="sig" aria-labelledby="sig-h">/);
    expect(html).not.toMatch(/style="[^"]*opacity:\s*0/);
  });
});

describe('SignatureScene: markup', () => {
  it('labels the section by its heading and hides the decorative tiles and year chip', () => {
    reduce = true;
    const { container } = render(<SignatureScene copy={COPY} />);
    expect(container.querySelector('#sig-h')?.textContent).toBe(COPY.title);
    expect(container.querySelector('.sig-apps')?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelectorAll('.sig-app')).toHaveLength(5);
    expect(container.querySelector('.sig-chip')?.getAttribute('aria-hidden')).toBe('true');
    expect(Array.from(container.querySelectorAll('.sig-year')).map((y) => y.textContent)).toEqual(['2022', '2023', '2024', '2025', '2026']);
    expect(container.querySelector('.sig-frame img')?.getAttribute('alt')).toBe(COPY.frameAlt);
    const open = container.querySelector('a.sig-open') as HTMLAnchorElement;
    expect(open.getAttribute('href')).toBe(COPY.openHref);
    expect(open.getAttribute('target')).toBe('_blank');
    expect(open.getAttribute('rel')).toContain('noreferrer');
  });

  it('locks the two captions to .glass.glass-pill (C-4) and the GoNai face to exactly one, first, tile (A09)', () => {
    const { container } = render(<SignatureScene copy={COPY} />);
    for (const sel of ['.sig-cap-a', '.sig-cap-b']) {
      const cap = container.querySelector(sel);
      expect(cap?.classList.contains('glass')).toBe(true);
      expect(cap?.classList.contains('glass-pill')).toBe(true);
    }
    expect(container.querySelectorAll('.sig-app-face')).toHaveLength(1);
    // The first .sig-app in document order is the one that becomes GoNai's pin.
    expect(container.querySelector('.sig-app')?.querySelector('.sig-app-face')).not.toBeNull();
  });

  it('drops the frame, the link and the card question when the data has none', () => {
    reduce = true;
    const { container } = render(<SignatureScene copy={{ ...COPY, frameSrc: null, openHref: null, cardQuestion: null }} />);
    expect(container.querySelector('.sig-frame')).toBeNull();
    expect(container.querySelector('a.sig-open')).toBeNull();
    expect(container.querySelector('.sig-card-q')).toBeNull();
  });
});

describe('SignatureScene: motion modes', () => {
  it('stays the static stack under reduced motion, with no scroll work even in view', () => {
    reduce = true;
    const add = vi.spyOn(window, 'addEventListener');
    const { container } = render(<SignatureScene copy={COPY} />);
    const root = sectionOf(container);
    expect(root.classList.contains('pin')).toBe(false);
    for (const el of root.querySelectorAll('[data-sig-part]')) expect(el.getAttribute('style')).toBeNull();
    intersect(sceneObserver(root)!, root);
    expect(add.mock.calls.filter(([type]) => type === 'scroll')).toHaveLength(0);
  });

  it('stays the static stack on a screen under 600 px tall', () => {
    // The stable height (document.documentElement.clientHeight), not window.innerHeight --
    // see the toolbar-resize test below for why.
    Object.defineProperty(document.documentElement, 'clientHeight', { value: 560, configurable: true });
    const { container } = render(<SignatureScene copy={COPY} />);
    expect(sectionOf(container).classList.contains('pin')).toBe(false);
  });

  it('ignores a toolbar-only resize (window.innerHeight moving, stable height unchanged), but relayouts on a real width change (fix round 1, Important)', () => {
    vi.useFakeTimers();
    const { container } = render(<SignatureScene copy={COPY} />);
    const root = sectionOf(container);
    expect(root.classList.contains('pin')).toBe(true); // default env: width 1024, stable height 768
    // classList.toggle('pin', …) is the first thing layout() does, every time it runs -- a direct
    // proxy for "did the resize handler actually relayout", independent of whether pin flips.
    const toggle = vi.spyOn(root.classList, 'toggle');

    // Mobile Safari/Chrome resize the window whenever their toolbar collapses or expands --
    // near enough every scroll-direction change -- moving window.innerHeight without moving
    // document.documentElement.clientHeight, the stable height layout() now reads.
    vi.stubGlobal('innerHeight', 500);
    act(() => {
      window.dispatchEvent(new Event('resize'));
      vi.advanceTimersByTime(150);
    });
    expect(toggle).not.toHaveBeenCalled();
    expect(root.classList.contains('pin')).toBe(true);

    // A real width change across the 734 px breakpoint must still relayout.
    vi.stubGlobal('innerWidth', 700);
    act(() => {
      window.dispatchEvent(new Event('resize'));
      vi.advanceTimersByTime(150);
    });
    expect(toggle).toHaveBeenCalled();
  });

  it('without scroll timelines, pins and paints each frame from JS', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const { container } = render(<SignatureScene copy={COPY} />);
    const root = sectionOf(container);
    expect(root.classList.contains('pin')).toBe(true);
    expect(root.querySelector<HTMLElement>('.sig-app')!.style.transform).toMatch(/^translate\(/);
    expect(root.querySelector<HTMLElement>('.sig-cap-b')!.style.transform).toBe('translateY(100vh)');
    const io = sceneObserver(root);
    expect(io).toBeDefined();
    intersect(io!, root);
    expect(add).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });
  });

  it('repaints on scroll: at the end of the track caption B is up', () => {
    const { container } = render(<SignatureScene copy={COPY} />);
    const root = sectionOf(container);
    intersect(sceneObserver(root)!, root);
    vi.stubGlobal('scrollY', 500);
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    expect(root.querySelector<HTMLElement>('.sig-cap-b')!.style.transform).toBe('translateY(0.0px)');
  });

  it('with scroll timelines, hands the geometry to CSS and attaches no scroll listener', () => {
    vi.stubGlobal('CSS', { supports: (q: string) => q.includes('animation-timeline') });
    const add = vi.spyOn(window, 'addEventListener');
    const { container } = render(<SignatureScene copy={COPY} />);
    const root = sectionOf(container);
    expect(root.classList.contains('pin')).toBe(true);
    const app = root.querySelector<HTMLElement>('.sig-app')!;
    expect(app.style.getPropertyValue('--s')).toMatch(/^translate\(/);
    expect(app.style.getPropertyValue('--p')).toMatch(/^translate\(/);
    expect(app.style.transform).toBe('');
    expect(sceneObserver(root)).toBeUndefined();
    expect(add.mock.calls.filter(([type]) => type === 'scroll')).toHaveLength(0);
  });

  it('watches both the pinned card and body (fix round 1, item 3)', () => {
    const ros = stubResizeObserver();
    const { container } = render(<SignatureScene copy={COPY} />);
    const root = sectionOf(container);
    expect(root.classList.contains('pin')).toBe(true);
    const card = root.querySelector('.sig-card') as HTMLElement;
    expect(ros[0].targets).toContain(card);
    expect(ros[0].targets).toContain(document.body);
  });

  it('a body-only resize re-measures without relayouting (fix round 1, item 3)', () => {
    // A fresh mount per resize-observer test, not two `resize()` calls in one: the rAF stub
    // above calls back synchronously, so `roRaf = requestAnimationFrame(flush)`'s assignment
    // completes *after* flush already reset `roRaf` to 0 inside itself, clobbering it back to a
    // truthy id -- the same one-dispatch-per-test constraint already noted for `onScroll`/`raf`.
    const ros = stubResizeObserver();
    const { container } = render(<SignatureScene copy={COPY} />);
    const root = sectionOf(container);
    const toggle = vi.spyOn(root.classList, 'toggle');
    resize(ros[0], document.body); // content above reflowing: re-measure the scroll track only
    expect(toggle).not.toHaveBeenCalled();
  });

  it('the card itself resizing relayouts, since its size feeds sigGeometry (fix round 1, item 3)', () => {
    const ros = stubResizeObserver();
    const { container } = render(<SignatureScene copy={COPY} />);
    const root = sectionOf(container);
    const card = root.querySelector('.sig-card') as HTMLElement;
    const toggle = vi.spyOn(root.classList, 'toggle');
    resize(ros[0], card); // e.g. a Thai font swap re-wrapping the card question
    expect(toggle).toHaveBeenCalled();
  });

  it('removes its listeners, observer, class and inline styles on unmount', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const { container, unmount } = render(<SignatureScene copy={COPY} />);
    const root = sectionOf(container);
    const io = sceneObserver(root)!;
    intersect(io, root);
    // Painted while mounted (pinned by default): proves the post-unmount check below isn't vacuous.
    expect(root.querySelector<HTMLElement>('.sig-card')!.getAttribute('style')).not.toBeNull();
    unmount();
    expect(io.disconnected).toBe(true);
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(root.classList.contains('pin')).toBe(false);
    for (const el of root.querySelectorAll('[data-sig-part]')) expect(el.getAttribute('style')).toBeNull();
  });
});
