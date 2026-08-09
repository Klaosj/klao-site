// @vitest-environment jsdom
import { StrictMode } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PointerFx from '@/components/motion/PointerFx';

// ---------------------------------------------------------------------------
// jsdom computes no layout and applies no real stylesheet cascade, so three
// promises this component makes are structurally unreachable here and are
// instead verified in a real browser (see motion-report.md):
//   - the cursor visually growing to 46px / trailing at the right pixel
//     offset on screen (jsdom's getBoundingClientRect() is stubbed below,
//     not real)
//   - --lagX/--lagY on #hero .pill actually being consumed by `transform`
//     (that's a CSS cascade fact, not a JS fact -- the specificity trap
//     this task was warned about can only be seen in computed style)
//   - the cursor being hidden on coarse pointers via
//     `@media (hover:none),(pointer:coarse)` (media-query matching against
//     rendered elements isn't part of jsdom's CSS support)
// Everything below is the JS half of each behaviour: the math, the class
// toggles, the listeners, and the loop lifecycle.
// ---------------------------------------------------------------------------

function stubMatchMedia(reducedMotion = false) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('reduce') ? reducedMotion : false,
    addEventListener() {},
    removeEventListener() {},
  }));
}

function stubRaf() {
  let queue: Array<{ id: number; cb: FrameRequestCallback }> = [];
  let nextId = 1;
  const raf = vi.fn((cb: FrameRequestCallback) => {
    const id = nextId++;
    queue.push({ id, cb });
    return id;
  });
  const caf = vi.fn((id: number) => {
    queue = queue.filter((q) => q.id !== id);
  });
  vi.stubGlobal('requestAnimationFrame', raf);
  vi.stubGlobal('cancelAnimationFrame', caf);
  return {
    raf,
    caf,
    flushOne() {
      const next = queue.shift();
      if (next) next.cb(performance.now());
    },
    get pending() {
      return queue.length;
    },
  };
}

/** #hero with three annotation pills, matching Hero.tsx's real markup
 *  closely enough for `#hero .pill` to match all three in DOM order. */
function mountHeroPills(): HTMLElement {
  const hero = document.createElement('div');
  hero.id = 'hero';
  for (const n of [1, 2, 3]) {
    const pill = document.createElement('span');
    pill.className = `pill pill-${n}`;
    hero.appendChild(pill);
  }
  document.body.appendChild(hero);
  return hero;
}

/** A single .btn anchor with a fixed, stubbed bounding rect -- jsdom always
 *  returns an all-zero rect otherwise, which would make every offset
 *  collapse to (0 - 0 - 0) regardless of whether the 0.22/0.32 factors are
 *  even applied. */
function mountBtn(rect: { left: number; top: number; width: number; height: number }): HTMLElement {
  const btn = document.createElement('a');
  btn.className = 'btn';
  btn.getBoundingClientRect = () => ({ ...rect, right: 0, bottom: 0, x: 0, y: 0, toJSON() {} }) as DOMRect;
  document.body.appendChild(btn);
  return btn;
}

function pointerMoveOn(target: EventTarget, clientX: number, clientY: number) {
  target.dispatchEvent(new PointerEvent('pointermove', { clientX, clientY, bubbles: true }));
}

