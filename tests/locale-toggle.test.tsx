// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LocaleToggle, { switchLocaleHref } from '@/components/LocaleToggle';
import { setActiveSection } from '@/lib/active-section';
import { dict } from '@/lib/dictionary';

vi.mock('next/navigation', () => ({ usePathname: vi.fn(() => '/en') }));

// Same helper as tests/theme-toggle.test.tsx: a real requestAnimationFrame
// tick, since that's what the component's mount effect actually uses (not a
// fake timer).
const flushRaf = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

// jsdom can't load another document; a click that reached it would log
// "Not implemented: navigation". This runs after the component's own handler
// (window is the last stop on the way up) and stops the browser default only.
const stayOnPage = (e: Event) => e.preventDefault();
beforeEach(() => {
  window.addEventListener('click', stayOnPage);
});

afterEach(() => {
  cleanup();
  setActiveSection(null);
  window.removeEventListener('click', stayOnPage);
  vi.mocked(usePathname).mockReturnValue('/en');
});

describe('switchLocaleHref', () => {
  it('swaps only the locale segment and keeps the rest of the path', () => {
    expect(switchLocaleHref('/en', 'th')).toBe('/th');
    expect(switchLocaleHref('/en/', 'th')).toBe('/th');
    expect(switchLocaleHref('/th/writing/some-post', 'en')).toBe('/en/writing/some-post');
    expect(switchLocaleHref('/en/projects', 'en')).toBe('/en/projects');
  });

  // Klao decision (a), 2026-09-28: a switch keeps the reading position, as
  // the prototype's setLang did. Section ids are the same in both locales;
  // no other page has them, so nothing is carried off the home page.
  it('carries the section being read across a home-page switch, and nothing from any other page', () => {
    expect(switchLocaleHref('/en', 'th', 'career')).toBe('/th#career');
    expect(switchLocaleHref('/th/', 'en', 'faq')).toBe('/en#faq');
    expect(switchLocaleHref('/en', 'th', null)).toBe('/th');
    expect(switchLocaleHref('/en/projects', 'th', 'career')).toBe('/th/projects');
    expect(switchLocaleHref('/th/writing/some-post', 'en', 'story')).toBe('/en/writing/some-post');
  });
});

