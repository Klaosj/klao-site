// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SignatureScene, { type SignatureCopy } from '@/components/SignatureScene';
import { FakeIO, installFakeIO } from './helpers/io';
import { stubMatchMedia } from './helpers/media';

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

let reduce = false;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers(); // safety net for the fake-timer resize test below, even if it throws first
});

beforeEach(() => {
  reduce = false;
  // "(prefers-reduced-motion: reduce)" follows `reduce`; "(… no-preference)" is its inverse.
  stubMatchMedia((q) => (q.includes(': reduce') ? reduce : q.includes('no-preference') ? !reduce : false));
  installFakeIO();
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
// undefined (not FakeIO.watching's throw) so the CSS-path test can assert there is none.
const sceneObserver = (root: Element) => FakeIO.instances.find((o) => o.targets.includes(root));
const intersect = (o: FakeIO, root: Element) => o.fire([{ isIntersecting: true, target: root }]);

// jsdom has no ResizeObserver at all (unlike IntersectionObserver, stubbed above), so this
// scene's card/body watch (fix round 1, item 3; fix round 2, item 3) never ran in this suite
// until now. This fake mirrors the parts of the spec the round-2 bug turned on:
//  - observe(el) -- even re-observing an already-observed el -- always queues a fresh
//    notification, whether or not anything changed (WICG/resize-observer#38). That is the
//    guarantee a component re-arming on every layout() feeds back into itself, forever.
//  - disconnect() really stops delivery: it clears both the observed set and the queue.
//  - Notifications are queued, not delivered synchronously from observe()/setSize() -- the test
//    calls flush() to deliver them, "the next rAF/microtask you control".
//  - Each notification carries the target's border box (`borderBoxSize`) as well as
//    `contentRect`, and `offsetHeight` answers from the same sizes: jsdom has no layout and
//    always says 0, but the scene lays the card out from `card.offsetHeight` and compares
//    notifications against that same number (wave-1 reconciliation p), so the two must agree
//    the way they do in a browser. `initialCardHeight` is the card's height before any setSize().
const stubResizeObserver = (initialCardHeight = 0) => {
  const observeCounts = new Map<Element, number>();
  const sizes = new Map<Element, { width: number; height: number }>();
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
    return sizes.get(this)?.height ?? (this.dataset.sigPart === 'card' ? initialCardHeight : 0);
  });
  let observed = new Set<Element>();
  let queue = new Set<Element>();
  let cb: ResizeObserverCallback | null = null;
  // The shared rAF stub above returns a truthy id even though it already ran the callback
  // synchronously; that id then overwrites the `roRaf = 0` the callback just set, so a second
  // flush() in the same test finds `roRaf` still truthy and silently drops (the same
  // synchronous-rAF reentrancy the round-1 resize tests dodged by mounting fresh each time --
  // discovered here because these round-2 tests need two flushes: a settle, then a real change).
  // Returning 0 instead matches what the callback already set, so it never clobbers.
  vi.stubGlobal('requestAnimationFrame', (frameCb: FrameRequestCallback) => {
    frameCb(0);
    return 0;
  });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        cb = callback;
      }
      observe(el: Element) {
        observeCounts.set(el, (observeCounts.get(el) ?? 0) + 1);
        observed.add(el);
        queue.add(el);
      }
      unobserve(el: Element) {
        observed.delete(el);
        queue.delete(el);
      }
      disconnect() {
        observed = new Set();
        queue = new Set();
      }
    },
  );
  return {
    isObserving: (el: Element) => observed.has(el),
    // How many times observe() has ever been called for this target -- the direct check for
    // "layout() itself must never disconnect or re-observe" (fix round 2, item 1): it must stay
    // 1 for the whole pin session, no matter how many relayouts happen afterwards.
    observeCallCount: (el: Element) => observeCounts.get(el) ?? 0,
    // Simulates the element changing size. The size itself changes whether or not anything is
    // watching; a notification is queued only if the target is still observed, mirroring the
    // real API (fix round 2, item 5).
    setSize: (el: Element, height: number, width = 0) => {
      sizes.set(el, { width, height });
      if (observed.has(el)) queue.add(el);
    },
    // Delivers every currently-queued notification in one batch.
    flush: () => {
      if (!cb || queue.size === 0) return;
      const entries = Array.from(queue).map((target) => {
        const size = sizes.get(target) ?? { width: 0, height: (target as HTMLElement).offsetHeight };
        return { target, contentRect: { ...size }, borderBoxSize: [{ blockSize: size.height, inlineSize: size.width }] };
      }) as unknown as ResizeObserverEntry[];
      queue = new Set();
      act(() => cb!(entries, {} as ResizeObserver));
    },
  };
};

// Frames that run only when the test says so (the shared stubs run a frame synchronously), for
// the one ordering a synchronous frame can't show: a resize lands between a card notification
// and the frame that would act on it.
const deferFrames = () => {
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  return {
    run: () =>
      act(() => {
        while (frames.length) frames.shift()!(0);
      }),
  };
};