describe('PointerFx', () => {
  let rafCtl: ReturnType<typeof stubRaf>;
  let fixtures: HTMLElement[] = [];

  beforeEach(() => {
    rafCtl = stubRaf();
    fixtures = [];
  });

  afterEach(() => {
    cleanup();
    for (const f of fixtures) f.remove();
    vi.unstubAllGlobals();
  });

  it('renders a decorative cursor element ignored by assistive tech', () => {
    stubMatchMedia();
    const { container } = render(<PointerFx />);
    const cursor = container.querySelector('#cursor');
    expect(cursor).toBeTruthy();
    expect(cursor?.getAttribute('aria-hidden')).toBe('true');
  });

  it('schedules exactly one frame at mount, and cancels it with no listeners left on unmount', () => {
    stubMatchMedia();
    const addWin = vi.spyOn(window, 'addEventListener');
    const removeWin = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<PointerFx />);

    expect(rafCtl.pending).toBe(1);
    const addedTypes = addWin.mock.calls.map((c) => c[0]);
    expect(addedTypes).toEqual(expect.arrayContaining(['pointermove', 'pointerleave']));
    expect(rafCtl.caf).not.toHaveBeenCalled();

    unmount();

    expect(rafCtl.caf).toHaveBeenCalledOnce();
    const removedTypes = removeWin.mock.calls.map((c) => c[0]);
    expect(removedTypes).toEqual(expect.arrayContaining(['pointermove', 'pointerleave']));
  });

  it('leaves exactly one active loop after a React Strict-Mode double-mount', () => {
    stubMatchMedia();
    const addWin = vi.spyOn(window, 'addEventListener');
    const removeWin = vi.spyOn(window, 'removeEventListener');

    render(
      <StrictMode>
        <PointerFx />
      </StrictMode>,
    );

    const moveAdds = addWin.mock.calls.filter((c) => c[0] === 'pointermove').length;
    const moveRemoves = removeWin.mock.calls.filter((c) => c[0] === 'pointermove').length;
    expect(moveAdds).toBe(2); // both mounts attached
    expect(moveRemoves).toBe(1); // the first mount's cleanup ran
    expect(rafCtl.caf).toHaveBeenCalledTimes(1); // the first mount's frame was cancelled
    expect(rafCtl.pending).toBe(1); // only the second mount's frame is still queued
  });

  it('never requests a frame or attaches a listener under reduced motion', () => {
    stubMatchMedia(true);
    const addWin = vi.spyOn(window, 'addEventListener');
    render(<PointerFx />);
    expect(rafCtl.raf).not.toHaveBeenCalled();
    const addedTypes = addWin.mock.calls.map((c) => c[0]);
    expect(addedTypes).not.toContain('pointermove');
  });

  it('eases the cursor toward the pointer by exactly the cursor smoothing factor per frame, not a 1:1 snap', () => {
    stubMatchMedia();
    const { container } = render(<PointerFx />);
    const cursor = container.querySelector('#cursor') as HTMLElement;

    pointerMoveOn(window, 500, 300);
    rafCtl.flushOne();
    // Starts at (-100, -100) off-screen; one frame moves it 22% of the way
    // to (500, 300): -100 + (500 - -100) * 0.22 = 32.0, -100 + (300 - -100) * 0.22 = -12.0.
    expect(cursor.style.translate).toBe('32.0px -12.0px');

    rafCtl.flushOne();
    // A second frame closes 22% of the REMAINING gap -- proves this is
    // continuous easing, not a formula applied once from the origin.
    // x: 32.0 + (500 - 32.0) * 0.22 = 134.96 -> "135.0"
    // y: -12.0 + (300 - -12.0) * 0.22 = 56.64 -> "56.6"
    expect(cursor.style.translate).toBe('135.0px 56.6px');
  });

  it('adds "on" when the pointer moves and removes it when the pointer leaves the window', () => {
    stubMatchMedia();
    const { container } = render(<PointerFx />);
    const cursor = container.querySelector('#cursor') as HTMLElement;

    expect(cursor.classList.contains('on')).toBe(false);
    pointerMoveOn(window, 10, 10);
    expect(cursor.classList.contains('on')).toBe(true);

    window.dispatchEvent(new PointerEvent('pointerleave'));
    expect(cursor.classList.contains('on')).toBe(false);
  });

  it('swells over a link but not over plain text', () => {
    stubMatchMedia();
    const link = document.createElement('a');
    link.href = '#';
    link.textContent = 'link';
    const plain = document.createElement('p');
    plain.textContent = 'plain';
    document.body.append(link, plain);
    fixtures.push(link, plain);

    const { container } = render(<PointerFx />);
    const cursor = container.querySelector('#cursor') as HTMLElement;

    link.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
    expect(cursor.classList.contains('big')).toBe(true);

    plain.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
    expect(cursor.classList.contains('big')).toBe(false);
  });

  it('swells over a work-card frame, not just <a>/<button>', () => {
    stubMatchMedia();
    const frame = document.createElement('div');
    frame.className = 'frame';
    document.body.appendChild(frame);
    fixtures.push(frame);

    const { container } = render(<PointerFx />);
    const cursor = container.querySelector('#cursor') as HTMLElement;

    frame.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
    expect(cursor.classList.contains('big')).toBe(true);
  });

  it('pulls a .btn toward the pointer at 0.22x horizontal / 0.32x vertical, and resets on pointerleave', () => {
    stubMatchMedia();
    const btn = mountBtn({ left: 100, top: 200, width: 40, height: 20 });
    fixtures.push(btn);
    render(<PointerFx />);

    // Center is (120, 210). Pointer at (150, 230) is +30/+20 off-center.
    pointerMoveOn(btn, 150, 230);
    expect(btn.style.getPropertyValue('--magX')).toBe(`${(30 * 0.22).toFixed(1)}px`);
    expect(btn.style.getPropertyValue('--magY')).toBe(`${(20 * 0.32).toFixed(1)}px`);

    btn.dispatchEvent(new PointerEvent('pointerleave'));
    expect(btn.style.getPropertyValue('--magX')).toBe('0px');
    expect(btn.style.getPropertyValue('--magY')).toBe('0px');
  });

  it('trails each hero pill by its own weight (11/18/25px), heaviest last', () => {
    stubMatchMedia();
    Object.defineProperty(window, 'innerWidth', { value: 1000, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true });
    const hero = mountHeroPills();
    fixtures.push(hero);
    render(<PointerFx />);
    const [p1, p2, p3] = Array.from(hero.querySelectorAll<HTMLElement>('.pill'));

    pointerMoveOn(window, 1000, 1000); // normalized target: (1, 1) exactly, given the viewport above
    // Several frames, not one: at frame 1 the three lag values are all
    // small enough that toFixed(1) rounding can blur an 11:18:25 ratio.
    // Independently replaying the same recurrence the component uses (see
    // tick() in PointerFx.tsx: `lag += (target - lag) * PILL_EASE`) removes
    // any hand-arithmetic mistake from the expectation instead of asking
    // the reader to trust a one-off computed constant.
    let lag = 0;
    for (let i = 0; i < 6; i++) {
      lag += (1 - lag) * 0.06;
      rafCtl.flushOne();
    }

    expect(p1.style.getPropertyValue('--lagX')).toBe(`${(lag * 11).toFixed(1)}px`);
    expect(p2.style.getPropertyValue('--lagX')).toBe(`${(lag * 18).toFixed(1)}px`);
    expect(p3.style.getPropertyValue('--lagX')).toBe(`${(lag * 25).toFixed(1)}px`);
    expect(p1.style.getPropertyValue('--lagY')).toBe(`${(lag * 11 * 0.6).toFixed(1)}px`);

    const lag1 = parseFloat(p1.style.getPropertyValue('--lagX'));
    const lag2 = parseFloat(p2.style.getPropertyValue('--lagX'));
    const lag3 = parseFloat(p3.style.getPropertyValue('--lagX'));
    expect(lag3).toBeGreaterThan(lag2);
    expect(lag2).toBeGreaterThan(lag1);
  });

  it('never touches --lagX/--lagY or --magX/--magY under reduced motion', () => {
    stubMatchMedia(true);
    const hero = mountHeroPills();
    const btn = mountBtn({ left: 0, top: 0, width: 10, height: 10 });
    fixtures.push(hero, btn);
    render(<PointerFx />);
    const pill = hero.querySelector('.pill') as HTMLElement;

    pointerMoveOn(window, 500, 500);
    pointerMoveOn(btn, 5, 5);
    rafCtl.flushOne(); // no-op: nothing was ever queued, but guards against a future regression

    expect(pill.style.getPropertyValue('--lagX')).toBe('');
    expect(btn.style.getPropertyValue('--magX')).toBe('');
  });
});
