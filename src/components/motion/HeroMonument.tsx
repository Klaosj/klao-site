'use client';

import { useEffect, useRef } from 'react';
import { HEX } from '@/lib/theme';

type Props = { word: string; heroSelector: string };

/** Thai block, U+0E00-U+0E7F. A Latin display face has no glyphs in this
 *  range, so the monument text needs the Thai font stack (and a smaller
 *  font size -- Thai glyphs run taller/wider per character) whenever `word`
 *  contains one. Same idiom ParticleField used for its own THAI_RANGE. */
const THAI_RANGE = /[฀-๿]/;

/** Choreography timeline, as fractions of the hero pin's scroll travel.
 *  Ported from ParticleField (MORPH_END/STAGE_FADE/CANVAS_FADE), renamed to
 *  match what this component actually does: DRAW_END is when the stroke
 *  finishes drawing itself in, LAYER_FADE is when the whole monument layer
 *  fades out as the hero pin ends. Exported so tests can pin the ordering
 *  invariants. */
export const DRAW_END = 0.45;
export const STAGE_FADE: readonly [number, number] = [0.22, 0.45];
export const LAYER_FADE: readonly [number, number] = [0.85, 1];

const DASH = 900;

const FIXED_LAYER_STYLE: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  width: '100%',
  height: '100%',
  display: 'block',
  zIndex: 0,
  pointerEvents: 'none',
};

const SVG_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: '52%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 'min(94vw, 1500px)',
};

/** The hero background: the owner's name in giant outline type, stroke-
 *  drawing itself in as the visitor scrolls through the hero pin. Replaces
 *  the WebGL particle field (ParticleField.tsx, removed) with a lighter,
 *  purely DOM/SVG treatment -- one <text> whose stroke-dashoffset animates
 *  on scroll, no canvas/WebGL involved. */
export default function HeroMonument({ word, heroSelector }: Props) {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<SVGTextElement | null>(null);

  useEffect(() => {
    const layer = layerRef.current;
    const text = textRef.current;
    if (!layer || !text) return;

    const hero = document.querySelector(heroSelector) as HTMLElement | null;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    text.style.strokeDasharray = String(DASH);

    if (reducedMotion || !hero) {
      // Static, fully-drawn frame -- no listeners, one settled frame, quieter
      // layer opacity (0.4, same value ParticleField's reduced-motion path
      // set on the whole canvas -- the layer, not the stroke, is the
      // equivalent knob here). The hero pin itself is released by CSS
      // (globals.css), so [data-hero-stage] is left untouched here.
      text.style.strokeDashoffset = '0';
      layer.style.opacity = '0.4';
      return;
    }

    let scrollRaf = 0;

    // The actual scroll-progress work: reads hero geometry + scrollY and
    // mutates the stroke draw, its opacity ramp, the stage fade and the
    // layer fade. Called directly once at mount for the initial paint, and
    // via the rAF-throttled onScroll wrapper for every 'scroll' event after
    // that -- same split ParticleField's updateScroll/onScroll established.
    const updateScroll = () => {
      scrollRaf = 0;
      // Progress through the pin: 0 at rest, 1 when the section's extra
      // height has fully scrolled past.
      const travel = Math.max(hero.offsetHeight - window.innerHeight, 1);
      const p = Math.min(Math.max(window.scrollY - hero.offsetTop, 0) / travel, 1);

      const drawn = Math.min(p / DRAW_END, 1);
      text.style.strokeDashoffset = String(DASH * (1 - drawn));
      // Stroke opacity ramps as the name draws, rewarding a full draw at
      // ~DRAW_END -- the replacement for ParticleField's old glow ramp
      // (uGlow = 0.6 * morph).
      text.style.strokeOpacity = String(0.32 + 0.1 * drawn);

      // Fade the DOM copy out of the way while the name assembles -- ported
      // from ParticleField's updateScroll, which faded [data-hero-stage]
      // over the same STAGE_FADE window (was missing from the prototype).
      const stage = hero.querySelector('[data-hero-stage]') as HTMLElement | null;
      if (stage) {
        const [s0, s1] = STAGE_FADE;
        const sOut = Math.min(Math.max((p - s0) / (s1 - s0), 0), 1);
        stage.style.opacity = String(1 - sOut);
        // visibility (not display) so layout never jumps; also removes the
        // ghost CTA from the tab order while invisible.
        stage.style.visibility = sOut >= 1 ? 'hidden' : 'visible';
      }

      // Whole layer fades out by pin end -- the stroke opacity ramp above
      // already handles brightness while drawing, so this is a plain 1->0,
      // unlike ParticleField's canvas fade (which also scaled brightness).
      const [f0, f1] = LAYER_FADE;
      const layerFade = 1 - Math.min(Math.max((p - f0) / (f1 - f0), 0), 1);
      layer.style.opacity = String(layerFade);
    };

    // Scroll fires far more often than a frame renders; coalesce to at most
    // one updateScroll() per animation frame -- same idiom as ParticleField.
    const onScroll = () => {
      if (!scrollRaf) scrollRaf = requestAnimationFrame(updateScroll);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    // Resize changes the pin's travel (offsetHeight - innerHeight), so the
    // draw/stage/fade state must recompute even when no scroll event fires
    // -- same reason ParticleField kept a resize listener.
    window.addEventListener('resize', onScroll);
    // Direct, synchronous call for the initial paint -- only 'scroll'
    // EVENTS go through the onScroll throttle above.
    updateScroll();

    return () => {
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
    // heroSelector is static page-shell configuration, same assumption
    // ParticleField's own effect made about its identical prop. `word` isn't
    // read inside this effect (only at render, for isThai/text content
    // below), so it isn't a dependency here.
  }, [heroSelector]);

  const isThai = THAI_RANGE.test(word);

  return (
    <div ref={layerRef} aria-hidden="true" style={FIXED_LAYER_STYLE}>
      <svg viewBox="0 0 1200 200" style={SVG_STYLE}>
        <text
          ref={textRef}
          x="600"
          y="130"
          textAnchor="middle"
          fill="none"
          // Sourced from theme.ts, not a literal: that file's contract is
          // that every colour lives in exactly one place.
          stroke={HEX.peri}
          strokeWidth={1.2}
          fontSize={isThai ? 110 : 150}
          fontFamily={isThai ? 'var(--font-thai)' : 'var(--font-display)'}
        >
          {word}
        </text>
      </svg>
    </div>
  );
}
