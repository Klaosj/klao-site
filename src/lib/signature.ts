// The 2022 → 2026 signature scene as numbers (spec §4 row 2, §5.5, §6 "Signature"; the
// prototype's `sig` engine). Pure and DOM-free, so it is unit-tested in node.
//
// SignatureScene runs one of two motion paths over the SAME geometry:
//   - CSS scroll-driven (animation-timeline): `sigVars(geometry)` becomes custom properties
//     that the keyframes in signature.css read, and the browser scrubs them off the main thread;
//   - IntersectionObserver + rAF fallback (Firefox today): `sigFrame(progress, geometry)` is
//     painted as inline opacity/transform on each frame.
// `SIG` is the one timetable both follow; tests/p2-css.test.ts fails if the keyframe
// percentages in signature.css drift from it.

/** Year chip, first to last. The eyebrow and the lineage card read its two ends. */
export const SIG_YEARS = ['2022', '2023', '2024', '2025', '2026'] as const;

/** The pitch card's numerals -- with the Career figures, the only big numbers on the page. */
export const SIG_STAT = { value: '30', total: '500' } as const;

export type SigWindow = readonly [number, number];

/** Progress windows: 0 = the track's top meets the viewport's top, 1 = its bottom meets the viewport's bottom. */
export const SIG = {
  head: [0.1, 0.13], // the headline lifts away
  gather: [0.1, 0.34], // tiles: scattered -> ringed around the card
  capAIn: [0.35, 0.38], // "Four years. The idea stayed." in
  cardOut: [0.38, 0.48], // the pitch card fades and settles back
  collapse: [0.4, 0.5], // tiles: ringed -> one pile
  face: [0.46, 0.5], // the top tile turns into GoNai's pin
  frameIn: [0.5, 0.54], // GoNai's frame appears out of the pile
  zoom: [0.5, 0.8], // ... and opens to full size
  tilesOut: [0.52, 0.56], // the pile fades under it
  tint: [0.55, 0.85], // the GoNai wash comes up behind
  capAOut: [0.62, 0.65], // caption A out
  capBIn: [0.72, 0.75], // "GoNai · Live" + Open app in
  chipOut: [0.74, 0.8], // the year chip leaves
} as const satisfies Record<string, SigWindow>;

/** The chip reads SIG_YEARS[n] once progress reaches SIG_YEAR_STEPS[n - 1]. */
export const SIG_YEAR_STEPS = [0.4, 0.5, 0.6, 0.7] as const;

const TILE = 56;
// T12 F2: the clear space between the head's last line and the opening frame's highest point.
const HEAD_GAP = 12;
// Fix wave finding 9 (R21): the screenshots are 1580x900, not 16:9 -- matches signature.css
// `.sig-frame`'s aspect-ratio exactly, the same value HeroTourStage's `.ht-card` uses.
const FRAME_RATIO = 900 / 1580;

export const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));
export const sub = (p: number, [a, b]: SigWindow): number => clamp((p - a) / (b - a), 0, 1);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** cubic-bezier(.4,0,.6,1): x solved by bisection (as in the prototype), exact at both ends. */
export function glide(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  let lo = 0;
  let hi = 1;
  let x = t;
  for (let k = 0; k < 14; k++) {
    const m = (lo + hi) / 2;
    const xm = 3 * 0.4 * m * (1 - m) * (1 - m) + 3 * 0.6 * m * m * (1 - m) + m * m * m;
    if (xm < t) lo = m;
    else hi = m;
    x = m;
  }
  return 3 * x * x * (1 - x) + x * x * x;
}

export function sigProgress(scrollY: number, start: number, length: number): number {
  return clamp((scrollY - start) / Math.max(1, length), 0, 1);
}

/** Pin only with motion allowed, at least 600 px of height, and not on a phone held sideways. */
export function shouldPin({ reducedMotion, width, height }: { reducedMotion: boolean; width: number; height: number }): boolean {
  return !reducedMotion && height >= 600 && (width > 734 || height > width);
}

export function sigYear(p: number): number {
  return SIG_YEAR_STEPS.filter((step) => p >= step).length;
}

export interface SigPoint {
  x: number; // tile's top-left in stage px
  y: number;
  r: number; // rotation, deg
}

export interface SigTile {
  scatter: SigPoint;
  ring: SigPoint;
  pile: SigPoint;
}

