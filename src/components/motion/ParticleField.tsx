'use client';

import { useEffect, useRef } from 'react';
import { buildLattice, samplePoints, type GlyphMask } from '@/lib/particles';
import { PARTICLE_COLORS } from '@/lib/theme';

type Props = { word: string; heroSelector: string };

/** Thai block, U+0E00-U+0E7F. A Latin display face has no glyphs in this
 *  range -- it rasterises every character to an empty box, and the
 *  particles would faithfully assemble into a row of rectangles. */
const THAI_RANGE = /[฀-๿]/;

const LATIN_STACK = '"Avenir Next", Futura, "Helvetica Neue", -apple-system, sans-serif';
// Mirrors --font-thai in globals.css.
const THAI_STACK = '-apple-system, "Sukhumvit Set", "IBM Plex Sans Thai", "Noto Sans Thai", sans-serif';

const HEAD = `#version 300 es
precision highp float;
layout(location=0) in vec3 aScatter;
layout(location=1) in vec3 aTarget;
layout(location=2) in float aSeed;
uniform mat4 uProj, uView;
uniform float uTime, uMorph, uSize;
vec3 flow(vec3 p, float t){
  return vec3(sin(p.y*.9+t*.5)+cos(p.z*.7-t*.3),
              sin(p.z*.8-t*.4)+cos(p.x*.6+t*.35),
              sin(p.x*.7+t*.45)+cos(p.y*.5-t*.25));
}
float easeIO(float x){ return x<.5 ? 4.*x*x*x : 1.-pow(-2.*x+2.,3.)/2.; }
vec4 solve(){
  vec3 base = aScatter;
  float a = uTime*.03, c = cos(a), s = sin(a);
  base.xz = mat2(c,-s,s,c) * base.xz;
  base += .09*flow(aScatter*.7, uTime*.3);
  float stag = easeIO(clamp(uMorph*1.65 - aSeed*.62, 0., 1.));
  return uView * vec4(mix(base, aTarget, stag), 1.);
}`;

const VS = HEAD + `
out float vSeed; out float vAlpha;
void main(){
  vec4 mv = solve();
  gl_Position = uProj * mv;
  float d = max(-mv.z, .1);
  gl_PointSize = clamp(uSize*(4.2/d)*(.55+.9*fract(aSeed*137.13))*(1.+.8*uMorph), 1., 48.);
  vSeed = fract(aSeed*29.7);
  vAlpha = clamp(1.15-(d-3.)/9., .1, 1.);
}`;

const FS = `#version 300 es
precision highp float;
in float vSeed; in float vAlpha;
uniform vec3 uColA, uColB; uniform float uFade;
out vec4 frag;
void main(){
  vec2 c = gl_PointCoord*2.-1.;
  float r = dot(c,c); if (r > 1.) discard;
  float a = pow(1.-r, 1.6);
  frag = vec4(mix(uColA, uColB, vSeed) * a * uFade, a * vAlpha * uFade);
}`;

const LVS = HEAD + `
out float vAlpha;
void main(){
  vec4 mv = solve();
  gl_Position = uProj * mv;
  vAlpha = clamp(1.1-(max(-mv.z,.1)-3.)/8., 0., 1.);
}`;

const LFS = `#version 300 es
precision highp float;
in float vAlpha;
uniform vec3 uColLine; uniform float uLineAlpha, uFade;
out vec4 frag;
void main(){ float a = vAlpha*uLineAlpha*uFade; frag = vec4(uColLine*a, a); }`;

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error(info ?? 'shader compile failed');
  }
  return s;
}

type LinkedProgram = { program: WebGLProgram; uniforms: Record<string, WebGLUniformLocation | null> };

function linkProgram(gl: WebGL2RenderingContext, vs: string, fs: string): LinkedProgram {
  const program = gl.createProgram()!;
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? 'program link failed');
  }
  const uniforms: Record<string, WebGLUniformLocation | null> = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < count; i++) {
    const name = gl.getActiveUniform(program, i)!.name;
    uniforms[name] = gl.getUniformLocation(program, name);
  }
  return { program, uniforms };
}

/** Both programs, or null if the driver rejected a shader -- caller decides
 *  what "no particle field" looks like (nothing, silently). */
function setupPrograms(gl: WebGL2RenderingContext): { PT: LinkedProgram; LN: LinkedProgram } | null {
  try {
    return { PT: linkProgram(gl, VS, FS), LN: linkProgram(gl, LVS, LFS) };
  } catch (err) {
    console.error(err);
    return null;
  }
}

