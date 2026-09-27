// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HeroTourStage from '@/components/HeroTourStage';
import { dict } from '@/lib/dictionary';
import type { TourSlide, TourVignette } from '@/lib/project-tour';
import { FakeIO, installFakeIO } from './helpers/io';
import { stubMatchMedia } from './helpers/media';
import { tick } from './helpers/time';

const slides: TourSlide[] = [
  {
    id: 'aje',
    name: 'Aje',
    kicker: 'Aje · Working prototype',
    question: 'Is this idea worth a weekend, or a year?',
    href: '#work',
    media: 'img',
    src: '/images/aje.jpg',
    alt: 'Aje review screen.',
    wash: 'aje',
    dwellMs: 6000,
  },
  {
    id: 'gonai',
    name: 'GoNai',
    kicker: 'GoNai · Live · gonai-three.vercel.app',
    question: 'One day in Bangkok — what’s the real budget?',
    href: '#work',
    media: 'img',
    src: '/images/gonai.jpg',
    alt: 'GoNai home screen.',
    wash: 'gonai',
    dwellMs: 5500,
  },
  {
    id: 'site',
    name: 'klao-site',
    kicker: 'klao-site · This site',
    question: 'Can a personal site update itself from Notion, in two languages?',
    href: '#work',
    media: 'notion',
    src: null,
    alt: '',
    wash: 'site',
    dwellMs: 7000,
  },
];
const vignette: TourVignette = {
  titleEn: 'Business developer who builds his own tools.',
  titleTh: 'นัก Business Development ที่สร้างเครื่องมือ|ใช้เอง',
  photoSrc: '/images/portrait.jpg',
};

