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

  it('links the caption to the slide’s own sheet when it has one', () => {
    renderStage();
    const link = tour().querySelector('a.ht-q') as HTMLAnchorElement | null;
    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toBe(slides[0].href);
  });

  // Fix round 1 (Important): S-7 also reaches the tour. A slide whose project has no sheet to
  // open (Thai-only name, no Notion Slug) gets `href: null` from toTourSlides -- the caption
  // must read as plain text, not a link to the unparseable '#work/' (which would still push a
  // hash onto the URL and open nothing, ProjectSheet's own parseSheetHash rejects it).
  it('renders the caption as plain text, not a dead link, when the slide has no sheet to open (S-7)', () => {
    const noHref: TourSlide[] = [{ ...slides[0], href: null }];
    render(<HeroTourStage slides={noHref} vignette={vignette} locale="en" />);
    const caption = tour().querySelector('.ht-q') as HTMLElement;
    expect(caption.tagName).not.toBe('A');
    expect(caption.querySelector('.ht-qt')!.textContent).toBe(noHref[0].question);
    // No chevron either -- it would promise a click that does nothing (same rule as
    // ProjectsIndex's Row).
    expect(caption.querySelector('.ht-chev')).toBeNull();
  });

  // Wave-2 merge: l1's fix round 1 (#4, R25) put the Thai caption through display mode, and
  // l4's S-7 branch arrived without it. The plain-text caption is the same .t-* display tier
  // as the linked one, so its Thai tokens must stay whole keep-runs (.kt), not default .nw.
  it('keeps the plain-text (S-7) caption in Thai display mode, like the linked caption', () => {
    const thai: TourSlide[] = [{ ...slides[0], question: 'ไอเดียนี้คุ้มกับหนึ่งสุดสัปดาห์ หรือหนึ่งปี', href: null }];
    render(<HeroTourStage slides={thai} vignette={vignette} locale="th" />);
    const qt = tour().querySelector('span.ht-q .ht-qt') as HTMLElement;
    expect(qt.querySelectorAll('.kt').length).toBeGreaterThan(0);
    expect(qt.querySelector('.nw')).toBeNull();
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
    // Fix round 1 (Important #6): Replay is a one-shot action, not a
    // toggle -- it must not report a pressed state either way.
    expect(playButton().hasAttribute('aria-pressed')).toBe(false);
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

  // P1 final review I-2: a caption click during autoplay opened the sheet
  // while the tour kept playing behind it. Focus left for the sheet, the hold
  // lifted, the frame moved on and the keyed caption <a> was recreated, so
  // closing the sheet sent focus to <body> on a different frame. The caption
  // is a visitor pick now (spec §6): it stops the tour where it is.
  it('stops the tour when the caption is followed, so the same caption is still there to take focus back', () => {
    renderStage();
    inView();
    tick(1000);
    const link = tour().querySelector('a.ht-q') as HTMLAnchorElement;
    link.focus();
    fireEvent.click(link);
    expect(playButton().getAttribute('aria-label')).toBe(dict.en.tourPlay);
    // The sheet takes focus: focus leaves the tour, which no longer holds it.
    const sheet = document.body.appendChild(document.createElement('button'));
    act(() => {
      sheet.focus();
    });
    tick(30000);
    expect(selected()).toBe(0);
    expect(tour().querySelector('a.ht-q')).toBe(link);
    // Closing the sheet hands focus back to the caption it came from.
    act(() => {
      link.focus();
    });
    expect(document.activeElement).toBe(link);
    sheet.remove();
  });

  // Same review, the cheap half: while any modal dialog (a sheet, ⌘K, the
  // phone menu) is open, the tour holds instead of moving on behind it.
  it('holds while a dialog is open over the page, and picks up where it left off', async () => {
    renderStage();
    inView();
    tick(1000);
    const dialog = document.body.appendChild(document.createElement('dialog'));
    // The observer reports from a microtask; act() flushes it and the render.
    await act(async () => {
      dialog.setAttribute('open', '');
    });
    tick(20000);
    expect(selected()).toBe(0);
    await act(async () => {
      dialog.removeAttribute('open');
    });
    tick(4999);
    expect(selected()).toBe(0);
    tick(1);
    expect(selected()).toBe(1);
    dialog.remove();
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
    // Fix round 1 (found alongside #4): this must replace the ACTUAL no-break
    // space (U+00A0, not a plain ASCII space either side) -- display mode
    // (R25, now used for this Thai text) inserts one right after "นัก" and
    // before "Business" (src/lib/thai.ts's displayRuns), which the previous
    // `replace(/ /g, ' ')` here never matched (both sides were plain spaces,
    // a no-op that only "passed" because default mode happened not to emit
    // one for this particular string).
    const text = (vig.textContent ?? '').replace(/ /g, ' ');
    expect(vig.getAttribute('aria-hidden')).toBe('true');
    expect(text).toContain('Business developer who builds his own tools.');
    expect(text).toContain('นัก Business Development ที่สร้างเครื่องมือใช้เอง');
    expect(text).not.toContain('|');
    expect(vig.querySelector('img')?.getAttribute('alt')).toBe('');
  });

  // Fix round 2 (#4): the small "Title TH" preview row is forced to one
  // line on phone (nowrap + ellipsis, hero-tour-stage.css) to leave room
  // for the headline below it, which was getting clipped by the stage's
  // fixed aspect-ratio height (confirmed against the prototype: same
  // content, same overflow -- this predates P1). `white-space: nowrap`
  // only suppresses ordinary space-based wrapping; a `|`-split Thai string
  // renders as two ADJACENT keep-run spans with an explicit <wbr> between
  // them (ThaiText.tsx), and that break opportunity survives nowrap -- so
  // this row must never split the Thai text into two keep-runs, only one.
  it('keeps the Title TH preview row free of <wbr>, so nowrap can hold it to one line on phone (fix round 2 #4)', () => {
    renderStage();
    const row = tour().querySelector('.ht-vrow[data-row="th"]') as HTMLElement;
    // "นัก" is its own keep-run (a separate space-delimited Thai token) and
    // stays one either way -- what matters is that it is never ADJACENT to
    // another keep-run (only adjacency gets a <wbr> between them,
    // ThaiText.tsx), which stripping the `|` here prevents.
    expect(row.querySelector('wbr')).toBeNull();
    expect(row.textContent).not.toContain('|');
    // The big headline (.ht-vh1) is untouched: it still carries the `|`,
    // so its last two keep-runs ("ที่สร้างเครื่องมือ", "ใช้เอง") stay
    // adjacent and keep their <wbr> -- it deliberately wraps to two lines,
    // and the `|` controls where that happens.
    const heading = tour().querySelector('.ht-vh1[data-v="th"]') as HTMLElement;
    expect(heading.querySelector('wbr')).not.toBeNull();
    expect(heading.textContent).not.toContain('|');
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

  // Fix round 1 (Important #7): a browser can deliver more than one entry
  // to a single IntersectionObserver callback (coalesced threshold
  // crossings); only the LAST one is the current state.
  it('uses the last entry when the observer delivers more than one in a single callback', () => {
    renderStage();
    FakeIO.watching(stage()).fire([
      { target: stage(), intersectionRatio: 0.9, isIntersecting: true },
      { target: stage(), intersectionRatio: 0.2, isIntersecting: false },
    ]);
    tick(20000);
    expect(selected()).toBe(0); // the LAST entry (0.2) is under half: never started
    FakeIO.watching(stage()).fire([
      { target: stage(), intersectionRatio: 0.1, isIntersecting: false },
      { target: stage(), intersectionRatio: 0.9, isIntersecting: true },
    ]);
    expect(playButton().getAttribute('aria-label')).toBe(dict.en.tourPause); // the LAST entry (0.9) starts it
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
// never the pill, never the vignette") -- this reads the stylesheet as text
// (jsdom computes no CSS) so a regression that widens either exception, or
// moves the mask onto the caption pill or the klao-site vignette, fails here
// rather than only being visible on screen.
describe('hero-tour-stage.css (polish A04 + A08 exceptions)', () => {
  const CSS = readFileSync('src/components/hero-tour-stage.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

  // Extracts one `@keyframes name { ... }` block by balanced braces (a
  // flat regex can't stop at the right `}` once a block itself is
  // multi-line) -- same technique as tests/p2-css.test.ts.
  function keyframeBlock(css: string, name: string): string {
    const start = css.indexOf(`@keyframes ${name} {`);
    if (start < 0) throw new Error(`missing @keyframes ${name}`);
    let depth = 0;
    for (let i = css.indexOf('{', start); i < css.length; i++) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') {
        depth--;
        if (depth === 0) return css.slice(start, i + 1);
      }
    }
    throw new Error(`unbalanced @keyframes ${name}`);
  }
  const keyframeNames = (css: string): string[] => [...css.matchAll(/@keyframes\s+([\w-]+)\s*\{/g)].map((m) => m[1]);

  // Extracts one `@media (prelude) { ... }` block by balanced braces (same
  // technique as keyframeBlock above) -- needed to prove a rule sits INSIDE
  // a specific media query, not just somewhere in the file.
  function mediaBlock(css: string, prelude: string): string {
    const start = css.indexOf(`@media ${prelude} {`);
    if (start < 0) throw new Error(`missing @media ${prelude}`);
    let depth = 0;
    for (let i = css.indexOf('{', start); i < css.length; i++) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') {
        depth--;
        if (depth === 0) return css.slice(start, i + 1);
      }
    }
    throw new Error(`unbalanced @media ${prelude}`);
  }

  it("animates only transform/opacity via transition, except the Pause/Play glyph's clip-path", () => {
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

  // Fix round 1 (Important #10): the transition scan above never looked
  // inside @keyframes -- a keyframe that animated some other property
  // would have slipped through uncaught.
  it('animates only transform/opacity inside every @keyframes block', () => {
    const names = keyframeNames(CSS);
    expect(names.length).toBeGreaterThan(0); // the scan itself works
    for (const name of names) {
      const kf = keyframeBlock(CSS, name);
      for (const decl of kf.matchAll(/([a-z-]+)\s*:/g)) {
        expect(['opacity', 'transform'], `@keyframes ${name}: ${decl[1]}`).toContain(decl[1]);
      }
    }
  });

  // Fix round 2 (#1): the round-1 version of this test only checked that
  // SOME rule with the exact literal selector ".ht-card:has(> .ht-cam) {"
  // carried the mask, plus a few negative regexes for specific OTHER
  // selectors. Both known mutations slip past that: adding mask-image back
  // to the plain, unscoped `.ht-card {}` rule (no negative regex named it),
  // or widening the masked rule's selector list to
  // ".ht-card, .ht-card:has(> .ht-cam) {" (the literal substring the old
  // test looked for is still present, and no negative regex named a
  // selector starting with ".ht-card," either). This version instead scans
  // every rule in the file and requires that ANY one carrying mask-image
  // has EXACTLY the selector `.ht-card:has(> .ht-cam)` -- nothing more,
  // nothing less -- which both mutations fail.
  it('mask-image appears on exactly one rule, whose selector is exactly .ht-card:has(> .ht-cam) (polish A08)', () => {
    let sawRule = false;
    for (const rule of CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!/mask-image/.test(rule[2])) continue;
      const selector = rule[1].trim();
      expect(selector, `mask-image on an unexpected selector: "${selector}"`).toBe('.ht-card:has(> .ht-cam)');
      expect(rule[2]).toContain('-webkit-mask-image: linear-gradient(to bottom, #000 55%, transparent 98%);');
      expect(rule[2]).toContain('mask-image: linear-gradient(to bottom, #000 55%, transparent 98%);');
      sawRule = true;
    }
    expect(sawRule).toBe(true); // the scan itself works
  });

  // Fix round 1 (Important #3): a masked card's outer box-shadow paints
  // invisibly (the mask clips it too), so it must be declared only on the
  // card kind that is never masked -- the vignette.
  it('declares the outer lift shadow only on the unmasked (vignette) card', () => {
    expect(CSS).toContain('.ht-card:not(:has(> .ht-cam)) { box-shadow: var(--e2); }');
    expect(CSS).not.toMatch(/\.ht-card:has\(> \.ht-cam\)[^{]*\{[^}]*box-shadow/);
  });

  // Fix round 1 (Important #2): WCAG 2.4.7 -- the only tabbable dot's focus
  // ring must not be clipped by `.ht-dots`' paint containment.
  it("keeps the tab dots' focus ring inside the containing box (WCAG 2.4.7)", () => {
    expect(CSS).toContain('.ht-dot:focus-visible { outline-offset: -2px; }');
  });

  // Fix round 2 (#2): `:has()` can't tell "gone" from "CSS-hidden", so the
  // caption's padding-left must be forced to 18px (the "no Play button"
  // value) in both cases where the button is only invisible: no JS ever,
  // and reduced motion before the component's own effect removes it.
  it('keeps the pill padding at 18px while .ht-play is only CSS-hidden, not gone (fix round 2 #2)', () => {
    expect(CSS).toContain('html:not(.js) .ht-pill.glass { padding-left: 18px; }');
    const reducedBlock = mediaBlock(CSS, '(prefers-reduced-motion: reduce)');
    expect(reducedBlock).toContain('.ht-pill.glass:has(.ht-play) { padding-left: 18px; }');
  });

  // Fix round 2 (#3): without JS, the dots have no click handler and read
  // as a progress picture, not a set of dead tab buttons.
  it('makes the tab dots visually inert before JS runs (fix round 2 #3)', () => {
    expect(CSS).toContain('html:not(.js) .ht-dots { pointer-events: none; }');
  });

  // Fix round 2 (#4): truncates the decorative preview rows to one line on
  // phone, freeing the room the headline below needs. Scoped to the phone
  // media query only -- desktop's .ht-vrow has plenty of width and never
  // wraps this content in the first place (checked live at 1440px, with
  // and without this rule: identical row heights either way).
  it("truncates the vignette's preview-row values to one line on phone only (fix round 2 #4)", () => {
    const rule = '.ht-vrow > span { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }';
    const phoneBlock = mediaBlock(CSS, '(max-width: 734px)');
    expect(phoneBlock).toContain(rule);
    // Exactly one occurrence in the whole file (inside that block, just
    // shown) rules out a duplicate sneaking in outside the media query --
    // i.e. onto desktop.
    expect(CSS.split(rule).length - 1).toBe(1);
  });

  // Fix round 3: the round-2 truncation rule used a DESCENDANT selector
  // (`.ht-vrow span`), which also matched ThaiText's nested keep-run spans
  // (.nw/.kt, one level deeper inside the value span) -- an inline-block
  // given `overflow` other than `visible` takes its baseline from its
  // bottom MARGIN edge, not its text (CSS2.1 10.8.1), so "นัก" rendered
  // visibly higher than the plain text beside it. The fix is the `>` in
  // the rule above; this guards against either regressing that back to a
  // descendant selector, or reaching .nw/.kt from anywhere else.
  // Wave-2 merge: l1's fix round 1 (#5) repeats the hover underline on the
  // Thai keep-runs, and l4's S-7 fix rescoped the caption's hover rules to
  // `a.ht-q` because the no-sheet caption is a plain <span class="ht-q">.
  // Both land here: every caption hover rule -- the keep-run one included --
  // must carry the `a`, or the plain-text caption would still underline.
  it('scopes every caption hover rule, keep-run underline included, to the link a.ht-q (S-7 + fix round 1 #5)', () => {
    expect(CSS).toContain('a.ht-q:hover .ht-qt { text-decoration: underline;');
    expect(CSS).toContain('a.ht-q:hover .ht-qt :is(.nw, .kt) { text-decoration: underline;');
    expect(CSS).toContain('a.ht-q:hover .ht-chev {');
    // No hover selector on the bare class anywhere (preceded by anything but `a`).
    expect(CSS).not.toMatch(/(^|[^a])\.ht-q:hover/m);
  });

  it('never gives overflow other than visible to a nested keep-run span, or to any bare descendant span of .ht-vrow (fix round 3)', () => {
    for (const rule of CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      // (?<!-) excludes `text-overflow:`, a different property entirely.
      if (!/(?<!-)overflow\s*:\s*(?!visible\b)/.test(rule[2])) continue;
      const selector = rule[1].trim();
      expect(selector, `overflow reaches a keep-run span: "${selector}"`).not.toMatch(/\.nw\b|\.kt\b/);
      expect(selector, `overflow reaches .ht-vrow's spans via a descendant (not child) selector: "${selector}"`).not.toMatch(
        /\.ht-vrow\s+span\b/,
      );
    }
  });
});
