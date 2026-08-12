// @vitest-environment jsdom
import { StrictMode } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ParticleField, { MORPH_END, STAGE_FADE, CANVAS_FADE } from '@/components/motion/ParticleField';
import { PARTICLE_COLORS } from '@/lib/theme';

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

  it('makes no attempt to use WebGL2 when the context is unavailable', () => {
    // "not.toThrow()" above would also pass if the `if (!gl) return` guard
    // were missing entirely, because the try/catch around shader linking
    // happens to swallow the resulting null-pointer TypeError too. This
    // test tells those two cases apart: a real guard exits before ever
    // touching `gl`, so nothing is ever attempted and nothing is logged.
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    render(<ParticleField word="X" heroSelector="#hero" />);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    getContextSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('is pinned full-viewport and never intercepts pointer events', () => {
    // Plain inline style, no GPU involved -- no excuse for this being
    // unasserted. A fixed decorative canvas that isn't `pointer-events:
    // none` would silently eat clicks meant for the page underneath it.
    const { container } = render(<ParticleField word="X" heroSelector="#hero" />);
    const c = container.querySelector('canvas') as HTMLCanvasElement;
    expect(c.style.position).toBe('fixed');
    expect(c.style.inset).toBe('0px');
    expect(c.style.width).toBe('100%');
    expect(c.style.height).toBe('100%');
    expect(c.style.pointerEvents).toBe('none');
  });

  it('locks the choreography timeline ordering', () => {
    expect(MORPH_END).toBeLessThanOrEqual(STAGE_FADE[1]); // name resolved by the time the stage is fully gone
    expect(STAGE_FADE[0]).toBeGreaterThan(0);             // copy fully visible at rest
    expect(CANVAS_FADE[0]).toBeGreaterThan(MORPH_END);    // name holds alone before fading
  });
});

// ---------------------------------------------------------------------------
// The tests above are the ones the brief hands us verbatim. jsdom has no
// WebGL2, so they only exercise the `if (!gl) return` guard -- none of them
// can reach the loop-control logic that is this task's actual point.
//
// The loop-control logic itself doesn't touch pixels: it's plain JS driven
// by `running`/`fade`/scroll position. So it CAN be exercised under jsdom by
// replacing `HTMLCanvasElement.prototype.getContext` with a fake WebGL2
// object that accepts every call the component makes and records nothing
// more than what each test needs. This cannot verify a single rendered
// pixel (that needs a real GPU -- see the report), but it can verify the
// thing the brief calls out as the design's main point: the loop stopping,
// restarting, and never leaking across unmounts or double-mounts.
// ---------------------------------------------------------------------------

type ResourceCounts = {
  buffersCreated: number; buffersDeleted: number;
  vaosCreated: number; vaosDeleted: number;
  programsCreated: number; programsDeleted: number;
  shadersCreated: number; shadersDeleted: number;
};

type FakeGL = {
  gl: WebGL2RenderingContext;
  bufferDataCalls: ArrayBufferView[];
  drawCalls: number;
  uniform3fvCalls: unknown[][];
  resources: ResourceCounts;
};