export interface SigGeometry {
  phone: boolean;
  card: { left: number; top: number }; // settled: where the card rings, piles and opens the frame
  chip: { left: number; top: number };
  // T12 F2: how far below its settled place the opening frame starts the card, the chip and the
  // scattered tiles, so they clear the head on a short phone. 0 on desktop and on tall phones.
  lift: number;
  frame: { width: number; left: number; top: number; scale0: number; dx: number; dy: number };
  tiles: SigTile[];
}

export interface SigInput {
  width: number; // stage clientWidth
  height: number; // stage clientHeight (100vh / 100svh)
  cardWidth: number; // the pitch card as laid out under `.sig.pin`
  cardHeight: number;
  // Fix wave finding 7 (gate 4): stage.clientWidth excludes the scrollbar's own band, so right
  // at the 734px breakpoint it can read a few px narrower than the viewport width the `(max-
  // width: 734px)` media query (and every phone-only CSS rule) actually used. Passing the
  // media query's own answer keeps this decision in sync with the CSS instead of re-deriving it
  // from a slightly different number. Optional and defaults to the old `W <= 734` when omitted,
  // so every existing caller (and test) is unaffected.
  phone?: boolean;
  // T12 F2: the head block's bottom edge in stage px -- its layout box, which no transform moves.
  // On a phone the opening frame starts low enough to clear it. Optional: omitted, nothing lifts.
  headBottom?: number;
}

type Offset = readonly [number, number, number]; // x, y, deg from the card's centre

/** Half the height of a tile's box once rotated by `deg` about its centre (its rect in the browser). */
const halfSpan = (deg: number): number => {
  const rad = (deg * Math.PI) / 180;
  return (TILE / 2) * (Math.abs(Math.cos(rad)) + Math.abs(Math.sin(rad)));
};

/** Port of the prototype's `layout()`: every position the scene uses, from four measurements. */
export function sigGeometry({ width: W, height: H, cardWidth, cardHeight, phone: phoneOverride, headBottom }: SigInput): SigGeometry {
  const phone = phoneOverride ?? W <= 734;
  const hw = cardWidth / 2;
  const hh = cardHeight / 2;
  const cx = W / 2;
  const cy = phone ? H * 0.58 : H * 0.54;
  const fw = phone ? W : Math.min(1280, W - 160);
  const fh = fw * FRAME_RATIO;
  const fcy = phone ? H * 0.45 : H / 2;

  const scatter: Offset[] = phone
    ? [[-hw + 30, -hh - 36, -8], [hw - 30, -hh - 40, 6], [-hw + 20, hh + 40, 7], [hw - 20, hh + 46, -6], [0, hh + 70, 4]]
    : [[-hw - 120, -hh - 30, -8], [hw + 110, -hh - 50, 6], [-hw - 130, hh + 20, 7], [hw + 125, hh + 10, -6], [0, hh + 110, 4]];
  const ring: Offset[] = phone
    ? [-2, -1, 0, 1, 2].map((d): Offset => [d * 64, hh + 40, 0])
    : [[-hw - 40, -hh + 44, 0], [hw + 40, -hh + 44, 0], [-hw - 40, hh - 44, 0], [hw + 40, hh - 44, 0], [0, hh + 40, 0]];
  const pile: Offset[] = [[0, 0, 0], [5, 4, 5], [-5, 6, -6], [8, 9, 9], [-8, 10, -10]];
  const at = ([x, y, r]: Offset): SigPoint => ({ x: cx + x - TILE / 2, y: cy + y - TILE / 2, r });

  // T12 F2: a phone's real browser height (390x664 with Safari's toolbars, not the 844 screen)
  // leaves too little room under the head: the opening frame's top -- a scattered tile's rotated
  // corner, the chip or the card, whichever is highest above the card's centre -- sat up to 63 px
  // under the lead. Fitting the whole scene lower instead would push the ring under caption A and
  // the thumb bar later on, so only the opening moves: it starts `lift` px down, and the card, chip
  // and tiles rise into their settled places on the gather's own glide (sigFrame; sig-card and
  // sig-chip in signature.css), finishing before caption A comes in. Desktop is left as it was.
  const reach = Math.max(hh + 48, ...scatter.map(([, y, r]) => -y + halfSpan(r))); // chip top, tile corners
  const lift = phone && headBottom !== undefined ? Math.max(0, headBottom + HEAD_GAP + reach - cy) : 0;

  return {
    phone,
    card: { left: cx - hw, top: cy - hh },
    chip: { left: cx - 30, top: cy - hh - 48 },
    lift,
    frame: { width: fw, left: W / 2 - fw / 2, top: fcy - fh / 2, scale0: TILE / Math.max(1, fw), dx: cx - W / 2, dy: cy - fcy },
    tiles: scatter.map(([x, y, r], i) => ({ scatter: at([x, y + lift, r]), ring: at(ring[i]), pile: at(pile[i]) })),
  };
}

