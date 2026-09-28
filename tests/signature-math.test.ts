import { describe, expect, it } from 'vitest';
import {
  SIG_YEARS,
  SIG_YEAR_STEPS,
  glide,
  shouldPin,
  sigFrame,
  sigGeometry,
  sigProgress,
  sigVars,
  sigYear,
  type SigPoint,
} from '@/lib/signature';

// Card sizes as measured on the prototype at 1440×900 and 390×844.
const DESK = sigGeometry({ width: 1440, height: 900, cardWidth: 440, cardHeight: 240 });
const PHONE = sigGeometry({ width: 390, height: 844, cardWidth: 350, cardHeight: 260 });

function expectPoint(actual: SigPoint, expected: SigPoint) {
  expect(actual.x).toBeCloseTo(expected.x, 6);
  expect(actual.y).toBeCloseTo(expected.y, 6);
  expect(actual.r).toBe(expected.r);
}

describe('glide (cubic-bezier(.4,0,.6,1), the --ease-glide token)', () => {
  it('is pinned at both ends', () => {
    expect(glide(0)).toBe(0);
    expect(glide(1)).toBe(1);
  });

  it('is symmetric around the midpoint', () => {
    expect(glide(0.5)).toBeCloseTo(0.5, 3);
    expect(glide(0.25) + glide(0.75)).toBeCloseTo(1, 3);
  });

  it('never runs backwards', () => {
    let prev = 0;
    for (let i = 0; i <= 20; i++) {
      const v = glide(i / 20);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});

describe('sigProgress', () => {
  it('maps the pinned scroll to 0..1 and clamps outside it', () => {
    expect(sigProgress(1000, 1000, 900)).toBe(0);
    expect(sigProgress(1450, 1000, 900)).toBe(0.5);
    expect(sigProgress(5000, 1000, 900)).toBe(1);
    expect(sigProgress(0, 1000, 900)).toBe(0);
  });

  it('never divides by zero', () => {
    expect(sigProgress(10, 0, 0)).toBe(1);
  });
});

describe('shouldPin', () => {
  it('pins on a desktop with motion allowed', () => {
    expect(shouldPin({ reducedMotion: false, width: 1440, height: 900 })).toBe(true);
  });

  it('pins on a phone held upright', () => {
    expect(shouldPin({ reducedMotion: false, width: 390, height: 844 })).toBe(true);
  });

  it('never pins under reduced motion', () => {
    expect(shouldPin({ reducedMotion: true, width: 1440, height: 900 })).toBe(false);
  });

  it('keeps the static stack on a short screen', () => {
    expect(shouldPin({ reducedMotion: false, width: 1440, height: 560 })).toBe(false);
  });

  it('keeps the static stack on a phone held sideways', () => {
    expect(shouldPin({ reducedMotion: false, width: 700, height: 650 })).toBe(false);
  });
});

describe('sigGeometry', () => {
  it('centres the card at 54% of the stage height on desktop', () => {
    expect(DESK.phone).toBe(false);
    expect(DESK.card.left).toBeCloseTo(500, 6); // 720 - 220
    expect(DESK.card.top).toBeCloseTo(366, 6); // 486 - 120
    expect(DESK.chip.left).toBeCloseTo(690, 6);
    expect(DESK.chip.top).toBeCloseTo(318, 6);
  });

  it('sizes the frame to the stage minus 160 px (max 1280) and starts it as one 56 px tile on the card', () => {
    expect(DESK.frame.width).toBe(1280);
    expect(DESK.frame.left).toBe(80);
    // Fix wave finding 9 (R21): frame height follows the 1580/900 screenshot ratio, not 16:9 --
    // 1280 * 900 / 1580 ≈ 729.114, so top = 450 - 729.114 / 2.
    expect(DESK.frame.top).toBeCloseTo(85.443, 3);
    expect(DESK.frame.scale0).toBeCloseTo(56 / 1280, 9);
    expect(DESK.frame.dx).toBe(0);
    expect(DESK.frame.dy).toBeCloseTo(36, 6); // card centre 486 - frame centre 450
  });

  it('scatters the five tiles around the card, rings them, then piles them at its centre', () => {
    expect(DESK.tiles).toHaveLength(5);
    expectPoint(DESK.tiles[0].scatter, { x: 720 - 220 - 120 - 28, y: 486 - 120 - 30 - 28, r: -8 });
    expectPoint(DESK.tiles[0].ring, { x: 720 - 220 - 40 - 28, y: 486 - 120 + 44 - 28, r: 0 });
    expectPoint(DESK.tiles[0].pile, { x: 720 - 28, y: 486 - 28, r: 0 });
    expectPoint(DESK.tiles[4].pile, { x: 720 - 8 - 28, y: 486 + 10 - 28, r: -10 });
  });

  it('uses the full width and a single row of tiles on a phone', () => {
    expect(PHONE.phone).toBe(true);
    expect(PHONE.frame.width).toBe(390);
    const ringX = PHONE.tiles.map((t) => t.ring.x);
    [-128, -64, 0, 64, 128].forEach((d, i) => expect(ringX[i]).toBeCloseTo(195 + d - 28, 6));
    expect(new Set(PHONE.tiles.map((t) => t.ring.y.toFixed(3))).size).toBe(1);
  });

  // Fix wave finding 7 (gate 4): an explicit `phone` overrides the `width <= 734` default --
  // stage.clientWidth (the caller's `width`) excludes the scrollbar band, so it can disagree
  // with the `(max-width: 734px)` media query right at the edge; the override lets the caller
  // hand sigGeometry the media query's own answer instead of re-deriving a slightly different one.
  it('lets an explicit phone override the width <= 734 default (fix wave finding 7)', () => {
    // A wide stage (never phone by width) forced into phone layout.
    const forcedPhone = sigGeometry({ width: 900, height: 900, cardWidth: 350, cardHeight: 260, phone: true });
    expect(forcedPhone.phone).toBe(true);
    expect(forcedPhone.frame.width).toBe(900); // phone rule: frame.width === W, not min(1280, W-160)
    // A narrow stage (phone by width) forced into desktop layout.
    const forcedDesktop = sigGeometry({ width: 700, height: 900, cardWidth: 440, cardHeight: 240, phone: false });
    expect(forcedDesktop.phone).toBe(false);
    expect(forcedDesktop.frame.width).toBe(540); // desktop rule: min(1280, W-160) = 700-160
    // Omitting `phone` keeps the old width-only behaviour (DESK/PHONE above already cover this,
    // but pinned here too so the override's default is provably the same value).
    expect(sigGeometry({ width: 1440, height: 900, cardWidth: 440, cardHeight: 240 }).phone).toBe(false);
  });
});

describe('sigYear', () => {
  it('steps the chip from 2022 to 2026 at SIG_YEAR_STEPS', () => {
    expect(SIG_YEARS[sigYear(0)]).toBe('2022');
    expect(SIG_YEARS[sigYear(0.39)]).toBe('2022');
    expect(SIG_YEARS[sigYear(0.4)]).toBe('2023');
    expect(SIG_YEARS[sigYear(0.7)]).toBe('2026');
    expect(SIG_YEARS[sigYear(1)]).toBe('2026');
    expect(SIG_YEAR_STEPS.length + 1).toBe(SIG_YEARS.length);
  });
});

describe('sigFrame', () => {
  it('starts on the head, the card and the scattered tiles, with both captions away', () => {
    const f = sigFrame(0, DESK);
    expect(f.head.opacity).toBe('1.000');
    expect(f.card.opacity).toBe('1.000');
    expect(f.tiles.map((t) => t.transform)).toEqual(sigVars(DESK).tiles.map((t) => t.s));
    expect(f.frame.opacity).toBe('0.000');
    expect(f.capA.opacity).toBe('0.000');
    expect(f.capB.opacity).toBe('0.000');
    // Off-stage, not just transparent: its "Open app" link cannot be clicked while invisible.
    expect(f.capB.transform).toBe('translateY(100vh)');
    expect(f.year).toBe(0);
  });

  it('rings the tiles by .34 and piles them by .50 -- the same strings the CSS path reads', () => {
    expect(sigFrame(0.37, DESK).tiles.map((t) => t.transform)).toEqual(sigVars(DESK).tiles.map((t) => t.k));
    expect(sigFrame(0.51, DESK).tiles.map((t) => t.transform)).toEqual(sigVars(DESK).tiles.map((t) => t.p));
  });

  it('at .45 the head is gone, the card is fading, caption A is up and the chip reads 2023', () => {
    const f = sigFrame(0.45, DESK);
    expect(f.head.opacity).toBe('0.000');
    expect(Number(f.card.opacity)).toBeCloseTo(0.3, 3);
    expect(f.capA.opacity).toBe('1.000');
    expect(SIG_YEARS[f.year]).toBe('2023');
  });

  it('at .60 GoNai has opened from the pile and the tiles are gone', () => {
    const f = sigFrame(0.6, DESK);
    expect(f.tiles.every((t) => t.opacity === '0.000')).toBe(true);
    expect(f.frame.opacity).toBe('1.000');
    expect(f.face).toBe('1.000');
    expect(SIG_YEARS[f.year]).toBe('2025');
  });

  it('ends on the full frame, the GoNai wash and caption B', () => {
    const f = sigFrame(1, DESK);
    expect(f.frame.transform).toBe('translate(0.0px, 0.0px) scale(1.0000)');
    expect(f.tint).toBe('1.000');
    expect(f.chip).toBe('0.000');
    expect(f.capA.opacity).toBe('0.000');
    expect(f.capB).toEqual({ opacity: '1.000', transform: 'translateY(0.0px)' });
    expect(SIG_YEARS[f.year]).toBe('2026');
  });

  it('starts the frame exactly where the CSS path starts it', () => {
    expect(sigFrame(0.5, DESK).frame.transform).toBe(sigVars(DESK).frameStart);
  });
});