function makeGL(): FakeGL {
  const bufferDataCalls: ArrayBufferView[] = [];
  const uniform3fvCalls: unknown[][] = [];
  const state = { drawCalls: 0 };
  const resources: ResourceCounts = {
    buffersCreated: 0, buffersDeleted: 0,
    vaosCreated: 0, vaosDeleted: 0,
    programsCreated: 0, programsDeleted: 0,
    shadersCreated: 0, shadersDeleted: 0,
  };
  const stub: Record<string, unknown> = {
    VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4, ACTIVE_UNIFORMS: 5,
    ARRAY_BUFFER: 6, ELEMENT_ARRAY_BUFFER: 7, STATIC_DRAW: 8, FLOAT: 9,
    DEPTH_TEST: 10, BLEND: 11, SRC_ALPHA: 12, ONE: 13, COLOR_BUFFER_BIT: 14,
    LINES: 15, POINTS: 16, UNSIGNED_INT: 17,
    createShader: () => { resources.shadersCreated++; return {}; },
    shaderSource: () => {},
    compileShader: () => {},
    getShaderParameter: () => true,
    getShaderInfoLog: () => '',
    deleteShader: () => { resources.shadersDeleted++; },
    createProgram: () => { resources.programsCreated++; return {}; },
    attachShader: () => {},
    linkProgram: () => {},
    deleteProgram: () => { resources.programsDeleted++; },
    getProgramParameter: (_p: unknown, pname: number) => (pname === stub.ACTIVE_UNIFORMS ? 0 : true),
    getProgramInfoLog: () => '',
    getActiveUniform: () => ({ name: 'u' }),
    getUniformLocation: () => ({}),
    createVertexArray: () => { resources.vaosCreated++; return {}; },
    deleteVertexArray: () => { resources.vaosDeleted++; },
    bindVertexArray: () => {},
    createBuffer: () => { resources.buffersCreated++; return {}; },
    deleteBuffer: () => { resources.buffersDeleted++; },
    bindBuffer: () => {},
    bufferData: (_target: number, data: ArrayBufferView) => { bufferDataCalls.push(data); },
    enableVertexAttribArray: () => {},
    vertexAttribPointer: () => {},
    viewport: () => {},
    disable: () => {},
    enable: () => {},
    blendFunc: () => {},
    clear: () => {},
    useProgram: () => {},
    uniformMatrix4fv: () => {},
    uniform1f: () => {},
    uniform3fv: (...args: unknown[]) => { uniform3fvCalls.push(args); },
    drawElements: () => { state.drawCalls++; },
    drawArrays: () => { state.drawCalls++; },
  };
  return {
    gl: stub as unknown as WebGL2RenderingContext,
    bufferDataCalls,
    uniform3fvCalls,
    resources,
    get drawCalls() { return state.drawCalls; },
  };
}

type FakeCtx2D = {
  ctx: CanvasRenderingContext2D;
  fontHistory: string[];
  fillTextCalls: { text: string; x: number }[];
};

function makeCtx2D(): FakeCtx2D {
  const fontHistory: string[] = [];
  const fillTextCalls: { text: string; x: number }[] = [];
  let font = '';
  const stub = {
    fillStyle: '',
    textBaseline: '',
    textAlign: '',
    fillRect: () => {},
    // Fixed width regardless of font/char: makes the resulting letter gap
    // (the thing under test) exactly recoverable from fillText's x's.
    measureText: () => ({ width: 20 }),
    fillText: (text: string, x: number) => { fillTextCalls.push({ text, x }); },
    getImageData: () => ({ data: new Uint8ClampedArray(640 * 200 * 4) }),
    get font() { return font; },
    set font(v: string) { font = v; fontHistory.push(v); },
  };
  return { ctx: stub as unknown as CanvasRenderingContext2D, fontHistory, fillTextCalls };
}

function mountHero(offsetHeight: number): HTMLElement {
  const hero = document.createElement('div');
  hero.id = 'hero';
  Object.defineProperty(hero, 'offsetHeight', { value: offsetHeight, configurable: true });
  document.body.appendChild(hero);
  return hero;
}

function setScrollY(value: number) {
  Object.defineProperty(window, 'scrollY', { value, configurable: true, writable: true });
}

function stubMatchMedia({ reducedMotion = false, coarsePointer = false } = {}) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('reduce') ? reducedMotion : query.includes('coarse') ? coarsePointer : false,
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
    // Runs exactly the callbacks queued at the moment this is called -- not
    // any new ones a callback schedules while it runs. Lets a test
    // deterministically drain "every frame this scroll/resize burst
    // queued" without depending on FIFO interleaving with unrelated
    // pending work (e.g. the main render loop's own self-rescheduling
    // frame sitting ahead of a just-queued throttled scroll callback).
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

function stubGetContext(gl: FakeGL, ctx2d: FakeCtx2D) {
  return vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockImplementation(((id: string) => {
      if (id === 'webgl2') return gl.gl;
      if (id === '2d') return ctx2d.ctx;
      return null;
    }) as typeof HTMLCanvasElement.prototype.getContext);
}