beforeEach(() => {
  vi.useFakeTimers();
  stubMatchMedia();
  installFakeIO();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const renderStage = (locale: 'en' | 'th' = 'en') => render(<HeroTourStage slides={slides} vignette={vignette} locale={locale} />);
const tour = () => document.getElementById('tour') as HTMLElement;
const stage = () => tour().querySelector('.ht-stage') as HTMLElement;
const frames = () => Array.from(tour().querySelectorAll('.ht-slide'));
const tabs = () => within(tour()).getAllByRole('tab');
const selected = () => tabs().findIndex((b) => b.getAttribute('aria-selected') === 'true');
const question = () => tour().querySelector('.ht-qt')!.textContent;
const kicker = () => tour().querySelector('.ht-k')!.textContent;
const playButton = () => tour().querySelector('.ht-play') as HTMLButtonElement;
const inView = (ratio = 1) => FakeIO.watching(stage()).fire([{ target: stage(), intersectionRatio: ratio, isIntersecting: ratio > 0 }]);

describe('HeroTourStage', () => {
  it('opens on the first frame with its subtitle, before anything plays', () => {
    renderStage();
    expect(frames()).toHaveLength(3);
    expect(frames()[0].hasAttribute('data-on')).toBe(true);
    expect(frames()[1].hasAttribute('data-on')).toBe(false);
    expect(question()).toBe(slides[0].question);
    expect(kicker()).toBe('Aje · Working prototype');
    expect(selected()).toBe(0);
    expect(playButton().getAttribute('aria-label')).toBe(dict.en.tourPlay);
  });

  it('is a labelled carousel of slides, each tab pointing at its slide', () => {
    renderStage();
    expect(tour().getAttribute('aria-roledescription')).toBe('carousel');
    expect(tour().getAttribute('aria-label')).toBe(dict.en.tourListLabel);
    expect(frames()[0].getAttribute('aria-roledescription')).toBe('slide');
    expect(frames()[0].getAttribute('aria-label')).toBe('1 of 3');
    expect(within(tour()).getByRole('tablist').getAttribute('aria-label')).toBe(dict.en.tourChapters);
    expect(tabs()[1].getAttribute('aria-label')).toBe('GoNai · 2 of 3');
    expect(tabs()[1].getAttribute('aria-controls')).toBe(frames()[1].id);
  });

  it('starts by itself once at least half of the stage is in view', () => {
    renderStage();
    tick(20000);
    expect(selected()).toBe(0); // not in view yet
    inView(0.4);
    tick(20000);
    expect(selected()).toBe(0); // under half
    inView(0.6);
    expect(playButton().getAttribute('aria-label')).toBe(dict.en.tourPause);
  });

  it('advances on each frame’s own clock, the new frame fading in on top of the old one', () => {
    renderStage();
    inView();
    tick(5999);
    expect(selected()).toBe(0);
    tick(1);
    expect(selected()).toBe(1);
    const [aje, gonai] = frames();
    expect(gonai.hasAttribute('data-top')).toBe(true); // fading in on top
    expect(aje.hasAttribute('data-on')).toBe(true); // still showing underneath — no 50/50 blend
    expect(aje.hasAttribute('data-top')).toBe(false);
    tick(800);
    expect(aje.hasAttribute('data-on')).toBe(false); // dropped once the fade is over
    expect(question()).toBe(slides[1].question);
    tick(5500 - 800 - 1);
    expect(selected()).toBe(1);
    tick(1);
    expect(selected()).toBe(2);
  });

  it('plays once: ends on the last frame with the closing subtitle and a replay button', () => {
    renderStage();
    inView();
    tick(6000 + 5500 + 7000);
    expect(selected()).toBe(2);
    expect(question()).toBe(dict.en.tourEndTitle);
    expect(tour().querySelector('.ht-q')!.getAttribute('href')).toBe('#signature');
    expect(kicker()).toBe(dict.en.tourEndKicker);
    expect(playButton().getAttribute('aria-label')).toBe(dict.en.tourReplay);
    expect(tabs().every((b) => b.hasAttribute('data-done'))).toBe(true);
    tick(60000);
    expect(selected()).toBe(2); // never wraps
  });

  it('replays from the first frame', () => {
    renderStage();
    inView();
    tick(18500);
    fireEvent.click(playButton());
    expect(selected()).toBe(0);
    expect(playButton().getAttribute('aria-label')).toBe(dict.en.tourPause);
    tick(6000);
    expect(selected()).toBe(1);
  });

  it('puts Pause first in the tab order, and resumes with the time that was left', () => {
    renderStage();
    inView();
    expect(tour().querySelectorAll('a[href], button')[0]).toBe(playButton());
    tick(2000);
    fireEvent.click(playButton());
    expect(playButton().getAttribute('aria-label')).toBe(dict.en.tourPlay);
    tick(30000);
    expect(selected()).toBe(0);
    fireEvent.click(playButton());
    tick(3999);
    expect(selected()).toBe(0);
    tick(1);
    expect(selected()).toBe(1);
  });

  it('holds while the pointer is over the stage, on devices that hover', () => {
    stubMatchMedia((q) => q === '(hover: hover)');
    renderStage();
    inView();
    tick(1000);
    fireEvent.pointerEnter(stage());
    tick(20000);
    expect(selected()).toBe(0);
    fireEvent.pointerLeave(stage());
    tick(4999);
    expect(selected()).toBe(0);
    tick(1);
    expect(selected()).toBe(1);
  });

  it('holds while focus is inside the tour, except on the Pause button itself', () => {
    renderStage();
    inView();
    tick(1000);
    fireEvent.focus(tabs()[0]);
    tick(20000);
    expect(selected()).toBe(0);
    fireEvent.blur(tabs()[0]);
    fireEvent.focus(playButton());
    tick(5000);
    expect(selected()).toBe(1);
  });

  it('holds while the browser tab is hidden', () => {
    let hidden = false;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    try {
      renderStage();
      inView();
      tick(1000);
      hidden = true;
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      tick(20000);
      expect(selected()).toBe(0);
      hidden = false;
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      tick(5000);
      expect(selected()).toBe(1);
    } finally {
      Reflect.deleteProperty(document, 'hidden');
    }
  });

  it('holds while scrolled out of view, and picks up where it left off', () => {
    renderStage();
    inView();
    tick(1000);
    inView(0);
    tick(20000);
    expect(selected()).toBe(0);
    inView(1);
    tick(5000);
    expect(selected()).toBe(1);
  });

  it('lets the visitor pick a frame: the tour stops there, and Play carries on from it', () => {
    renderStage();
    inView();
    tick(1000);
    fireEvent.click(tabs()[2]);
    expect(selected()).toBe(2);
    expect(playButton().getAttribute('aria-label')).toBe(dict.en.tourPlay);
    expect(question()).toBe(slides[2].question); // the frame's own subtitle, not the ending
    tick(30000);
    expect(selected()).toBe(2);
    fireEvent.click(playButton());
    expect(playButton().getAttribute('aria-label')).toBe(dict.en.tourPause);
    tick(7000);
    expect(question()).toBe(dict.en.tourEndTitle);
  });

  it('moves with the arrow keys, Home and End, taking focus along (roving tabindex)', () => {
    renderStage();
    const list = within(tour()).getByRole('tablist');
    tabs()[0].focus();
    fireEvent.keyDown(list, { key: 'ArrowRight' });
    expect(selected()).toBe(1);
    expect(document.activeElement).toBe(tabs()[1]);
    expect(tabs()[1].tabIndex).toBe(0);
    expect(tabs()[0].tabIndex).toBe(-1);
    fireEvent.keyDown(list, { key: 'End' });
    expect(selected()).toBe(2);
    fireEvent.keyDown(list, { key: 'ArrowRight' });
    expect(selected()).toBe(0); // a visitor's step wraps; only autoplay stops at the end
    fireEvent.keyDown(list, { key: 'ArrowLeft' });
    expect(selected()).toBe(2);
    fireEvent.keyDown(list, { key: 'Home' });
    expect(selected()).toBe(0);
  });

  it('swipes sideways on the stage, and ignores a mostly vertical drag (a scroll)', () => {
    renderStage();
    fireEvent.pointerDown(stage(), { clientX: 300, clientY: 100 });
    fireEvent.pointerUp(stage(), { clientX: 200, clientY: 110 });
    expect(selected()).toBe(1);
    fireEvent.pointerDown(stage(), { clientX: 100, clientY: 100 });
    fireEvent.pointerUp(stage(), { clientX: 180, clientY: 100 });
    expect(selected()).toBe(0);
    fireEvent.pointerDown(stage(), { clientX: 100, clientY: 100 });
    fireEvent.pointerUp(stage(), { clientX: 150, clientY: 300 });
    expect(selected()).toBe(0);
  });

  it('under reduced motion never autoplays and shows ‹ › instead of Pause; every frame stays reachable', () => {
    stubMatchMedia((q) => q === '(prefers-reduced-motion: reduce)');
    renderStage();
    inView();
    tick(60000);
    expect(selected()).toBe(0);
    expect(tour().querySelector('.ht-play')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: dict.en.tourNext }));
    expect(selected()).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: dict.en.tourPrev }));
    fireEvent.click(screen.getByRole('button', { name: dict.en.tourPrev }));
    expect(selected()).toBe(2);
  });

  it('does not autoplay when the visitor asked to save data', () => {
    vi.stubGlobal('navigator', { connection: { saveData: true } });
    renderStage();
    inView();
    tick(20000);
    expect(selected()).toBe(0);
    expect(playButton().getAttribute('aria-label')).toBe(dict.en.tourPlay);
  });

  it('keeps the subtitle quiet while autoplaying, and announces it when the visitor drives', () => {
    renderStage();
    const live = () => tour().querySelector('.ht-cap')!.getAttribute('aria-live');
    expect(live()).toBe('polite');
    inView();
    expect(live()).toBe('off');
    fireEvent.click(tabs()[1]);
    expect(live()).toBe('polite');
  });

  it('runs the camera push and the progress fill only while autoplaying, sized to the frame', () => {
    renderStage();
    const img = () => frames()[0].querySelector('img')!;
    const fill = () => tabs()[0].querySelector('b')!;
    expect(img().hasAttribute('data-run')).toBe(false);
    inView();
    expect(img().hasAttribute('data-run')).toBe(true);
    expect(img().style.getPropertyValue('--ht-cam-ms')).toBe('6700ms');
    expect(fill().hasAttribute('data-run')).toBe(true);
    expect(fill().style.getPropertyValue('--ht-ms')).toBe('6000ms');
    fireEvent.click(playButton()); // pause: the animations stay, frozen by data-hold
    expect(tour().hasAttribute('data-hold')).toBe(true);
    fireEvent.click(tabs()[1]); // manual: nothing runs
    expect(tour().querySelector('[data-run]')).toBeNull();
  });

  it('loads the first frame eagerly at high priority and the rest lazily, all with fixed dimensions', () => {
    renderStage();
    const imgs = Array.from(tour().querySelectorAll('img.ht-cam'));
    expect(imgs[0].getAttribute('loading')).toBe('eager');
    expect(imgs[0].getAttribute('fetchpriority')).toBe('high');
    expect(imgs[1].getAttribute('loading')).toBe('lazy');
    for (const img of imgs) {
      expect(img.getAttribute('width')).toBe('1580');
      expect(img.getAttribute('height')).toBe('900');
    }
    expect(imgs[0].getAttribute('alt')).toBe('Aje review screen.');
  });

  it('ends on the klao-site Notion-row vignette: the headline in both languages, decorative for screen readers', () => {
    renderStage();
    const vig = tour().querySelector('.ht-vig') as HTMLElement;
    const text = (vig.textContent ?? '').replace(/ /g, ' '); // keep-runs (C3) may use no-break spaces
    expect(vig.getAttribute('aria-hidden')).toBe('true');
    expect(text).toContain('Business developer who builds his own tools.');
    expect(text).toContain('นัก Business Development ที่สร้างเครื่องมือใช้เอง');
    expect(text).not.toContain('|');
    expect(vig.querySelector('img')?.getAttribute('alt')).toBe('');
  });

  it('plays the vignette beat (EN, then TH) only while the tour runs, and rests on TH otherwise', () => {
    renderStage();
    const beat = () => tour().querySelector('.ht-vig')!.getAttribute('data-beat');
    expect(beat()).toBe('en');
    inView();
    tick(6000 + 5500);
    expect(beat()).toBe('play');
    tick(7000);
    expect(beat()).toBe('th');
  });

  it('with a single frame shows just the frame and its subtitle: no dots, no Play, no autoplay', () => {
    render(<HeroTourStage slides={[slides[0]]} vignette={vignette} locale="en" />);
    expect(tour().querySelector('[role="tablist"]')).toBeNull();
    expect(tour().querySelector('.ht-play')).toBeNull();
    inView();
    tick(20000);
    expect(question()).toBe(slides[0].question);
  });

  it('speaks Thai', () => {
    renderStage('th');
    expect(tour().getAttribute('aria-label')).toBe(dict.th.tourListLabel);
    expect(tabs()[0].getAttribute('aria-label')).toBe('Aje · 1 จาก 3');
    expect(playButton().getAttribute('aria-label')).toBe(dict.th.tourPlay);
  });

  // Polish amendment A04: the Pause/Play control is one clip-path morph, not
  // an icon swap. aria-pressed is a second, independent signal from the
  // label -- it reflects the tour-player phase 'paused' specifically (not
  // "idle" or "manual", which also show a Play-looking glyph and label).
  it('flips the label and aria-pressed when Pause is clicked (polish A04)', () => {
    renderStage();
    inView(); // autoplay starts: phase 'playing'
    expect(playButton().getAttribute('aria-label')).toBe(dict.en.tourPause);
    expect(playButton().getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(playButton());
    expect(playButton().getAttribute('aria-label')).toBe(dict.en.tourPlay);
    expect(playButton().getAttribute('aria-pressed')).toBe('true'); // phase 'paused'
    fireEvent.click(playButton());
    expect(playButton().getAttribute('aria-label')).toBe(dict.en.tourPause);
    expect(playButton().getAttribute('aria-pressed')).toBe('false');
  });
});

