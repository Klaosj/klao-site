// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AboutBand, { ABOUT_HEADING, ABOUT_SUBHEAD } from '@/components/sections/AboutBand';
import CraftBand, { CRAFT_HEADING } from '@/components/sections/CraftBand';
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

  it('gives the eyebrow and the big heading distinct text, not the same string twice', () => {
    // This is the trap flagged in the task brief: an earlier draft of
    // CraftBand rendered t.howIWork as both the eyebrow <p> and the
    // MaskedHeading text, which makes screen.getByText(t.howIWork)
    // ambiguous and throws away the reference design's real heading copy
    // ("Six things I will not trade away."). Asserting the two are
    // different strings guards against that regression coming back.
    const { container } = render(<CraftBand locale="en" />);
    const eyebrow = container.querySelector('p')?.textContent;
    const heading = container.querySelector('h2')?.textContent;
    expect(eyebrow).toBe(dict.en.howIWork);
    expect(heading).toBeTruthy();
    expect(heading).not.toBe(eyebrow);
  });

  it('highlights only the first imperative, keeping the rest soft', () => {
    const { container } = render(<CraftBand locale="en" />);
    const items = container.querySelectorAll('li');
    expect(items[0].className).toContain('text-on-dark');
    expect(items[0].className).not.toContain('text-on-dark-soft');
    for (const item of Array.from(items).slice(1)) {
      expect(item.className).toContain('text-on-dark-soft');
    }
  });

  it('switches the eyebrow, heading, and every imperative to Thai when locale is th', () => {
    const { container } = render(<CraftBand locale="th" />);
    expect(container.querySelector('p')?.textContent).toBe(dict.th.howIWork);
    expect(container.querySelector('h2')?.textContent).toBe(CRAFT_HEADING.th);
    for (const line of dict.th.craft) expect(screen.getByText(line)).toBeTruthy();
    // No English eyebrow, heading, or imperative leaked through.
    expect(screen.queryByText(dict.en.howIWork)).toBeNull();
    expect(screen.queryByText(CRAFT_HEADING.en)).toBeNull();
  });

  it('renders the English heading text, not a locale-blind copy of it', () => {
    // Distinct from the "distinct text" test above: this pins the heading
    // to its actual expected value per locale, so a mutation that hardcodes
    // CRAFT_HEADING.en regardless of `locale` -- which would still pass
    // "distinct from eyebrow" in a th render, since the eyebrow itself
    // switches to Thai -- gets caught here.
    const { container } = render(<CraftBand locale="en" />);
    expect(container.querySelector('h2')?.textContent).toBe(CRAFT_HEADING.en);
  });
});

describe('AboutBand', () => {
  it("renders the prose from the profile's own byline, not hardcoded copy", () => {
    render(<AboutBand profile={profile} locale="en" />);
    expect(screen.getByText(profile.byline.en)).toBeTruthy();
  });

  it('renders a different byline when the profile data changes', () => {
    const other: Profile = { ...profile, byline: { en: 'A completely different sentence.', th: 'ประโยคที่ต่างไปเลย' } };
    render(<AboutBand profile={other} locale="en" />);
    expect(screen.getByText('A completely different sentence.')).toBeTruthy();
    expect(screen.queryByText(profile.byline.en)).toBeNull();
  });

  it('sources the current-focus line from profile.now, not invented static copy', () => {
    render(<AboutBand profile={profile} locale="en" />);
    expect(screen.getByText(new RegExp(profile.now.en))).toBeTruthy();
  });

  it('omits the now line entirely when profile.now is empty for the locale', () => {
    const noNow: Profile = { ...profile, now: { en: '', th: '' } };
    const { container } = render(<AboutBand profile={noNow} locale="en" />);
    // t.now (the "Now:" label) must not render as a dangling label with
    // nothing after it.
    expect(screen.queryByText(new RegExp(`^${dict.en.now}:`))).toBeNull();
    // Scoped to the prose container -- the section's eyebrow is also a <p>,
    // so counting every <p> in the section would always include it.
    expect(container.querySelector('[data-prose]')?.querySelectorAll('p')).toHaveLength(1);
  });

  it('caps the prose column width so it never exceeds the reading measure', () => {
    const { container } = render(<AboutBand profile={profile} locale="en" />);
    expect(container.querySelector('[data-prose]')?.className).toContain('max-w-[68ch]');
  });

  it('gives the eyebrow and the big heading distinct, correctly localized text', () => {
    const { container } = render(<AboutBand profile={profile} locale="en" />);
    const eyebrow = container.querySelector('p')?.textContent;
    const heading = container.querySelector('h2')?.textContent;
    expect(eyebrow).toBe(dict.en.about);
    expect(heading).toBe(ABOUT_HEADING.en);
    expect(heading).not.toBe(eyebrow);
  });

  it('renders only the active locale -- the other language is entirely absent from the DOM', () => {
    const { container } = render(<AboutBand profile={profile} locale="th" />);
    // Dictionary-sourced eyebrow
    expect(screen.queryByText(dict.en.about)).toBeNull();
    // Local structural copy (heading + sub-head)
    expect(screen.queryByText(ABOUT_HEADING.en)).toBeNull();
    expect(screen.queryByText(ABOUT_SUBHEAD.en)).toBeNull();
    // Profile-sourced prose
    expect(screen.queryByText(profile.byline.en)).toBeNull();
    expect(screen.queryByText(new RegExp(profile.now.en))).toBeNull();
    // Thai equivalents are present, including the correctly localized
    // heading and sub-head (not just "some non-English text").
    expect(container.querySelector('h2')?.textContent).toBe(ABOUT_HEADING.th);
    expect(container.querySelector('h3')?.textContent).toBe(ABOUT_SUBHEAD.th);
    expect(screen.getByText(dict.th.about)).toBeTruthy();
    expect(screen.getByText(profile.byline.th)).toBeTruthy();
  });
});