describe('ParticleField (loop lifecycle, WebGL2 mocked)', () => {
  let getContextSpy: ReturnType<typeof stubGetContext>;
  let gl: FakeGL;
  let ctx2d: FakeCtx2D;
  let hero: HTMLElement;
  let rafCtl: ReturnType<typeof stubRaf>;

  beforeEach(() => {
    gl = makeGL();
    ctx2d = makeCtx2D();
    getContextSpy = stubGetContext(gl, ctx2d);
    rafCtl = stubRaf();
    setScrollY(0);
    hero = mountHero(1000);
  });

  afterEach(() => {
    cleanup();
    hero.remove();
    getContextSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('stops scheduling frames once scrolled past the hero, and restarts on scrolling back into it', () => {
    stubMatchMedia();
    const { container } = render(<ParticleField word="TEST" heroSelector="#hero" />);
    expect(rafCtl.pending).toBe(1); // the unconditional first frame at mount

    setScrollY(1000); // p = 1 -> fade = 0
    window.dispatchEvent(new Event('scroll'));
    // 'scroll' events are now rAF-throttled (coalesced to at most one
    // updateScroll() per frame -- see ParticleField's onScroll), so the
    // style change is no longer synchronous with the dispatch. flushAll()
    // drains everything currently queued: the mount's still-pending main
    // frame (which just redraws, since `running` is still true at that
    // point) and the throttled updateScroll() the dispatch above queued.
    rafCtl.flushAll();
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    expect(canvas.style.opacity).toBe('0');
    // The main frame's own reschedule (queued before updateScroll() flipped
    // running to false) is still pending -- one more flush proves it now
    // sees running=false and stops.
    expect(rafCtl.pending).toBe(1);

    rafCtl.flushOne(); // run that last frame; running=false, so it does not reschedule
    expect(rafCtl.pending).toBe(0); // frame() saw running=false and did not reschedule

    setScrollY(0); // back to the top: fade > 0 again
    window.dispatchEvent(new Event('scroll'));
    rafCtl.flushAll(); // run the throttled updateScroll() that queued
    expect(rafCtl.pending).toBe(1); // onScroll restarted the loop
  });

  it('cancels the pending frame and removes the scroll/pointermove listeners on unmount', () => {
    stubMatchMedia();
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<ParticleField word="TEST" heroSelector="#hero" />);

    const addedTypes = addSpy.mock.calls.map((c) => c[0]);
    expect(addedTypes).toEqual(expect.arrayContaining(['scroll', 'pointermove']));
    expect(rafCtl.caf).not.toHaveBeenCalled();

    unmount();

    expect(rafCtl.caf).toHaveBeenCalled();
    const removedTypes = removeSpy.mock.calls.map((c) => c[0]);
    expect(removedTypes).toEqual(expect.arrayContaining(['scroll', 'pointermove']));
  });

  it('leaves exactly one active loop after a React strict-mode double-mount', () => {
    stubMatchMedia();
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    render(
      <StrictMode>
        <ParticleField word="TEST" heroSelector="#hero" />
      </StrictMode>,
    );

    // Strict mode mounts, cleans up, and mounts again synchronously in dev.
    const scrollAdds = addSpy.mock.calls.filter((c) => c[0] === 'scroll').length;
    const scrollRemoves = removeSpy.mock.calls.filter((c) => c[0] === 'scroll').length;
    expect(scrollAdds).toBe(2); // both mounts attached
    expect(scrollRemoves).toBe(1); // the first mount's cleanup ran
    expect(rafCtl.caf).toHaveBeenCalledTimes(1); // the first mount's frame was cancelled
    expect(rafCtl.pending).toBe(1); // only the second mount's frame is still queued
  });

  it('never starts the animation loop under prefers-reduced-motion, even across a scroll transition', () => {
    stubMatchMedia({ reducedMotion: true });
    render(<ParticleField word="TEST" heroSelector="#hero" />);
    expect(rafCtl.raf).not.toHaveBeenCalled();
    // "Never starts the loop" must still mean something is on screen: the
    // brief requires exactly one static frame, drawn outside the rAF path.
    expect(gl.drawCalls).toBeGreaterThan(0);
    const drawCallsAtMount = gl.drawCalls;

    // A transition that would normally set running=false then true again
    // (which restarts the loop) must not start the render loop. Dispatching
    // 'scroll' now DOES call requestAnimationFrame once per event burst --
    // that's the onScroll throttle coalescing updateScroll() calls, same as
    // it would in a visible tab, and is expected regardless of reduced
    // motion (see updateScroll()'s `&& !reducedMotion` guard, which is what
    // actually keeps the render loop itself from ever being scheduled).
    setScrollY(1000);
    window.dispatchEvent(new Event('scroll'));
    setScrollY(0);
    window.dispatchEvent(new Event('scroll'));
    rafCtl.flushAll(); // run the (at most one, coalesced) throttled updateScroll()

    // The loop itself (frame(), which re-schedules itself via
    // requestAnimationFrame forever once started) never got queued: nothing
    // is left pending, and no draw happened beyond the one static frame at
    // mount.
    expect(rafCtl.pending).toBe(0);
    expect(gl.drawCalls).toBe(drawCallsAtMount);
  });

  it('sends PARTICLE_COLORS to the shader, not inline literals', () => {
    // Reduced motion draws synchronously at mount, so the color uniforms are
    // set without needing to flush the (mocked, never auto-firing) rAF queue.
    stubMatchMedia({ reducedMotion: true });
    render(<ParticleField word="TEST" heroSelector="#hero" />);
    const colorArgs = gl.uniform3fvCalls.map((call) => call[1]);
    expect(colorArgs).toContainEqual(PARTICLE_COLORS.pointA);
    expect(colorArgs).toContainEqual(PARTICLE_COLORS.pointB);
    expect(colorArgs).toContainEqual(PARTICLE_COLORS.line);
  });

  it('releases every GL resource it created when unmounted', () => {
    // canvas.getContext('webgl2') returns the SAME cached context for the
    // life of the canvas element, so anything not explicitly deleted here
    // would accumulate on every effect re-run (word changes, Strict-Mode
    // double-mount) on top of the previous mount's objects.
    stubMatchMedia();
    const { unmount } = render(<ParticleField word="TEST" heroSelector="#hero" />);
    expect(gl.resources.buffersCreated).toBeGreaterThan(0);
    expect(gl.resources.vaosCreated).toBe(1);
    expect(gl.resources.programsCreated).toBe(2);
    expect(gl.resources.buffersDeleted).toBe(0);
    expect(gl.resources.vaosDeleted).toBe(0);
    expect(gl.resources.programsDeleted).toBe(0);

    unmount();

    expect(gl.resources.buffersDeleted).toBe(gl.resources.buffersCreated);
    expect(gl.resources.vaosDeleted).toBe(gl.resources.vaosCreated);
    expect(gl.resources.programsDeleted).toBe(gl.resources.programsCreated);
    // Shaders are transient (deleted right after linking, not held for the
    // component's lifetime), so this holds immediately at mount already --
    // asserted here too since it's the same leak category the review flagged.
    expect(gl.resources.shadersDeleted).toBe(gl.resources.shadersCreated);
    expect(gl.resources.shadersCreated).toBeGreaterThan(0);
  });

  it('updates canvas pixel dimensions on window resize', () => {
    stubMatchMedia();
    Object.defineProperty(window, 'devicePixelRatio', { value: 1, configurable: true });
    const { container } = render(<ParticleField word="TEST" heroSelector="#hero" />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;

    Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 900, configurable: true });
    window.dispatchEvent(new Event('resize'));

    expect(canvas.width).toBe(1200);
    expect(canvas.height).toBe(900);
  });

  it('builds a smaller lattice on coarse pointers', () => {
    stubMatchMedia({ coarsePointer: true });
    render(<ParticleField word="TEST" heroSelector="#hero" />);
    // The first bufferData call is the scatter/position attribute buffer:
    // nx*ny*nz*3 floats. 11*7*11 (coarse) vs 17*10*17 (default).
    const first = gl.bufferDataCalls[0] as Float32Array;
    expect(first.length).toBe(11 * 7 * 11 * 3);
  });

  it('rasterises Thai words with the Thai font stack and a tighter letter gap than Latin words', () => {
    stubMatchMedia();
    render(<ParticleField word="กก" heroSelector="#hero" />);
    const thaiFont = ctx2d.fontHistory.at(-1) ?? '';
    // measureText is fixed at 20, so (x1 - x0 - 20) recovers the gap exactly.
    const thaiGap = ctx2d.fillTextCalls[1].x - ctx2d.fillTextCalls[0].x - 20;
    cleanup();

    gl = makeGL();
    ctx2d = makeCtx2D();
    getContextSpy.mockRestore();
    getContextSpy = stubGetContext(gl, ctx2d);
    render(<ParticleField word="AA" heroSelector="#hero" />);
    const latinFont = ctx2d.fontHistory.at(-1) ?? '';
    const latinGap = ctx2d.fillTextCalls[1].x - ctx2d.fillTextCalls[0].x - 20;

    expect(thaiFont).toContain('Sukhumvit');
    expect(latinFont).toContain('Avenir Next');
    // Both words are 2 short chars, so both hit the same max font-size clamp
    // (150) regardless of gap ratio -- gap = fontSize * ratio is exact.
    expect(thaiGap).toBeCloseTo(150 * 0.02, 5);
    expect(latinGap).toBeCloseTo(150 * 0.06, 5);
  });
});
