// @vitest-environment jsdom
import { StrictMode } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HeroMonument, { DRAW_END, STAGE_FADE, LAYER_FADE } from '@/components/motion/HeroMonument';

// ---------------------------------------------------------------------------
// Helpers copied from the now-deleted tests/particle-field.test.tsx -- same
// idioms (stub matchMedia, stub rAF so scroll-driven updates are
// deterministic, mount a fake #hero with a controllable offsetHeight/
// offsetTop, drive window.scrollY by hand).
// ---------------------------------------------------------------------------

function mountHero(offsetHeight: number): HTMLElement {
  const hero = document.createElement('div');
  hero.id = 'hero';
  Object.defineProperty(hero, 'offsetHeight', { value: offsetHeight, configurable: true });
  Object.defineProperty(hero, 'offsetTop', { value: 0, configurable: true });
  const stage = document.createElement('div');
  stage.setAttribute('data-hero-stage', '');
  hero.appendChild(stage);
  document.body.appendChild(hero);
  return hero;
}

function setScrollY(value: number) {
  Object.defineProperty(window, 'scrollY', { value, configurable: true, writable: true });
}

function stubMatchMedia({ reducedMotion = false } = {}) {
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
    flushAll() {
      let remaining = queue.length;
      while (remaining-- > 0) {
        const next = queue.shift();
        if (next) next.cb(performance.now());
      }
    },
    get pending() {
      return queue.length;
    },
  };
}

describe('HeroMonument', () => {
  let hero: HTMLElement;
  let rafCtl: ReturnType<typeof stubRaf>;

  beforeEach(() => {
    rafCtl = stubRaf();
    setScrollY(0);
    Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true });
    hero = mountHero(2000);
  });

  afterEach(() => {
    cleanup();
    hero.remove();
    vi.unstubAllGlobals();
  });

  // --- 1. rendering ----------------------------------------------------

  it('renders an SVG <text> with the word, Latin font stack/size', () => {
    stubMatchMedia();
    const { container } = render(<HeroMonument word="SUWICHAK" heroSelector="#hero" />);
    const text = container.querySelector('text');
    expect(text?.textContent).toBe('SUWICHAK');
    expect(text?.getAttribute('font-family')).toBe('var(--font-display)');
    expect(text?.getAttribute('font-size')).toBe('150');
  });

  it('renders the Thai font stack/size for a Thai word', () => {
    stubMatchMedia();
    const { container } = render(<HeroMonument word="สุวิจักขณ์" heroSelector="#hero" />);
    const text = container.querySelector('text');
    expect(text?.textContent).toBe('สุวิจักขณ์');
    expect(text?.getAttribute('font-family')).toBe('var(--font-thai)');
    expect(text?.getAttribute('font-size')).toBe('110');
  });

  // --- 2. choreography invariants ---------------------------------------

  it('locks the choreography timeline ordering', () => {
    expect(DRAW_END).toBe(STAGE_FADE[1]);
    expect(STAGE_FADE[0]).toBeLessThan(STAGE_FADE[1]);
    expect(LAYER_FADE[0]).toBeLessThan(LAYER_FADE[1]);
    expect(LAYER_FADE[0]).toBeGreaterThan(DRAW_END); // name fully drawn before the layer starts leaving
  });

  // --- 3. scroll-driven stroke draw --------------------------------------

  it('is undrawn (dashoffset 900) at rest, p=0', () => {
    stubMatchMedia();
    const { container } = render(<HeroMonument word="TEST" heroSelector="#hero" />);
    const text = container.querySelector('text') as SVGTextElement;
    expect(text.style.strokeDashoffset).toBe('900');
  });

  it('is fully drawn (dashoffset 0) once scrolled past DRAW_END', () => {
    stubMatchMedia();
    const { container } = render(<HeroMonument word="TEST" heroSelector="#hero" />);
    const text = container.querySelector('text') as SVGTextElement;

    // travel = hero.offsetHeight(2000) - innerHeight(1000) = 1000.
    // Scroll to p = 0.5, safely past DRAW_END (0.45).
    setScrollY(500);
    window.dispatchEvent(new Event('scroll'));
    rafCtl.flushAll();

    expect(text.style.strokeDashoffset).toBe('0');
  });

  // --- 4. stage fade ------------------------------------------------------

  it('fades and hides [data-hero-stage] past STAGE_FADE[1], non-reduced-motion', () => {
    stubMatchMedia();
    render(<HeroMonument word="TEST" heroSelector="#hero" />);
    const stage = hero.querySelector('[data-hero-stage]') as HTMLElement;

    // p = 0.5 > STAGE_FADE[1] (0.45).
    setScrollY(500);
    window.dispatchEvent(new Event('scroll'));
    rafCtl.flushAll();

    expect(stage.style.opacity).toBe('0');
    expect(stage.style.visibility).toBe('hidden');
  });

  // --- 5. reduced motion ---------------------------------------------------

  it('renders statically drawn under reduced motion, attaches no scroll listener, leaves the stage untouched', () => {
    stubMatchMedia({ reducedMotion: true });
    const addSpy = vi.spyOn(window, 'addEventListener');
    const { container } = render(<HeroMonument word="TEST" heroSelector="#hero" />);
    const text = container.querySelector('text') as SVGTextElement;
    const layer = container.firstElementChild as HTMLElement;
    const stage = hero.querySelector('[data-hero-stage]') as HTMLElement;

    expect(text.style.strokeDashoffset).toBe('0');
    expect(layer.style.opacity).toBe('0.4');
    expect(addSpy.mock.calls.some((c) => c[0] === 'scroll')).toBe(false);
    expect(stage.style.opacity).toBe('');
    expect(stage.style.visibility).toBe('');
  });

  // --- 6. strict-mode double-mount -----------------------------------------

  it('leaves exactly one set of listeners after a React strict-mode double-mount', () => {
    stubMatchMedia();
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    render(
      <StrictMode>
        <HeroMonument word="TEST" heroSelector="#hero" />
      </StrictMode>,
    );

    const scrollAdds = addSpy.mock.calls.filter((c) => c[0] === 'scroll').length;
    const scrollRemoves = removeSpy.mock.calls.filter((c) => c[0] === 'scroll').length;
    expect(scrollAdds).toBe(2); // both mounts attached
    expect(scrollRemoves).toBe(1); // the first mount's cleanup ran
  });
});