// Polish amendments A04 (Pause/Play clip-path morph) and A08 (screenshot
// fade). Both are named exceptions to the master Global Constraint ("only
// transform and opacity animate") and a placement rule ("mask the frame,
// never the pill") -- this reads the stylesheet as text (jsdom computes no
// CSS) so a regression that widens either exception, or moves the mask onto
// the caption pill, fails here rather than only being visible on screen.
describe('hero-tour-stage.css (polish A04 + A08 exceptions)', () => {
  const CSS = readFileSync('src/components/hero-tour-stage.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

  it("animates only transform/opacity, except the Pause/Play glyph's clip-path", () => {
    let sawException = false;
    for (const rule of CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selector = rule[1].trim();
      for (const decl of rule[2].matchAll(/transition\s*:\s*([^;]+);/g)) {
        for (const part of decl[1].split(',')) {
          const prop = part.trim().split(/\s+/)[0];
          if (prop === 'none') continue;
          if (prop === 'clip-path') {
            // The exception is real (this test would pass vacuously if the
            // rule were ever deleted) and stays scoped to the glyph.
            expect(selector, `clip-path transition outside .ht-pp: ${selector}`).toContain('.ht-pp');
            sawException = true;
            continue;
          }
          expect(['transform', 'opacity'], `${selector} transitions ${prop}`).toContain(prop);
        }
      }
    }
    expect(sawException).toBe(true);
  });

  it('fades the screenshot frame into the page, never the pill (polish A08)', () => {
    const frameRule = CSS.slice(CSS.indexOf('.ht-card {'), CSS.indexOf('.ht-card::after'));
    expect(frameRule).toContain('-webkit-mask-image: linear-gradient(to bottom, #000 55%, transparent 98%);');
    expect(frameRule).toContain('mask-image: linear-gradient(to bottom, #000 55%, transparent 98%);');
    expect(CSS).not.toMatch(/\.ht-pill[^{]*\{[^}]*mask-image/);
  });
});
