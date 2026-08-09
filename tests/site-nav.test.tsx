// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import SiteNav from '@/components/SiteNav';
import { dict } from '@/lib/dictionary';
import type { Profile } from '@/lib/models';

// No RTL auto-cleanup wired up in this project (no setupFiles in
// vitest.config.ts) -- same pattern as tests/bands.test.tsx and friends.
afterEach(cleanup);

const profile: Profile = {
  name: 'Suwichak Jarunopratamp (Klao)',
  headline: { en: 'Headline EN', th: 'Headline TH' },
  byline: { en: 'Byline EN', th: 'Byline TH' },
  now: { en: 'Now EN', th: 'Now TH' },
  photoSrc: null,
  linkedin: 'https://linkedin.example/klao',
  github: 'https://github.example/klao',
  email: 'klao@example.com',
  resumeUrl: null,
};

describe('SiteNav', () => {
  it("badges the monogram with the first letter of profile.name, uppercased", () => {
    render(<SiteNav locale="en" profile={profile} />);
    expect(screen.getByText('S')).toBeTruthy();
  });

  it('re-derives the monogram when the profile name changes, not a hardcoded letter', () => {
    render(<SiteNav locale="en" profile={{ ...profile, name: 'zara test' }} />);
    expect(screen.getByText('Z')).toBeTruthy();
    expect(screen.queryByText('S')).toBeNull();
  });

  it('points the four in-page anchors at the real section ids, never a bare "#"', () => {
    const { container } = render(<SiteNav locale="en" profile={profile} />);
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    for (const id of ['#hero', '#about', '#work', '#cv']) {
      expect(hrefs, `expected ${id} among: ${JSON.stringify(hrefs)}`).toContain(id);
    }
    expect(hrefs.some((h) => h === '#')).toBe(false);
  });

  it('labels the anchors with the active locale\'s own words', () => {
    render(<SiteNav locale="th" profile={profile} />);
    expect(screen.getByText(dict.th.home)).toBeTruthy();
    expect(screen.getByText(dict.th.about)).toBeTruthy();
    expect(screen.getByText(dict.th.selectedWork)).toBeTruthy();
    expect(screen.getByText(dict.th.career)).toBeTruthy();
    // The other language's nav labels are entirely absent.
    expect(screen.queryByText(dict.en.home)).toBeNull();
    expect(screen.queryByText(dict.en.about)).toBeNull();
  });

  it('renders a social link only when its profile field is non-empty', () => {
    const noSocials: Profile = { ...profile, linkedin: '', github: '', email: '' };
    const { container } = render(<SiteNav locale="en" profile={noSocials} />);
    expect(screen.queryByText('LinkedIn')).toBeNull();
    expect(screen.queryByText('GitHub')).toBeNull();
    // No dangling mailto: link either.
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
  });

  it('renders every social link when every profile field is present, each pointing at its own URL', () => {
    const { container } = render(<SiteNav locale="en" profile={profile} />);
    const linkedin = screen.getByText('LinkedIn').closest('a');
    const github = screen.getByText('GitHub').closest('a');
    expect(linkedin?.getAttribute('href')).toBe(profile.linkedin);
    expect(github?.getAttribute('href')).toBe(profile.github);
    expect(container.querySelector(`a[href="mailto:${profile.email}"]`)).toBeTruthy();
  });

  it('opens external social links in a new tab without leaking a referrer', () => {
    render(<SiteNav locale="en" profile={profile} />);
    const linkedin = screen.getByText('LinkedIn').closest('a');
    expect(linkedin?.getAttribute('target')).toBe('_blank');
    expect(linkedin?.getAttribute('rel')).toBe('noreferrer');
  });

  it('renders the Thai nav labels in the Thai font stack with normal tracking, never font-mono', () => {
    // Regression test: no monospace face carries Thai glyphs (whole-branch
    // review finding, confirmed in Chrome), so the four in-page nav labels
    // fell back per glyph and the heavy tracking pulled combining marks off
    // their base letters whenever locale was 'th'.
    render(<SiteNav locale="th" profile={profile} />);
    const link = screen.getByText(dict.th.home).closest('a') as HTMLElement;
    expect(link.className).not.toContain('font-mono');
    expect(link.className).not.toMatch(/tracking-\[/);
    expect(link.className).toContain('font-thai');
  });

  it('includes the language switcher', () => {
    render(<SiteNav locale="en" profile={profile} />);
    expect(screen.getByRole('navigation', { name: 'Language' })).toBeTruthy();
  });

  it("does not invert just because its own monogram badge reuses the bg-light colour -- the badge sits inside the header, always near the probe point", () => {
    // Regression test for a real bug this task's browser verification
    // caught (not by any unit test, since jsdom's getBoundingClientRect()
    // is all-zero by default and never surfaces it): an earlier version of
    // the scroll listener selected by the bare `.bg-light` class, which
    // also matches this file's own monogram badge below. In a real
    // browser the badge sits at roughly y=20..62, permanently straddling
    // the y=40 probe point -- so `nav-on-light` was true on page load,
    // before any section had scrolled anywhere near the header. Simulated
    // here by giving the monogram that same real-world rect and asserting
    // the header stays un-inverted with no actual light section present.
    const { container } = render(<SiteNav locale="en" profile={profile} />);
    const header = container.querySelector('header') as HTMLElement;
    const mark = container.querySelector('.nav-mark') as HTMLElement;
    mark.getBoundingClientRect = () =>
      ({ top: 20, bottom: 62, left: 0, right: 0, width: 42, height: 42, x: 0, y: 20, toJSON() {} }) as DOMRect;
    window.dispatchEvent(new Event('scroll'));
    expect(header.classList.contains('nav-on-light')).toBe(false);
  });

  it('inverts to the "nav-on-light" state when a bg-light band sits under the fixed header, and back when it scrolls past', () => {
    // jsdom never computes real layout, so getBoundingClientRect() on any
    // element returns all zeros unless overridden -- this stubs the one
    // element SiteNav's scroll listener actually queries (`section.bg-light`)
    // to simulate it first covering, then clearing, the header's fixed
    // probe point (y=40, per the component). A plain <section> element,
    // not a <div>: the selector is deliberately scoped to `<section>` so it
    // doesn't also match the bg-light CTA buttons/monogram badge elsewhere
    // on the page (a real bug caught in this task's browser verification,
    // not by jsdom, which never computes real layout).
    const { container } = render(
      <>
        <SiteNav locale="en" profile={profile} />
        <section className="bg-light" data-testid="light-band" />
      </>,
    );
    const header = container.querySelector('header') as HTMLElement;
    const band = screen.getByTestId('light-band');

    band.getBoundingClientRect = () =>
      ({ top: 0, bottom: 800, left: 0, right: 0, width: 0, height: 800, x: 0, y: 0, toJSON() {} }) as DOMRect;
    window.dispatchEvent(new Event('scroll'));
    expect(header.classList.contains('nav-on-light')).toBe(true);

    band.getBoundingClientRect = () =>
      ({ top: 900, bottom: 1700, left: 0, right: 0, width: 0, height: 800, x: 0, y: 900, toJSON() {} }) as DOMRect;
    window.dispatchEvent(new Event('scroll'));
    expect(header.classList.contains('nav-on-light')).toBe(false);
  });

  it("inverts as soon as a light band touches ANY part of the header's real height, not just a single fixed point near its top", () => {
    // Regression test for a real bug the whole-branch review caught in
    // Chrome, not by any unit test (jsdom's getBoundingClientRect() is
    // all-zero by default): an earlier version of this scroll listener
    // checked a single constant y=40 against the light band's rect, even
    // though the fixed header's own content is really ~82px tall. A band
    // that had only reached y=50..900 -- covering the bottom ~32px of the
    // header, where the nav links and locale toggle actually sit, but not
    // the old y=40 probe point -- left the nav white-on-white against the
    // light band underneath it. This stubs the header's own rect (jsdom
    // never lays it out for real) to a realistic ~82px height and gives
    // the band exactly that "past the old point, still inside the header"
    // range.
    const { container } = render(
      <>
        <SiteNav locale="en" profile={profile} />
        <section className="bg-light" data-testid="light-band" />
      </>,
    );
    const header = container.querySelector('header') as HTMLElement;
    const band = screen.getByTestId('light-band');

    header.getBoundingClientRect = () =>
      ({ top: 0, bottom: 82, left: 0, right: 0, width: 0, height: 82, x: 0, y: 0, toJSON() {} }) as DOMRect;
    band.getBoundingClientRect = () =>
      ({ top: 50, bottom: 900, left: 0, right: 0, width: 0, height: 850, x: 0, y: 50, toJSON() {} }) as DOMRect;
    window.dispatchEvent(new Event('scroll'));
    expect(header.classList.contains('nav-on-light')).toBe(true);
  });
});