// A real resize of the stable height layout() reads, through the scene's 120 ms debounce (needs
// fake timers).
const resizeStableHeight = (height: number) => {
  Object.defineProperty(document.documentElement, 'clientHeight', { value: height, configurable: true });
  act(() => {
    window.dispatchEvent(new Event('resize'));
    vi.advanceTimersByTime(150);
  });
};

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
    // Re-review N3 (finding 9 leftover): the file is 1580x900, matching FRAME_RATIO and
    // signature.css's aspect-ratio -- not the generic 1600x900 the img carried before.
    const frameImg = container.querySelector('.sig-frame img');
    expect(frameImg?.getAttribute('width')).toBe('1580');
    expect(frameImg?.getAttribute('height')).toBe('900');
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

// Fix wave finding 5 (I2): every caption routes through ThaiText now, not raw text -- default
// mode (.nw) for capSub/endTitle/endSub, display mode (.kt) for cardQuestion/capTitle (a
// heading-length line, like the prototype's own disp()).
describe('SignatureScene routes captions through ThaiText keep-runs (fix wave finding 5, I2)', () => {
  it('capSub, endTitle and endSub keep a `|`-marked run whole, in default mode', () => {
    const html = renderToStaticMarkup(
      <SignatureScene copy={{ ...COPY, capSub: 'คำถามเดิม|เครื่องมือใหม่', endTitle: 'เดินเอง|ได้แล้ว', endSub: 'ใช้เวลา|สามปี' }} />,
    );
    expect(html).toContain('class="nw">คำถามเดิม</span>');
    expect(html).toContain('class="nw">เครื่องมือใหม่</span>');
    expect(html).toContain('class="nw">เดินเอง</span>');
    expect(html).toContain('class="nw">ได้แล้ว</span>');
    expect(html).toContain('class="nw">ใช้เวลา</span>');
    expect(html).toContain('class="nw">สามปี</span>');
  });

  it('cardQuestion and capTitle keep every Thai token whole, in display mode', () => {
    const html = renderToStaticMarkup(<SignatureScene copy={{ ...COPY, cardQuestion: 'ทำไมต้องรอ', capTitle: 'สี่ปีต่อมา' }} />);
    expect(html).toContain('class="kt">ทำไมต้องรอ</span>');
    expect(html).toContain('class="kt">สี่ปีต่อมา</span>');
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

  it('watches both the pinned card and body, once, on the unpinned -> pinned transition (fix round 1, item 3)', () => {
    const ro = stubResizeObserver();
    const { container } = render(<SignatureScene copy={COPY} />);
    const root = sectionOf(container);
    expect(root.classList.contains('pin')).toBe(true);
    const card = root.querySelector('.sig-card') as HTMLElement;
    expect(ro.isObserving(card)).toBe(true);
    expect(ro.isObserving(document.body)).toBe(true);
    expect(ro.observeCallCount(card)).toBe(1);
    expect(ro.observeCallCount(document.body)).toBe(1);
  });

  it('a body-only resize re-measures without relayouting (fix round 1, item 3)', () => {
    const ro = stubResizeObserver();
    const { container } = render(<SignatureScene copy={COPY} />);
    const root = sectionOf(container);
    ro.flush(); // the guaranteed first notification for card + body: nothing changed since layout()
    const toggle = vi.spyOn(root.classList, 'toggle');
    ro.setSize(document.body, 900); // content above reflowing
    ro.flush();
    expect(toggle).not.toHaveBeenCalled();
  });

  it('the card itself resizing relayouts through a real observe(card), not a synthetic entry (fix round 2, item 5)', () => {
    const ro = stubResizeObserver();
    const { container } = render(<SignatureScene copy={COPY} />);
    const root = sectionOf(container);
    const card = root.querySelector('.sig-card') as HTMLElement;
    expect(ro.isObserving(card)).toBe(true); // the notification below only works because of this
    ro.flush(); // the guaranteed first notification: nothing changed since layout() (item 2)
    const toggle = vi.spyOn(root.classList, 'toggle');
    ro.setSize(card, 200); // e.g. a Thai font swap re-wrapping the card question
    ro.flush();
    expect(toggle).toHaveBeenCalled();
  });

  it('never re-arms the watch from inside layout(), even after a real relayout (fix round 2, Critical, item 1)', () => {
    const ro = stubResizeObserver();
    const { container } = render(<SignatureScene copy={COPY} />);
    const root = sectionOf(container);
    const card = root.querySelector('.sig-card') as HTMLElement;
    expect(ro.observeCallCount(card)).toBe(1);
    expect(ro.observeCallCount(document.body)).toBe(1);

    ro.flush(); // the guaranteed first notification: nothing to do
    ro.setSize(card, 200);
    ro.flush(); // a genuine card resize: relayouts once (proven by the previous test)

    // A relayout must never itself re-arm the observer -- re-observing an already-observed
    // target always schedules a fresh notification regardless of whether anything changed
    // (WICG/resize-observer#38), and that notification would rAF-schedule another layout(),
    // forever. This is the exact shape of fix round 1's Critical bug.
    expect(ro.observeCallCount(card)).toBe(1);
    expect(ro.observeCallCount(document.body)).toBe(1);
  });

  it('settles instead of looping: flushing repeatedly with nothing new queued causes no further relayouts (fix round 2, Critical, no-loop)', () => {
    const ro = stubResizeObserver();
    const { container } = render(<SignatureScene copy={COPY} />);
    const root = sectionOf(container);
    ro.flush(); // the initial settle
    ro.setSize(root.querySelector('.sig-card') as HTMLElement, 200);
    ro.flush(); // one genuine relayout
    const toggle = vi.spyOn(root.classList, 'toggle');
    // 5 more frames, nothing new set: an endless loop would keep re-queuing and relayouting here.
    for (let frame = 0; frame < 5; frame++) ro.flush();
    expect(toggle).not.toHaveBeenCalled();
  });

  // Wave-1 reconciliation (p), from the round-2 re-review. The baseline a card notification is
  // compared against is the card.offsetHeight layout() itself used (border box, like
  // borderBoxSize), not whatever the first notification happened to report.
  it('A: the first notification after arming only confirms the laid-out height, so nothing relayouts', () => {
    const ro = stubResizeObserver(180);
    const { container } = render(<SignatureScene copy={COPY} />);
    const root = sectionOf(container);
    const toggle = vi.spyOn(root.classList, 'toggle'); // attached BEFORE the initial flush
    ro.flush();
    expect(toggle).not.toHaveBeenCalled();
  });

  it('B: a real card height change relayouts exactly once, even when it lands in the first notification', () => {
    const ro = stubResizeObserver(180);
    const { container } = render(<SignatureScene copy={COPY} />);
    const root = sectionOf(container);
    const card = root.querySelector('.sig-card') as HTMLElement;
    const toggle = vi.spyOn(root.classList, 'toggle');
    // The seed race: the card re-wraps (a web font arriving) after layout() measured it but
    // before the observer's first notification. That notification must count as a change.
    ro.setSize(card, 240);
    ro.flush();
    expect(toggle).toHaveBeenCalledTimes(1);
  });

  it('C: the same card height again does not relayout', () => {
    const ro = stubResizeObserver(180);
    const { container } = render(<SignatureScene copy={COPY} />);
    const root = sectionOf(container);
    const card = root.querySelector('.sig-card') as HTMLElement;
    ro.flush();
    ro.setSize(card, 240);
    ro.flush(); // one real change: one relayout, which lays out at 240
    const toggle = vi.spyOn(root.classList, 'toggle');
    ro.setSize(card, 240);
    ro.flush();
    expect(toggle).not.toHaveBeenCalled();
  });

  it('D: unpinned it watches nothing; each pin arms once; a change left pending from the last pin does not relayout the next', () => {
    vi.useFakeTimers();
    const ro = stubResizeObserver(180);
    const frames = deferFrames();
    const { container } = render(<SignatureScene copy={COPY} />);
    const root = sectionOf(container);
    const card = root.querySelector('.sig-card') as HTMLElement;
    ro.flush();
    frames.run(); // settle
    ro.setSize(card, 250);
    ro.flush(); // the card's change is in; its relayout waits for the next frame ...
    resizeStableHeight(560); // ... but a resize to a short screen unpins first
    expect(root.classList.contains('pin')).toBe(false);
    expect(ro.isObserving(card)).toBe(false);
    expect(ro.isObserving(document.body)).toBe(false);
    frames.run(); // that frame finds no geometry and does nothing
    resizeStableHeight(700); // pinned again, laid out at the card's current 250
    expect(root.classList.contains('pin')).toBe(true);
    expect(ro.observeCallCount(card)).toBe(2);
    expect(ro.observeCallCount(document.body)).toBe(2);
    const toggle = vi.spyOn(root.classList, 'toggle');
    ro.flush(); // the new pin's first notification: 250, the height it was just laid out at
    frames.run();
    expect(toggle).not.toHaveBeenCalled();
  });

  it('E: lets go of both the card and the body on unmount', () => {
    const ro = stubResizeObserver(180);
    const { container, unmount } = render(<SignatureScene copy={COPY} />);
    const card = sectionOf(container).querySelector('.sig-card') as HTMLElement;
    expect(ro.isObserving(card)).toBe(true);
    expect(ro.isObserving(document.body)).toBe(true);
    unmount();
    expect(ro.isObserving(card)).toBe(false);
    expect(ro.isObserving(document.body)).toBe(false);
  });

  it('removes its listeners, observer, class and inline styles on unmount', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const { container, unmount } = render(<SignatureScene copy={COPY} />);
    const root = sectionOf(container);
    const io = sceneObserver(root)!;
    intersect(io, root);
    const disconnect = vi.spyOn(io, 'disconnect');
    // Painted while mounted (pinned by default): proves the post-unmount check below isn't vacuous.
    expect(root.querySelector<HTMLElement>('.sig-card')!.getAttribute('style')).not.toBeNull();
    unmount();
    expect(disconnect).toHaveBeenCalled();
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(root.classList.contains('pin')).toBe(false);
    for (const el of root.querySelectorAll('[data-sig-part]')) expect(el.getAttribute('style')).toBeNull();
  });
});
