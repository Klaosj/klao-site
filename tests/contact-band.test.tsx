// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ContactBand from '@/components/sections/ContactBand';
import { dict } from '@/lib/dictionary';
import type { Profile } from '@/lib/models';

// No RTL auto-cleanup is wired up in this project -- see tests/bands.test.tsx.
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
  photoSrc: null,
  linkedin: '',
  github: '',
  resumeUrl: null,
  clients: [],
};

describe('ContactBand', () => {
  it('renders the mailto CTA, never href="#", when profile.email is set', () => {
    const { container } = render(<ContactBand profile={profile} locale="en" />);
    const cta = screen.getByText(dict.en.startConversation).closest('a');
    expect(cta?.getAttribute('href')).toBe('mailto:real@example.com');
    // Belt and braces: no anchor anywhere in the band should ever be "#".
    for (const a of Array.from(container.querySelectorAll('a'))) {
      expect(a.getAttribute('href')).not.toBe('#');
    }
  });

  it('omits the CTA entirely when profile.email is empty', () => {
    const noEmail: Profile = { ...profile, email: '' };
    const { container } = render(<ContactBand profile={noEmail} locale="en" />);
    expect(screen.queryByText(dict.en.startConversation)).toBeNull();
    expect(container.querySelector('a')).toBeNull();
  });

  it('renders the email channel with a copy button when profile.email is set', () => {
    render(<ContactBand profile={profile} locale="en" />);
    // The CopyEmail button carries the address as its own visible text.
    expect(screen.getByText('real@example.com')).toBeTruthy();
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('omits the email channel entirely when profile.email is empty', () => {
    const noEmail: Profile = { ...profile, email: '' };
    render(<ContactBand profile={noEmail} locale="en" />);
    expect(screen.queryByText('real@example.com')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    // The other two channels must still render -- an empty email should not
    // take the whole channel row down with it.
    expect(screen.getByText(dict.en.basedIn)).toBeTruthy();
    expect(screen.getByText(dict.en.workingIn)).toBeTruthy();
  });

  it('never dims a channel label below the WCAG AA text-contrast floor', () => {
    // Regression test for a real bug the whole-branch review's Lighthouse
    // pass caught (not something a jsdom-based render can measure directly,
    // since jsdom doesn't compute colour or contrast): `opacity-55` stacked
    // on top of the already-60%-alpha `text-on-dark-soft` token measured
    // 2.9:1 at 9px, against a 4.5:1 requirement. Asserting the opacity
    // utility is entirely absent from these labels is the closest a unit
    // test can get to proving the contrast floor holds.
    const { container } = render(<ContactBand profile={profile} locale="en" />);
    for (const b of Array.from(container.querySelectorAll('b'))) {
      expect(b.className).not.toMatch(/\bopacity-\d+\b/);
    }
  });

  it('pairs each channel label with its own value, not a swapped one', () => {
    // Checking label and value presence independently would still pass if
    // the two channels' values were swapped (basedIn showing "TH / EN",
    // workingIn showing "Bangkok, TH") -- so this walks up from each label
    // to its own wrapping <div> and checks the value lives inside that same
    // wrapper, not just somewhere on the page.
    render(<ContactBand profile={profile} locale="en" />);
    const basedInWrapper = screen.getByText(dict.en.basedIn).closest('div');
    const workingInWrapper = screen.getByText(dict.en.workingIn).closest('div');
    expect(basedInWrapper?.textContent).toContain('Bangkok, TH');
    expect(basedInWrapper?.textContent).not.toContain('TH / EN');
    expect(workingInWrapper?.textContent).toContain('TH / EN');
    expect(workingInWrapper?.textContent).not.toContain('Bangkok, TH');
  });

  it('renders the Thai channel labels in the Thai font stack with normal tracking, never font-mono', () => {
    // Regression test, same class of bug as the other bands' own version of
    // this test: no monospace face carries Thai glyphs.
    const { container } = render(<ContactBand profile={profile} locale="th" />);
    const labels = Array.from(container.querySelectorAll('b'));
    expect(labels.length).toBeGreaterThan(0);
    for (const b of labels) {
      expect(b.className).not.toContain('font-mono');
      expect(b.className).not.toMatch(/tracking-\[/);
      expect(b.className).toContain('font-thai');
    }
  });

  it('renders only the active locale -- the statement heading, CTA and channel labels switch, and the other language is absent', () => {
    const { container } = render(<ContactBand profile={profile} locale="th" />);
    // MaskedHeading splits the heading text across per-word <span> children,
    // so screen.getByText can't match it -- read the rendered <h2> directly.
    expect(container.querySelector('h2')?.textContent).toBe(dict.th.contactHeading);
    expect(screen.getByText(dict.th.startConversation)).toBeTruthy();
    expect(screen.getByText(dict.th.basedIn)).toBeTruthy();
    expect(screen.getByText(dict.th.workingIn)).toBeTruthy();

    expect(screen.queryByText(dict.en.startConversation)).toBeNull();
    expect(screen.queryByText(dict.en.basedIn)).toBeNull();
    expect(screen.queryByText(dict.en.workingIn)).toBeNull();
    expect(screen.queryByText(dict.en.contactHeading)).toBeNull();
  });
});