function perspective(fovY: number, aspect: number, near: number, far: number): Float32Array {
  const t = 1 / Math.tan(fovY / 2);
  const nf = 1 / (near - far);
  return new Float32Array([t / aspect, 0, 0, 0, 0, t, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
}

function lookAt(eye: number[], center: number[], up: number[]): Float32Array {
  let z0 = eye[0] - center[0], z1 = eye[1] - center[1], z2 = eye[2] - center[2];
  let l = 1 / Math.hypot(z0, z1, z2);
  z0 *= l; z1 *= l; z2 *= l;
  let x0 = up[1] * z2 - up[2] * z1, x1 = up[2] * z0 - up[0] * z2, x2 = up[0] * z1 - up[1] * z0;
  l = 1 / (Math.hypot(x0, x1, x2) || 1);
  x0 *= l; x1 *= l; x2 *= l;
  const y0 = z1 * x2 - z2 * x1, y1 = z2 * x0 - z0 * x2, y2 = z0 * x1 - z1 * x0;
  return new Float32Array([
    x0, y0, z0, 0,
    x1, y1, z1, 0,
    x2, y2, z2, 0,
    -(x0 * eye[0] + x1 * eye[1] + x2 * eye[2]),
    -(y0 * eye[0] + y1 * eye[1] + y2 * eye[2]),
    -(z0 * eye[0] + z1 * eye[1] + z2 * eye[2]),
    1,
  ]);
}

/** Draws `word` to an offscreen 2D canvas and returns the indices of pixels
 *  the glyphs cover. Thai text gets the Thai font stack and a much tighter
 *  letter gap -- Thai vowel/tone marks stack close to their base
 *  consonant, so the Latin gap (`0.06` of the font size) reads as broken
 *  words once resolved into particles. */
function rasterise(word: string): GlyphMask {
  const width = 640;
  const height = 200;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { width, height, filled: [] };

  const isThai = THAI_RANGE.test(word);
  const stack = isThai ? THAI_STACK : LATIN_STACK;
  const gapRatio = isThai ? 0.02 : 0.06;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  const letters = [...word];
  // Probe at a fixed size to find how big the word can be while staying
  // inside 90% of the canvas width, then render at that size.
  ctx.font = `700 100px ${stack}`;
  const probeWidths = letters.map((ch) => ctx.measureText(ch).width);
  const probeTotal = probeWidths.reduce((a, b) => a + b, 0) + 100 * gapRatio * Math.max(letters.length - 1, 0);
  const fontSize = Math.max(30, Math.min(150, (width * 0.9) / (probeTotal / 100)));
  ctx.font = `700 ${fontSize}px ${stack}`;
  const gap = fontSize * gapRatio;
  const widths = letters.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + gap * Math.max(letters.length - 1, 0);
  let cx = (width - total) / 2;
  letters.forEach((ch, i) => {
    ctx.fillText(ch, cx, height / 2);
    cx += widths[i] + gap;
  });

  const data = ctx.getImageData(0, 0, width, height).data;
  const filled: number[] = [];
  for (let i = 0, px = 0; i < data.length; i += 4, px++) {
    if (data[i] > 128) filled.push(px);
  }
  return { width, height, filled };
}

/** The particle field behind the hero: a lattice of points that scatters on
 *  load and resolves into `word` as the visitor scrolls through the hero.
 *  Unlike the studio.html reference this ports from, the render loop stops
 *  the instant the canvas is scrolled out of view instead of running for
 *  the whole page. */
export default function ParticleField({ word, heroSelector }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2', { antialias: true, alpha: true, powerPreference: 'high-performance' });
    if (!gl) return;

    const linked = setupPrograms(gl);
    if (!linked) return;
    const { PT, LN } = linked;

    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarsePointer = matchMedia('(pointer: coarse)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const lattice = coarsePointer
      ? buildLattice(11, 7, 11, [6.4, 3.5, 6.4])
      : buildLattice(17, 10, 17, [6.4, 3.5, 6.4]);
    const targets = samplePoints(rasterise(word), lattice.count, 9.2);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const makeAttrib = (data: Float32Array, loc: number, size: number) => {
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    };
    makeAttrib(lattice.positions, 0, 3);
    makeAttrib(targets, 1, 3);
    makeAttrib(lattice.seeds, 2, 1);
    const ebo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, lattice.links, gl.STATIC_DRAW);
    gl.bindVertexArray(null);

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    let morph = 0;
    let fade = 0;
    let running = true;
    let mx = 0, my = 0, tmx = 0, tmy = 0;
    let rafId = 0;

    function draw(time: number) {
      if (!gl) return;
      const proj = perspective((50 * Math.PI) / 180, canvas!.width / canvas!.height, 0.1, 60);
      const s = Math.min(Math.max((morph - 0.5) / 0.38, 0), 1);
      const settle = s * s * (3 - 2 * s);
      const orb = time * 0.055 + mx * 0.34;
      const roam = [Math.sin(orb) * 7.6, 1.15 + my * -1.05, Math.cos(orb) * 7.6];
      const front = [mx * 0.55, my * -0.45, 7.9];
      const eye = [
        roam[0] + (front[0] - roam[0]) * settle,
        roam[1] + (front[1] - roam[1]) * settle,
        roam[2] + (front[2] - roam[2]) * settle,
      ];
      const view = lookAt(eye, [0, 0, 0], [0, 1, 0]);

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindVertexArray(vao);

      gl.useProgram(LN.program);
      gl.uniformMatrix4fv(LN.uniforms.uProj, false, proj);
      gl.uniformMatrix4fv(LN.uniforms.uView, false, view);
      gl.uniform1f(LN.uniforms.uTime, time);
      gl.uniform1f(LN.uniforms.uMorph, morph);
      gl.uniform3fv(LN.uniforms.uColLine, PARTICLE_COLORS.line);
      gl.uniform1f(LN.uniforms.uLineAlpha, 0.14 * (1 - 0.9 * morph));
      gl.uniform1f(LN.uniforms.uFade, fade);
      gl.drawElements(gl.LINES, lattice.links.length, gl.UNSIGNED_INT, 0);

      gl.useProgram(PT.program);
      gl.uniformMatrix4fv(PT.uniforms.uProj, false, proj);
      gl.uniformMatrix4fv(PT.uniforms.uView, false, view);
      gl.uniform1f(PT.uniforms.uTime, time);
      gl.uniform1f(PT.uniforms.uMorph, morph);
      gl.uniform1f(PT.uniforms.uSize, 3.4 * dpr);
      gl.uniform3fv(PT.uniforms.uColA, PARTICLE_COLORS.pointA);
      gl.uniform3fv(PT.uniforms.uColB, PARTICLE_COLORS.pointB);
      gl.uniform1f(PT.uniforms.uFade, fade);
      gl.drawArrays(gl.POINTS, 0, lattice.count);

      gl.bindVertexArray(null);
    }

    function frame(now: number) {
      // The core claim over the reference this ports from: once the canvas
      // is invisible, stop drawing and stop scheduling -- no more GPU work
      // until scroll brings it back into view.
      if (!running) return;
      mx += (tmx - mx) * 0.045;
      my += (tmy - my) * 0.045;
      draw(now / 1000);
      rafId = requestAnimationFrame(frame);
    }

    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      // A resize clears the drawing buffer. The loop repaints every normal
      // frame, but reduced-motion draws exactly once, so that one frame has
      // to be redone here or the canvas goes blank on the next resize.
      if (reducedMotion) draw(performance.now() / 1000);
    };

    const onScroll = () => {
      const hero = document.querySelector(heroSelector) as HTMLElement | null;
      if (!hero) return;
      const p = Math.min(Math.max(window.scrollY / Math.max(hero.offsetHeight, 1), 0), 1);
      morph = Math.min(p / 0.62, 1);
      fade = (1 - Math.min(Math.max((p - 0.82) / 0.18, 0), 1)) * 0.85;
      canvas.style.opacity = String(fade);
      if (fade <= 0.001) {
        running = false;
      } else if (!running && !reducedMotion) {
        running = true;
        rafId = requestAnimationFrame(frame);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      tmx = (e.clientX / window.innerWidth - 0.5) * 2;
      tmy = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    window.addEventListener('resize', resize);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    resize();
    onScroll();

    if (reducedMotion) {
      draw(performance.now() / 1000);
    } else {
      rafId = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointerMove);
    };
    // heroSelector is treated as static configuration, like word: both come
    // from the page shell and aren't expected to change after mount. Re-running
    // this effect on every parent re-render would tear down and rebuild the
    // whole GL scene for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
