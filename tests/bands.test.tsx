// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AboutBand from '@/components/sections/AboutBand';
import CraftBand from '@/components/sections/CraftBand';
import { dict } from '@/lib/dictionary';
import type { Profile } from '@/lib/models';

// No RTL auto-cleanup is wired up in this project (no setupFiles in
// vitest.config.ts) -- tests/hero.test.tsx and tests/particle-field.test.tsx
// hit the same thing. Without this, render() output from an earlier test
// stays attached to document.body and screen.getByText(...) -- which
// queries the whole document -- can match leftover nodes from a previous
// test in this file, throwing getMultipleElementsFoundError.
afterEach(cleanup);

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
});

const profile: Profile = {
  name: 'Suwichak Jarunopratamp',
  headline: { en: 'I close the deal and ship the thing.', th: 'ผมปิดดีลเอง แล้วสร้างของเอง' },
  byline: { en: 'BD who builds his own tools.', th: 'BD ที่สร้างเครื่องมือเอง' },
  now: { en: 'Building klao-site.', th: 'กำลังสร้าง klao-site' },
  email: 'real@example.com',
  photoSrc: '',
  linkedin: '',
  github: '',
  resumeUrl: '',
  clients: [],
  nameNative: null,
};

describe('CraftBand', () => {
  it('renders all six imperatives for the active locale only', () => {
    render(<CraftBand locale="th" />);
    for (const line of dict.th.craft) expect(screen.getByText(line)).toBeTruthy();
    // The other language must not be in the DOM at all -- that is the whole
    // point of rendering per-locale on the server.
    for (const line of dict.en.craft) expect(screen.queryByText(line)).toBeNull();
  });

  it('marks the imperatives up as a list', () => {
    const { container } = render(<CraftBand locale="en" />);
    expect(container.querySelectorAll('li')).toHaveLength(6);
  });

  it('renders a real heading whose text is not the dictionary imperative label', () => {
    // Regression guard, kept from an earlier eyebrow-vs-heading test: an
    // earlier draft of CraftBand rendered t.howIWork as both an eyebrow <p>
    // and the MaskedHeading text, which made screen.getByText(t.howIWork)
    // ambiguous and threw away the reference design's real heading copy
    // ("Six things I will not trade away."). The eyebrow itself is gone now
    // (task 4, eyebrow diet) but the heading must still stand alone.
    const { container } = render(<CraftBand locale="en" />);
    const heading = container.querySelector('h2')?.textContent;
    expect(heading).toBeTruthy();
    expect(heading).not.toBe(dict.en.howIWork);
  });

  it('highlights only the first imperative, keeping the rest soft', () => {
    // Color no longer comes from a Tailwind utility swapped per index --
    // CraftBand now renders through SpotlightList, which marks the
    // emphasized line with the `spot-on` class and leaves spotlight.css to
    // carry the color/opacity transition, driven by scroll position client-
    // side (T4). Server markup still emphasizes item 0 by default.
    const { container } = render(<CraftBand locale="en" />);
    const items = container.querySelectorAll('li');
    expect(items[0].classList.contains('spot-on')).toBe(true);
    for (const item of Array.from(items).slice(1)) {
      expect(item.classList.contains('spot')).toBe(true);
      expect(item.classList.contains('spot-on')).toBe(false);
    }
  });

  it('switches the heading and every imperative to Thai when locale is th', () => {
    const { container } = render(<CraftBand locale="th" />);
    expect(container.querySelector('h2')?.textContent).toBe(dict.th.craftHeading);
    for (const line of dict.th.craft) expect(screen.getByText(line)).toBeTruthy();
    // No English heading or imperative leaked through.
    expect(screen.queryByText(dict.en.craftHeading)).toBeNull();
  });

  it('renders the English heading text, not a locale-blind copy of it', () => {
    // Distinct from the "distinct text" test above: this pins the heading
    // to its actual expected value per locale, so a mutation that hardcodes
    // dict.en.craftHeading regardless of `locale` -- which would still pass
    // "distinct from eyebrow" in a th render, since the eyebrow itself
    // switches to Thai -- gets caught here.
    const { container } = render(<CraftBand locale="en" />);
    expect(container.querySelector('h2')?.textContent).toBe(dict.en.craftHeading);
  });

});

describe('AboutBand', () => {
  it('renders the three story beats', () => {
    // This repo has no jest-dom matchers wired up (no toBeInTheDocument
    // anywhere else in the tree -- see tests/work-grid.test.tsx) --
    // getByText itself already throws if no match is found, so toBeTruthy()
    // here matches the rest of this file's style.
    render(<AboutBand profile={profile} locale="en" />);
    expect(screen.getByText(/A Bun Dance/)).toBeTruthy();
    expect(screen.getByText(/VELA/)).toBeTruthy();
    expect(screen.getByText(/ActMedia/)).toBeTruthy();
  });

  it('sources the current-focus line from profile.now, not invented static copy', () => {
    // Exact string match, not a RegExp built from live data: profile.now.en
    // ends in a period, which is a regex metacharacter (wildcard) -- a
    // RegExp built from arbitrary profile text can match more than the
    // literal string it was meant to find.
    render(<AboutBand profile={profile} locale="en" />);
    expect(screen.getByText(profile.now.en)).toBeTruthy();
  });

  it('omits the now line entirely when profile.now is empty for the locale', () => {
    const noNow: Profile = { ...profile, now: { en: '', th: '' } };
    const { container } = render(<AboutBand profile={noNow} locale="en" />);
    // t.now (the "Now:" label) must not render as a dangling label with
    // nothing after it.
    expect(screen.queryByText(new RegExp(`^${dict.en.now}:`))).toBeNull();
    // The story beats render as <span>s inside an <ol>, not <p>s -- the
    // "Now:" paragraph is the only <p> the prose column ever produces, so
    // it's entirely absent when profile.now is empty for this locale.
    expect(container.querySelector('[data-prose]')?.querySelectorAll('p')).toHaveLength(0);
  });

  it('caps the prose column width so it never exceeds the reading measure', () => {
    const { container } = render(<AboutBand profile={profile} locale="en" />);
    expect(container.querySelector('[data-prose]')?.className).toContain('max-w-[68ch]');
  });

  it('renders the big heading with correctly localized text', () => {
    const { container } = render(<AboutBand profile={profile} locale="en" />);
    const heading = container.querySelector('h2')?.textContent;
    expect(heading).toBe(dict.en.aboutHeading);
  });

  it('renders only the active locale -- the other language is entirely absent from the DOM', () => {
    const { container } = render(<AboutBand profile={profile} locale="th" />);
    // Dictionary-sourced structural copy (heading + sub-head)
    expect(screen.queryByText(dict.en.aboutHeading)).toBeNull();
    expect(screen.queryByText(dict.en.aboutSubhead)).toBeNull();
    // Dictionary-sourced story beats
    for (const beat of dict.en.aboutStory) expect(screen.queryByText(beat)).toBeNull();
    // Profile-sourced "now" line -- exact string match, not a RegExp built
    // from live data (profile.now.en ends in a period, a regex metacharacter).
    expect(screen.queryByText(profile.now.en)).toBeNull();
    // Thai equivalents are present, including the correctly localized
    // heading and sub-head (not just "some non-English text").
    expect(container.querySelector('h2')?.textContent).toBe(dict.th.aboutHeading);
    expect(container.querySelector('h3')?.textContent).toBe(dict.th.aboutSubhead);
    for (const beat of dict.th.aboutStory) expect(screen.getByText(beat)).toBeTruthy();
  });
});
