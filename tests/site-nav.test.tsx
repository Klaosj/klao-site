// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePathname } from 'next/navigation';
import SiteNav from '@/components/SiteNav';
import { dict } from '@/lib/dictionary';
import type { Profile } from '@/lib/models';

// SiteNav (and the LocaleToggle it renders) both call usePathname() to
// decide, respectively, whether the four in-page anchors can stay bare
// hashes (home route) or need a `/{locale}` prefix (every other route --
// see SiteNav's own comment), and which locale is "active" for the EN/ไทย
// toggle. Mocked here (rather than relying on the "no router context"
// fallback the component already has, and the existing tests above already
// exercise) so the route-aware href tests below can simulate a non-home
// route -- something a real, unmounted-router jsdom render can't produce on
// its own. Defaults to '/en' (the English home route), matching what the
// no-mock fallback already produced, so every test above this comment
// keeps working unchanged.
vi.mock('next/navigation', () => ({ usePathname: vi.fn(() => '/en') }));

// No RTL auto-cleanup wired up in this project (no setupFiles in
// vitest.config.ts) -- same pattern as tests/bands.test.tsx and friends.
afterEach(() => {
  cleanup();
  vi.mocked(usePathname).mockReturnValue('/en');
});

// SiteNav's scroll/resize handler is now rAF-throttled (structural fix for
// a parked "unthrottled scroll listener" review finding -- see SiteNav's
// own comment on the effect) -- a dispatched 'scroll' event only
// *schedules* the next sync(), it doesn't run it synchronously anymore.
// Every test below that dispatches 'scroll' and then asserts on the header
// class it drives awaits one real animation frame first, so the assertion
// exercises the actual post-throttle sync() call with that test's current
// stubbed rects, rather than accidentally passing off whatever `nav-on-light`
// state the component's mount-time (synchronous, un-throttled-path) sync()
// call already left behind.
const flushRaf = () => new Promise<void>((resolve) => { requestAnimationFrame(() => resolve()); });

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
  clients: [],
  nameNative: null,
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
    expect(screen.getByText(dict.th.selectedProjects)).toBeTruthy();
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

  it("does not invert just because its own monogram badge reuses the bg-light colour -- the badge sits inside the header, always near the probe point", async () => {
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
    await flushRaf();
    expect(header.classList.contains('nav-on-light')).toBe(false);
  });

  it('inverts to the "nav-on-light" state when a bg-light band sits under the fixed header, and back when it scrolls past', async () => {
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
    await flushRaf();
    expect(header.classList.contains('nav-on-light')).toBe(true);

    band.getBoundingClientRect = () =>
      ({ top: 900, bottom: 1700, left: 0, right: 0, width: 0, height: 800, x: 0, y: 900, toJSON() {} }) as DOMRect;
    window.dispatchEvent(new Event('scroll'));
    await flushRaf();
    expect(header.classList.contains('nav-on-light')).toBe(false);
  });

  it("inverts as soon as a light band touches ANY part of the header's real height, not just a single fixed point near its top", async () => {
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
    await flushRaf();
    expect(header.classList.contains('nav-on-light')).toBe(true);
  });

  it('rewrites the four in-page anchors -- plus the monogram, a fifth link to the same #hero id -- to /{locale}#id on a non-home route, never a bare/dead hash', () => {
    // Defect 1 (WCAG 2.4.4): #hero/#about/#work/#cv only exist on the
    // homepage (confirmed by curling /en/projects, /en/writing, /en/career
    // and grepping for the ids: absent on all three). A bare hash on any
    // other route silently does nothing.
    vi.mocked(usePathname).mockReturnValue('/en/projects');
    const { container } = render(<SiteNav locale="en" profile={profile} />);
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    for (const id of ['#hero', '#about', '#work', '#cv']) {
      expect(hrefs, `expected /en${id} among: ${JSON.stringify(hrefs)}`).toContain(`/en${id}`);
      expect(hrefs, `expected no bare ${id}`).not.toContain(id);
    }
    // The monogram badge (aria-label={t.home}) is a second, separate link
    // to #hero -- so '/en#hero' should appear twice: once for it, once for
    // the visible "Home" text link.
    expect(hrefs.filter((h) => h === '/en#hero')).toHaveLength(2);
  });

  it('does the same on /th routes, producing /th-prefixed hrefs -- never /en on a Thai route', () => {
    vi.mocked(usePathname).mockReturnValue('/th/career');
    const { container } = render(<SiteNav locale="th" profile={profile} />);
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    for (const id of ['#hero', '#about', '#work', '#cv']) {
      expect(hrefs).toContain(`/th${id}`);
      expect(hrefs).not.toContain(`/en${id}`);
    }
  });

  it('keeps the anchors as bare in-page hashes when already on the matching-locale homepage, so the homepage still scrolls in-page rather than reloading', () => {
    // Same route-aware logic as the two tests above, at its other branch:
    // on the homepage itself, prefixing with `/en` would still work, but
    // would turn a same-page scroll into a full navigation -- the thing
    // this defect's fix is explicitly required NOT to do.
    vi.mocked(usePathname).mockReturnValue('/en');
    const { container } = render(<SiteNav locale="en" profile={profile} />);
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('#about');
    expect(hrefs).not.toContain('/en#about');
  });

  it('gives the nav-link and nav-social text links extra invisible hit-area padding (WCAG 2.5.8), canceled by a matching negative margin', () => {
    // jsdom never computes real layout (see this file's own comments
    // above), so this can't assert an actual 24x24 CSS px box -- it checks
    // the padding/negative-margin utility pair is present instead, which is
    // the mechanism the real, browser-verified sizing depends on. `p-2` is
    // the padding that grows the hit area; `-m-2` is what keeps that
    // growth from also growing the header's flex row (defect 2's own
    // "watch out for horizontal overflow" warning).
    const { container } = render(<SiteNav locale="en" profile={profile} />);
    const navLink = container.querySelector('a.nav-link') as HTMLElement;
    expect(navLink.className).toContain('p-2');
    expect(navLink.className).toContain('-m-2');
    const social = screen.getByText('LinkedIn').closest('a') as HTMLElement;
    expect(social.className).toContain('p-2');
    expect(social.className).toContain('-m-2');
  });

  it('gives the embedded LocaleToggle EN/ไทย links the same invisible hit-area padding', () => {
    render(<SiteNav locale="en" profile={profile} />);
    const en = screen.getByText('EN').closest('a') as HTMLElement;
    expect(en.className).toContain('p-1.5');
    expect(en.className).toContain('-m-1.5');
  });

  it('adds a Writing route link to the desktop nav, after Career, pointed at /{locale}/writing -- never a hash anchor', () => {
    // /writing is a real, sitemapped route with nothing linking to it
    // before this fix (confirmed by grepping the pre-fix SiteNav for
    // "writing": no match). Unlike the four #hero/#about/#work/#cv anchors,
    // it has no homepage section id, so its href must never come out of
    // `anchorHref` (which only ever produces a bare or /{locale}-prefixed
    // hash).
    const { container } = render(<SiteNav locale="en" profile={profile} />);
    const nav = screen.getByRole('navigation', { name: dict.en.navMain });
    const writingLink = within(nav).getByText(dict.en.writing).closest('a') as HTMLElement;
    expect(writingLink.getAttribute('href')).toBe('/en/writing');
    expect(writingLink.className).toContain('nav-link');
    expect(writingLink.className).toContain('u-draw');

    // It comes after the Career link in source order (same position on
    // desktop and mobile, per the fix spec).
    const hrefs = Array.from(container.querySelectorAll('nav a')).map((a) => a.getAttribute('href'));
    const careerIndex = hrefs.indexOf('#cv');
    const writingIndex = hrefs.indexOf('/en/writing');
    expect(careerIndex).toBeGreaterThanOrEqual(0);
    expect(writingIndex).toBeGreaterThan(careerIndex);
  });

  it('labels the Writing link with the active locale\'s own word, and points /th at /th/writing', () => {
    render(<SiteNav locale="th" profile={profile} />);
    const nav = screen.getByRole('navigation', { name: dict.th.navMain });
    const writingLink = within(nav).getByText(dict.th.writing).closest('a') as HTMLElement;
    expect(writingLink.getAttribute('href')).toBe('/th/writing');
    expect(screen.queryByText(dict.en.writing)).toBeNull();
  });

  it('never rewrites the Writing link\'s href off the homepage -- it is not one of anchorHref\'s hash anchors', () => {
    // Contrast with the anchors, which DO get /{locale}-prefixed off the
    // homepage (see the "rewrites the four in-page anchors" tests below).
    // The Writing link's href is a plain route, identical on every route.
    vi.mocked(usePathname).mockReturnValue('/en/projects');
    const { container } = render(<SiteNav locale="en" profile={profile} />);
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/en/writing');
  });
});