const px = (n: number): string => `${n.toFixed(1)}px`;
const op = (n: number): string => n.toFixed(3);

export function tileTransform(p: SigPoint): string {
  return `translate(${px(p.x)}, ${px(p.y)}) rotate(${p.r.toFixed(2)}deg)`;
}

function frameTransform(dx: number, dy: number, scale: number): string {
  return `translate(${px(dx)}, ${px(dy)}) scale(${scale.toFixed(4)})`;
}

export interface SigStyle {
  opacity: string;
  transform: string;
}

export interface SigFrameStyles {
  head: SigStyle;
  tiles: SigStyle[];
  face: string; // opacity
  card: SigStyle;
  frame: SigStyle;
  tint: string; // opacity
  chip: SigStyle; // rises with the card (T12 F2)
  year: number; // index into SIG_YEARS
  capA: SigStyle;
  capB: SigStyle;
}

/** Every inline style the JS fallback paints at progress p (0..1). */
export function sigFrame(p: number, g: SigGeometry): SigFrameStyles {
  const h = sub(p, SIG.head);
  const t1 = glide(sub(p, SIG.gather));
  const rise = g.lift * (1 - t1); // T12 F2: what is left of the opening's lift
  const t2 = glide(sub(p, SIG.collapse));
  const tilesOpacity = op(1 - sub(p, SIG.tilesOut));
  const tc = sub(p, SIG.cardOut);
  const tz = glide(sub(p, SIG.zoom));
  const a = Math.min(sub(p, SIG.capAIn), 1 - sub(p, SIG.capAOut));
  const b = sub(p, SIG.capBIn);
  return {
    head: { opacity: op(1 - h), transform: `translateY(${px(-16 * h)})` },
    tiles: g.tiles.map(({ scatter: s, ring: k, pile: q }) => ({
      opacity: tilesOpacity,
      transform: tileTransform({
        x: lerp(lerp(s.x, k.x, t1), q.x, t2),
        y: lerp(lerp(s.y, k.y, t1), q.y, t2),
        r: lerp(lerp(s.r, k.r, t1), q.r, t2),
      }),
    })),
    face: op(sub(p, SIG.face)),
    card: { opacity: op(1 - tc), transform: `translateY(${px(rise)}) scale(${(1 - 0.06 * tc).toFixed(4)})` },
    frame: {
      opacity: op(sub(p, SIG.frameIn)),
      transform: frameTransform(g.frame.dx * (1 - tz), g.frame.dy * (1 - tz), lerp(g.frame.scale0, 1, tz)),
    },
    tint: op(sub(p, SIG.tint)),
    chip: { opacity: op(1 - sub(p, SIG.chipOut)), transform: `translateY(${px(rise)})` },
    year: sigYear(p),
    capA: { opacity: op(a), transform: `translateY(${px(8 * (1 - a))})` },
    capB: { opacity: op(b), transform: b === 0 ? 'translateY(100vh)' : `translateY(${px(8 * (1 - b))})` },
  };
}

export interface SigVars {
  tiles: { s: string; k: string; p: string }[]; // --s --k --p per tile
  frameStart: string; // --z0 on the frame
  lift: string; // --lift on the card and the chip (T12 F2)
}

/** The geometry as the custom properties signature.css's keyframes read. */
export function sigVars(g: SigGeometry): SigVars {
  return {
    tiles: g.tiles.map((t) => ({ s: tileTransform(t.scatter), k: tileTransform(t.ring), p: tileTransform(t.pile) })),
    frameStart: frameTransform(g.frame.dx, g.frame.dy, g.frame.scale0),
    lift: px(g.lift),
  };
}
