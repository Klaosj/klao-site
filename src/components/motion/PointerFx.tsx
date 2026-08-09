'use client';

import { useEffect, useRef } from 'react';

// Pointer-lag weight (px) for each hero pill, in DOM order (.pill-1/2/3 --
// see Hero.tsx's PILLS constant). Matches spec section 4's "Per-pill weight
// 11/18/25px, driven by CSS custom properties".
const PILL_WEIGHTS = [11, 18, 25];

// Smoothing factors: how far the eased value moves toward its target each
// frame. Pills trail noticeably (slow ease); the cursor stays close to the
// real pointer (fast ease) so it still reads as "the cursor", not a second
// lagging dot.
const PILL_EASE = 0.06;
const CURSOR_EASE = 0.22;

/** Cursor + magnetic buttons + hero-pill pointer lag -- the three motion
 *  items spec section 4 lists but no task ever built. All three ride ONE
 *  requestAnimationFrame loop (see the `tick` closure below): separate
 *  loops each pay their own layout/style-recalc cost per frame and drift
 *  out of step with each other, which is exactly the failure mode a
 *  second implementation of this same idea already hit once.
 *
 *  Ported from the reference prototype's own single-loop implementation
 *  (.superpowers/brainstorm/11719-1786211516/content/studio.html, the
 *  "cursor, magnetic buttons, pill lag" script starting `// ── cursor,
 *  magnetic buttons, pill lag`), with two deliberate departures:
 *
 *  1. The reference keeps calling requestAnimationFrame every frame under
 *     reduced motion and only skips the *body* of the work. This component
 *     never schedules a frame at all when reduced motion is on -- checked
 *     once, at the top of the effect, before any listener is attached or
 *     any frame requested. "No rAF loop running" is asserted by tests
 *     below, not just implied by an early-return inside the loop.
 *  2. The reference grows the cursor from 12px to 46px by transitioning
 *     `width`/`height`. Both trigger layout, and this component sits over
 *     the same live WebGL canvas ParticleField draws behind the hero (see
 *     globals.css's own "no backdrop-filter" reasoning for .pill, right
 *     next to the --lagX/--lagY rule this component finally drives). The
 *     grow/shrink here rides the CSS `scale` property instead -- like
 *     `translate` on .pill-N's drift keyframes, it composes with the
 *     `transform: translate(-50%,-50%)` centering and the per-frame
 *     `translate` position update below as three independent properties,
 *     none of which ever touch layout.
 *
 *  Follows the same shape ParticleField (T5) already established for a
 *  singleton, always-on motion effect in this codebase: a ref instead of
 *  `document.getElementById`, direct DOM mutation every frame instead of
 *  React state (a 60fps setState loop would re-render the whole subtree
 *  for nothing), and an effect whose cleanup cancels the frame and removes
 *  every listener it added -- so a React Strict-Mode double-mount leaves
 *  exactly one loop and one set of listeners, never two racing copies. */
export default function PointerFx() {
  const cursorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Checked once, before anything is attached: this is what makes the
    // whole layer inert under reduced motion, not just visually frozen.
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const cursor = cursorRef.current;
    const pills = Array.from(document.querySelectorAll<HTMLElement>('#hero .pill'));
    const buttons = Array.from(document.querySelectorAll<HTMLElement>('.btn'));

    // Pointer target in [-1, 1] on each axis (feeds pill lag) and in raw
    // viewport px (feeds the cursor). `cursorTargetX/Y` start off-screen so
    // the cursor doesn't flash at (0, 0) before the first real pointermove.
    let targetNX = 0;
    let targetNY = 0;
    let cursorTargetX = -100;
    let cursorTargetY = -100;
    // Eased values the loop below nudges toward the targets each frame.
    let lagX = 0;
    let lagY = 0;
    let cursorX = -100;
    let cursorY = -100;
    let rafId = 0;

    const onPointerMove = (e: PointerEvent) => {
      targetNX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetNY = (e.clientY / window.innerHeight - 0.5) * 2;
      cursorTargetX = e.clientX;
      cursorTargetY = e.clientY;
      cursor?.classList.add('on');
    };
    const onPointerLeaveWindow = () => cursor?.classList.remove('on');
    const onPointerOver = (e: PointerEvent) => {
      const target = e.target as Element | null;
      cursor?.classList.toggle('big', Boolean(target?.closest('a, button, .frame')));
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeaveWindow, { passive: true });
    document.addEventListener('pointerover', onPointerOver, { passive: true });

    // Magnetic buttons are event-driven, not part of the rAF loop: each
    // pointermove sets the pull straight from that event's own coordinates,
    // and .btn's own CSS transition (globals.css) smooths the jump between
    // updates. No per-frame work is needed for these, so they add no load
    // to `tick` below -- only the effects that genuinely need continuous
    // easing (cursor position, pill lag) run inside it.
    const btnCleanups = buttons.map((el) => {
      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const mx = (e.clientX - r.left - r.width / 2) * 0.22;
        const my = (e.clientY - r.top - r.height / 2) * 0.32;
        el.style.setProperty('--magX', `${mx.toFixed(1)}px`);
        el.style.setProperty('--magY', `${my.toFixed(1)}px`);
      };
      const onLeave = () => {
        el.style.setProperty('--magX', '0px');
        el.style.setProperty('--magY', '0px');
      };
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerleave', onLeave);
      return () => {
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerleave', onLeave);
      };
    });

    function tick() {
      lagX += (targetNX - lagX) * PILL_EASE;
      lagY += (targetNY - lagY) * PILL_EASE;
      pills.forEach((pill, i) => {
        const weight = PILL_WEIGHTS[i] ?? PILL_WEIGHTS[PILL_WEIGHTS.length - 1];
        pill.style.setProperty('--lagX', `${(lagX * weight).toFixed(1)}px`);
        pill.style.setProperty('--lagY', `${(lagY * weight * 0.6).toFixed(1)}px`);
      });

      cursorX += (cursorTargetX - cursorX) * CURSOR_EASE;
      cursorY += (cursorTargetY - cursorY) * CURSOR_EASE;
      if (cursor) cursor.style.translate = `${cursorX.toFixed(1)}px ${cursorY.toFixed(1)}px`;

      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeaveWindow);
      document.removeEventListener('pointerover', onPointerOver);
      for (const cleanup of btnCleanups) cleanup();
    };
  }, []);

  // Decoration only, same as the pills it trails -- never something a
  // screen reader or keyboard user needs, and CSS (globals.css) hides it
  // outright on coarse/no-hover pointers and under reduced motion.
  return <div ref={cursorRef} id="cursor" aria-hidden="true" />;
}