describe('mobile menu', () => {
  it('renders a menu button that toggles the overlay', () => {
    render(<SiteNav locale="en" profile={profile} />);
    const btn = screen.getByRole('button', { name: /main|เมนูหลัก/i });
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(btn);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    const menu = document.getElementById('mobile-menu');
    expect(menu).not.toBeNull();
    // The four section anchors plus the Writing route link, plus the three
    // social links folded into the overlay's own bottom row (the `profile`
    // fixture above has linkedin/github/email all set) -- 5 + 3 = 8. See
    // the "folds the social links into the mobile overlay" test below for
    // the social row in isolation.
    expect(within(menu!).getAllByRole('link')).toHaveLength(8);
    // Clicking a link closes the menu
    fireEvent.click(within(menu!).getAllByRole('link')[0]);
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  it('includes a Writing route link, and clicking it closes the menu same as the anchor links', () => {
    render(<SiteNav locale="en" profile={profile} />);
    const btn = screen.getByRole('button', { name: /main|เมนูหลัก/i });
    fireEvent.click(btn);
    const menu = document.getElementById('mobile-menu');
    const writingLink = within(menu!).getByText(dict.en.writing).closest('a') as HTMLElement;
    expect(writingLink.getAttribute('href')).toBe('/en/writing');
    fireEvent.click(writingLink);
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  it('renders the overlay as a sibling of the header, never a descendant', () => {
    // Regression test (fix round 1): the header carries `nav-hidden`, which
    // applies a CSS transform (translateY) when the user scrolls down --
    // and a transformed ancestor establishes a new containing block for any
    // `position: fixed` descendant. An overlay nested inside the header
    // would silently re-anchor to the header's own ~82px box instead of the
    // viewport the instant the header hid mid-scroll (nothing locks
    // background scroll while the menu is open, so that's reachable in
    // practice, not just in theory). The overlay must live outside the
    // header in the DOM so its `fixed` positioning is never at the mercy of
    // the header's own transform.
    const { container } = render(<SiteNav locale="en" profile={profile} />);
    const header = container.querySelector('header') as HTMLElement;
    const btn = screen.getByRole('button', { name: /main|เมนูหลัก/i });
    fireEvent.click(btn);
    const menu = document.getElementById('mobile-menu');
    expect(menu).not.toBeNull();
    expect(header.contains(menu)).toBe(false);
  });

  it('hides the header social links below md, revealing them again at md and up -- they fold into the overlay instead', () => {
    // The header's own LinkedIn/GitHub/email links stay in the DOM at every
    // width (unlike the overlay, which only mounts while menuOpen), just
    // `hidden` by default and switched back to `md:inline-flex` at the `md`
    // breakpoint -- jsdom doesn't evaluate media queries, so this checks the
    // class pair rather than actual visibility.
    render(<SiteNav locale="en" profile={profile} />);
    const linkedin = screen.getByText('LinkedIn').closest('a') as HTMLElement;
    const github = screen.getByText('GitHub').closest('a') as HTMLElement;
    const email = screen.getByText(dict.en.email).closest('a') as HTMLElement;
    for (const social of [linkedin, github, email]) {
      expect(social.className).toContain('hidden');
      expect(social.className).toContain('md:inline-flex');
    }
  });

  it('folds the social links into the mobile overlay, gated the same way as the header, omitting any empty field', () => {
    const { container } = render(<SiteNav locale="en" profile={{ ...profile, github: '' }} />);
    const btn = screen.getByRole('button', { name: /main|เมนูหลัก/i });
    fireEvent.click(btn);
    const menu = document.getElementById('mobile-menu');
    expect(menu).not.toBeNull();
    const linkedin = within(menu!).getByText('LinkedIn').closest('a');
    expect(linkedin?.getAttribute('href')).toBe(profile.linkedin);
    expect(linkedin?.getAttribute('target')).toBe('_blank');
    expect(linkedin?.getAttribute('rel')).toBe('noreferrer');
    // github is emptied out on this render's profile -- omitted, same rule
    // as the header's own gating (never a dead link).
    expect(within(menu!).queryByText('GitHub')).toBeNull();
    const email = within(menu!).getByText(dict.en.email).closest('a');
    expect(email?.getAttribute('href')).toBe(`mailto:${profile.email}`);
    // Sanity check against the header's own (now-hidden-below-md) GitHub
    // link still being in the DOM elsewhere in the tree, unrelated to this
    // profile's emptied-out overlay copy.
    expect(container.querySelectorAll('a[href="' + profile.github + '"]')).toHaveLength(0);
  });

  it('closes the menu on Escape and returns focus to the burger button', () => {
    render(<SiteNav locale="en" profile={profile} />);
    const btn = screen.getByRole('button', { name: /main|เมนูหลัก/i });
    fireEvent.click(btn);
    expect(document.getElementById('mobile-menu')).not.toBeNull();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(document.getElementById('mobile-menu')).toBeNull();
    expect(document.activeElement).toBe(btn);
  });

  it('locks body scroll while the menu is open and restores the prior value on close', () => {
    render(<SiteNav locale="en" profile={profile} />);
    expect(document.body.style.overflow).toBe('');
    const btn = screen.getByRole('button', { name: /main|เมนูหลัก/i });
    fireEvent.click(btn);
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.click(btn);
    expect(document.body.style.overflow).toBe('');
  });

  it('restores body scroll on unmount even if the menu was left open', () => {
    const { unmount } = render(<SiteNav locale="en" profile={profile} />);
    const btn = screen.getByRole('button', { name: /main|เมนูหลัก/i });
    fireEvent.click(btn);
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('moves focus onto the first overlay link the moment the menu opens', () => {
    // jsdom does support .focus()/document.activeElement for a real,
    // in-document, naturally-focusable element like an <a href>, so this
    // does exercise the actual effect rather than merely asserting it ran.
    render(<SiteNav locale="en" profile={profile} />);
    const btn = screen.getByRole('button', { name: /main|เมนูหลัก/i });
    fireEvent.click(btn);
    const menu = document.getElementById('mobile-menu');
    const firstLink = within(menu!).getAllByRole('link')[0];
    expect(document.activeElement).toBe(firstLink);
  });
});

it('marks the header with nav-chrome for scroll styling', () => {
  render(<SiteNav locale="en" profile={profile} />);
  expect(document.querySelector('header')!.classList.contains('nav-chrome')).toBe(true);
});
