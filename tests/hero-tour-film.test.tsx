// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HeroTourStage from '@/components/HeroTourStage';
import HeroTour from '@/components/sections/HeroTour';
import projectsFixture from '@/content/fixtures/projects.json';
import { dict } from '@/lib/dictionary';
import type { Locale, Project } from '@/lib/models';
import { toTourSlides, type TourVignette } from '@/lib/project-tour';
import { FakeIO, installFakeIO } from './helpers/io';
import { stubMatchMedia } from './helpers/media';
import { makeProfile } from './helpers/profile';
import { tick } from './helpers/time';

// The Film button in the tour pill (spec 2026-10-01-film-og §4.1): plain server markup, a real
// link to the 16:9 file without JavaScript, named for what it does, and a visitor pick that
// stops the tour like a caption click.

const projects = projectsFixture as Project[];
const profile = makeProfile();
const vignette: TourVignette = { titleEn: 'Business developer who builds his own tools.', titleTh: 'นัก Business Development ที่สร้างเครื่องมือ|ใช้เอง', photoSrc: null };

beforeEach(() => {
  stubMatchMedia();
  installFakeIO();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html');
const filmTag = (html: string) => html.match(/<a\b[^>]*class="[^"]*\bht-film\b[^"]*"[^>]*>/)?.[0] ?? '';

describe('Film button: server render', () => {
  it.each([
    ['en', '/film/film-en.mp4', 'Watch a 40-second film of the work', 'Film · 0:40'],
    ['th', '/film/film-th.mp4', 'ดูฟิล์มสรุปผลงาน 40 วินาที', 'ฟิล์ม · 0:40'],
  ] as const)('%s: an <a class="ht-film" data-film> to the 16:9 file, named, with its label and a hidden glyph', (locale, href, label, text) => {
    const html = renderToString(<HeroTour profile={profile} projects={projects} locale={locale} />);
    const tag = filmTag(html);
    expect(tag).toMatch(/^<a\b/);
    expect(tag).toMatch(/\sdata-film(="[^"]*")?[\s>]/);
    expect(tag).toContain(`href="${href}"`);
    expect(tag).toContain(`aria-label="${label}"`);
    const a = parse(html).querySelector('a.ht-film')!;
    expect(a.textContent!.replace(/ /g, ' ')).toBe(text);
    expect(a.getAttribute('aria-label')).toBe(dict[locale].filmButtonLabel);
    // A frame glyph, decorative -- never the tour's Play/Pause glyph (.ht-pp) or its Replay.
    const svg = a.querySelector('svg')!;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(a.querySelector('.ht-pp')).toBeNull();
  });

  it('sits inside the pill, after the dots', () => {
    const doc = parse(renderToString(<HeroTour profile={profile} projects={projects} locale="en" />));
    const pill = doc.querySelector('.ht-pill')!;
    const film = pill.querySelector('a.ht-film')!;
    const dots = pill.querySelector('.ht-dots')!;
    expect(film).not.toBeNull();
    expect(film.parentElement).toBe(pill);
    expect(dots.compareDocumentPosition(film) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('is there with one frame only (no dots, no Play)', () => {
    const one = toTourSlides(projects, 'en').slice(0, 1);
    const doc = parse(renderToString(<HeroTourStage slides={one} vignette={vignette} locale="en" />));
    expect(doc.querySelector('.ht-dots')).toBeNull();
    expect(doc.querySelector('.ht-pill a.ht-film')?.getAttribute('href')).toBe('/film/film-en.mp4');
  });
});

describe('Film button: in the browser', () => {
  const renderStage = (locale: Locale = 'en') => render(<HeroTourStage slides={toTourSlides(projects, locale)} vignette={vignette} locale={locale} />);
  const film = () => document.querySelector('a.ht-film') as HTMLAnchorElement;
  const playButton = () => document.querySelector('.ht-play') as HTMLButtonElement;
  const selected = () => Array.from(document.querySelectorAll('.ht-dot')).findIndex((d) => d.getAttribute('aria-selected') === 'true');

  it('stays under reduced motion, where Play is gone', () => {
    stubMatchMedia((q) => q === '(prefers-reduced-motion: reduce)');
    renderStage();
    expect(document.querySelector('.ht-play')).toBeNull();
    expect(film()).not.toBeNull();
  });

  it('a click stops the tour on its current frame, like a caption click', () => {
    vi.useFakeTimers();
    renderStage();
    const stage = document.querySelector('.ht-stage') as HTMLElement;
    FakeIO.watching(stage).fire([{ target: stage, intersectionRatio: 1, isIntersecting: true }]);
    tick(1000);
    expect(playButton().getAttribute('aria-label')).toBe(dict.en.tourPause);
    // jsdom cannot navigate to the file; the sheet (not mounted here) is what prevents it for real.
    document.addEventListener('click', (e) => e.preventDefault(), { once: true });
    fireEvent.click(film());
    expect(playButton().getAttribute('aria-label')).toBe(dict.en.tourPlay);
    tick(30000);
    expect(selected()).toBe(0);
  });
});
