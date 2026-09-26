// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HeroTour from '@/components/sections/HeroTour';
import projectsFixture from '@/content/fixtures/projects.json';
import { dict } from '@/lib/dictionary';
import type { Project } from '@/lib/models';
import { FakeIO, installFakeIO } from './helpers/io';
import { stubMatchMedia } from './helpers/media';
import { makeProfile } from './helpers/profile';
import { tick } from './helpers/time';

const projects = projectsFixture as Project[];
const profile = makeProfile();

beforeEach(() => {
  stubMatchMedia();
  installFakeIO();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const top = () => document.getElementById('top') as HTMLElement;
const h1 = () => screen.getByRole('heading', { level: 1 });

describe('HeroTour', () => {
  it('is the #top section: greeting chip, the headline as the page h1, and the Now line under it', () => {
    render(<HeroTour profile={profile} projects={projects} locale="en" />);
    expect(h1().textContent).toBe(profile.headline.en);
    expect(h1().classList.contains('t-hero')).toBe(true);
    expect(top().getAttribute('aria-labelledby')).toBe(h1().id);
    expect(top().querySelector('.ht-hi')?.textContent).toBe("Hi, I'm Suwichak");
    expect(top().querySelector('.ht-hi img')?.getAttribute('alt')).toBe('');
    expect(top().querySelector('.ht-sub')?.textContent).toBe(profile.now.en);
  });

  it('offers the two actions: a mailto with the site subject, and the résumé in a new tab', () => {
    render(<HeroTour profile={profile} projects={projects} locale="en" />);
    const row = document.getElementById('hero-cta')!;
    const [mail, resume] = Array.from(row.querySelectorAll('a'));
    expect(mail.textContent).toBe(dict.en.startConversation);
    expect(mail.getAttribute('href')).toBe('mailto:klao@example.com?subject=Hello%20from%20klao-site');
    expect(mail.classList.contains('btn-fill')).toBe(true);
    expect(resume.textContent).toBe(dict.en.resumePdf);
    expect(resume.getAttribute('href')).toBe('/resume.pdf');
    expect(resume.getAttribute('target')).toBe('_blank');
  });

  it('drops an action it has no data for, the whole row when it has neither, and the photo when there is none', () => {
    render(<HeroTour profile={makeProfile({ resumeUrl: null })} projects={projects} locale="en" />);
    expect(document.getElementById('hero-cta')!.querySelectorAll('a')).toHaveLength(1);
    cleanup();
    render(<HeroTour profile={makeProfile({ email: '', resumeUrl: null, photoSrc: null })} projects={projects} locale="en" />);
    expect(document.getElementById('hero-cta')).toBeNull();
    expect(top().querySelector('.ht-hi img')).toBeNull();
  });

  it('omits the Now line when Profile has none in this language', () => {
    render(<HeroTour profile={makeProfile({ now: { en: '', th: '' } })} projects={projects} locale="en" />);
    expect(top().querySelector('.ht-sub')).toBeNull();
  });

  it('keeps the "|" break mark out of the Thai headline and holds keep-words together', () => {
    render(<HeroTour profile={profile} projects={projects} locale="th" />);
    // Normalise no-break spaces: keep-runs (C3) may join words with U+00A0.
    const plain = (s: string | null | undefined) => (s ?? '').replace(/ /g, ' ');
    expect(plain(h1().textContent)).toBe('นัก Business Development ที่สร้างเครื่องมือใช้เอง');
    // The h1 is `.t-hero`, so R25 has it pass `display` to ThaiText (every
    // space-delimited Thai token kept whole, not just the fixed keep-list
    // words `.nw` covers) -- its keep spans are `.kt`, not `.nw` (see
    // ThaiText.tsx's keepClass and globals.css's `.kt`/`.nw` rules).
    expect(h1().querySelector('.kt')).not.toBeNull();
    expect(plain(top().querySelector('.ht-hi')?.textContent)).toBe('สวัสดีครับ ผม Suwichak');
  });

  it('shows the tour under the copy, playing the fixture lineup Aje → GoNai → klao-site', () => {
    render(<HeroTour profile={profile} projects={projects} locale="en" />);
    const tour = document.getElementById('tour')!;
    expect(top().contains(tour)).toBe(true);
    expect(Array.from(tour.querySelectorAll('[role="tab"]')).map((b) => b.getAttribute('aria-label'))).toEqual([
      'Aje · 1 of 3',
      'GoNai · 2 of 3',
      'klao-site · 3 of 3',
    ]);
  });

  it('gives Thai visitors 10 % longer on each frame', () => {
    vi.useFakeTimers();
    render(<HeroTour profile={profile} projects={projects} locale="th" />);
    const stage = document.querySelector('.ht-stage')!;
    FakeIO.watching(stage).fire([{ target: stage, intersectionRatio: 1, isIntersecting: true }]);
    const selected = () =>
      Array.from(document.querySelectorAll('[role="tab"]')).findIndex((b) => b.getAttribute('aria-selected') === 'true');
    tick(6599);
    expect(selected()).toBe(0);
    tick(1);
    expect(selected()).toBe(1);
  });

  it('leaves the stage out entirely when no project can be toured (Review Focus #1)', () => {
    render(<HeroTour profile={profile} projects={projects.filter((p) => p.type === 'business')} locale="en" />);
    expect(document.getElementById('tour')).toBeNull();
    expect(h1()).toBeTruthy();
  });

  it('server HTML already shows the headline, both actions and the first frame with its subtitle, nothing parked at opacity 0 (Review Focus #4)', () => {
    const html = renderToStaticMarkup(<HeroTour profile={profile} projects={projects} locale="en" />);
    expect(html).toContain('Business developer who builds his own tools.');
    expect(html).toContain('mailto:klao@example.com?subject=Hello%20from%20klao-site');
    expect(html).toContain('Is this idea worth a weekend, or a year?');
    expect(html).toContain('Aje · Working prototype');
    // React 19's static-markup serializer writes this attribute as
    // `fetchPriority` verbatim (unlike the client DOM, which normalises it
    // to the HTML attribute name `fetchpriority` -- see
    // tests/hero-tour-stage.test.tsx's `getAttribute('fetchpriority')` after
    // a real render()); HTML attribute names are case-insensitive, so this
    // matches either casing.
    expect(html).toMatch(/<img[^>]*src="\/images\/aje\.jpg"[^>]*fetchpriority="high"/i);
    expect(html).toContain('data-on=""');
    expect(html).not.toMatch(/opacity:\s*0/);
    expect(html).not.toContain('data-top');
  });
});
