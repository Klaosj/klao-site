// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LocaleToggle, { switchLocaleHref } from '@/components/LocaleToggle';
import { dict } from '@/lib/dictionary';

vi.mock('next/navigation', () => ({ usePathname: vi.fn(() => '/en') }));

afterEach(() => {
  cleanup();
  vi.mocked(usePathname).mockReturnValue('/en');
});

describe('switchLocaleHref', () => {
  it('swaps only the locale segment and keeps the rest of the path', () => {
    expect(switchLocaleHref('/en', 'th')).toBe('/th');
    expect(switchLocaleHref('/en/', 'th')).toBe('/th');
    expect(switchLocaleHref('/th/writing/some-post', 'en')).toBe('/en/writing/some-post');
    expect(switchLocaleHref('/en/projects', 'en')).toBe('/en/projects');
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
});