describe('LocaleToggle', () => {
  it('is one labelled group of two links, EN then ไทย, each tagged with its own language', () => {
    render(<LocaleToggle />);
    const group = screen.getByRole('group', { name: dict.en.navLanguage });
    const links = Array.from(group.querySelectorAll('a'));
    expect(links.map((a) => a.textContent)).toEqual(['EN', 'ไทย']);
    expect(links.map((a) => a.getAttribute('lang'))).toEqual(['en', 'th']);
    expect(links.map((a) => a.getAttribute('hreflang'))).toEqual(['en', 'th']);
  });

  it('marks the current language and points both links at the same page', () => {
    vi.mocked(usePathname).mockReturnValue('/th/career');
    render(<LocaleToggle />);
    const [en, th] = Array.from(document.querySelectorAll('.lt-seg a'));
    expect(en.getAttribute('href')).toBe('/en/career');
    expect(th.getAttribute('href')).toBe('/th/career');
    expect(en.hasAttribute('aria-current')).toBe(false);
    expect(th.getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('group').getAttribute('aria-label')).toBe(dict.th.navLanguage);
  });

  it('falls back to English on the root when there is no router (unit tests, not-found)', () => {
    vi.mocked(usePathname).mockReturnValue(null as unknown as string);
    render(<LocaleToggle />);
    expect(document.querySelector('.lt-seg a[aria-current]')?.textContent).toBe('EN');
  });

  it('stretches to the full row inside the phone menu', () => {
    const { container } = render(<LocaleToggle wide />);
    expect(container.querySelector('.lt-seg')?.classList.contains('lt-wide')).toBe(true);
  });

  // --- Amendment A02: same segmented control + one sliding thumb as
  // ThemeToggle (A01), reused from globals.css's `.seg`/`.thumb` (R19), not
  // redefined here -- these still stay real per-locale links (above), the
  // amendment only changes the visual mechanism.
  it('reuses the shared .seg pill and its single sliding thumb, not a per-item background', () => {
    const { container } = render(<LocaleToggle />);
    const group = container.querySelector('.lt-seg');
    expect(group?.classList.contains('seg')).toBe(true);
    // Exactly one thumb, and it is not one of the two language links.
    expect(container.querySelectorAll('.lt-seg > .thumb')).toHaveLength(1);
    expect(container.querySelector('.lt-seg > .thumb')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('drives the thumb to the current locale\'s slot with --i, and sizes it for two options with --n', () => {
    render(<LocaleToggle />);
    const enGroup = document.querySelector('.lt-seg') as HTMLElement;
    expect(enGroup.style.getPropertyValue('--n')).toBe('2');
    expect(enGroup.style.getPropertyValue('--i')).toBe('0');

    cleanup();
    vi.mocked(usePathname).mockReturnValue('/th');
    render(<LocaleToggle />);
    const thGroup = document.querySelector('.lt-seg') as HTMLElement;
    expect(thGroup.style.getPropertyValue('--i')).toBe('1');
  });

  // --- Fix round 1 (merge alignment): the P0 fix wave generalised .seg's
  // child selectors to :is(button, a) and added a shared inner structure
  // (ThemeToggle) that LocaleToggle must now match exactly, or the fix
  // wave's own mount-time CSS guard silently breaks it (see the component's
  // doc comment and this task's report, "Fix round 1").
  it('wraps each label in .seg-label with a matching data-label, same inner structure as ThemeToggle (fix wave finding 6)', () => {
    const { container } = render(<LocaleToggle />);
    const labels = Array.from(container.querySelectorAll('.lt-seg a .seg-label'));
    expect(labels.map((el) => el.textContent)).toEqual(['EN', 'ไทย']);
    expect(labels.map((el) => el.getAttribute('data-label'))).toEqual(['EN', 'ไทย']);
  });

  // Fix wave finding 1: globals.css keys the thumb's mount-time transition
  // guard off `.seg:not([data-ready])` -- a selector that, unlike
  // ThemeToggle's, would match this control FOREVER if it never set the
  // attribute (there is no server-guess-vs-real-preference sync to settle
  // here), permanently killing the thumb's slide on every later click.
  // P1 final review M-2 (amendment A02): the thumb waited for the new route,
  // and with prefetch off nothing answers the tap for ~0.4 s. It now moves on
  // the click itself (globals.css turns the slide into a jump under reduced
  // motion). aria-current stays with the page actually on screen.
  it('slides the thumb to the chosen language on the click itself, before the new page arrives', () => {
    const { rerender } = render(<LocaleToggle />);
    const group = document.querySelector('.lt-seg') as HTMLElement;
    const [en, th] = Array.from(group.querySelectorAll('a'));
    fireEvent.click(th);
    expect(group.style.getPropertyValue('--i')).toBe('1');
    expect(en.getAttribute('aria-current')).toBe('page');
    vi.mocked(usePathname).mockReturnValue('/th');
    rerender(<LocaleToggle />);
    expect(group.style.getPropertyValue('--i')).toBe('1');
    // Back to /en: the pick belonged to the old page and has lapsed.
    vi.mocked(usePathname).mockReturnValue('/en');
    rerender(<LocaleToggle />);
    expect(group.style.getPropertyValue('--i')).toBe('0');
  });

  it('leaves the thumb in place for a new-tab click, and for a click on the current language', () => {
    render(<LocaleToggle />);
    const group = document.querySelector('.lt-seg') as HTMLElement;
    const [en, th] = Array.from(group.querySelectorAll('a'));
    fireEvent.click(th, { metaKey: true });
    expect(group.style.getPropertyValue('--i')).toBe('0');
    fireEvent.click(en);
    expect(group.style.getPropertyValue('--i')).toBe('0');
  });

  // Klao decision (a): every toggle (capsule, phone menu, the footer's)
  // reads the section the capsule marks as being read. The current
  // language's link keeps no hash: following it would only jump the page.
  it('points the other language at the section being read, live, and never the current one', () => {
    render(<LocaleToggle />);
    const [en, th] = Array.from(document.querySelectorAll('.lt-seg a'));
    expect(th.getAttribute('href')).toBe('/th');
    act(() => setActiveSection('story'));
    expect(th.getAttribute('href')).toBe('/th#story');
    expect(en.getAttribute('href')).toBe('/en');
    act(() => setActiveSection(null));
    expect(th.getAttribute('href')).toBe('/th');
  });

  it('marks data-ready one frame after mount, not on the initial render (fix wave finding 1)', async () => {
    render(<LocaleToggle />);
    const group = document.querySelector('.lt-seg') as HTMLElement;
    expect(group.hasAttribute('data-ready')).toBe(false);
    await act(() => flushRaf());
    expect(group.getAttribute('data-ready')).toBe('true');
  });
});
