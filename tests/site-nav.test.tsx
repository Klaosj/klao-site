// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SiteNav from '@/components/SiteNav';
import { dict } from '@/lib/dictionary';
import { PALETTE_EVENT } from '@/lib/deep-link';
import { FakeIO, installFakeIO } from './helpers/io';
import { makeProfile } from './helpers/profile';

vi.mock('next/navigation', () => ({ usePathname: vi.fn(() => '/en') }));
// NavMenu and ThumbBar have their own test files; here they only need to show
// what SiteNav hands them.
vi.mock('@/components/NavMenu', async () => {
  const { createElement } = await import('react');
  return {
    default: (p: { locale: string; active: string | null }) =>
      createElement('div', { 'data-testid': 'nav-menu', 'data-locale': p.locale, 'data-active': p.active ?? '' }),
  };
});
vi.mock('@/components/ThumbBar', async () => {
  const { createElement } = await import('react');
  return {
    default: (p: { heroGone: boolean }) => createElement('div', { 'data-testid': 'thumb-bar', 'data-hero-gone': String(p.heroGone) }),
  };
});

beforeEach(() => {
  installFakeIO();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.mocked(usePathname).mockReturnValue('/en');
});

const profile = makeProfile();
const nav = (locale: 'en' | 'th' = 'en') => screen.getByRole('navigation', { name: dict[locale].navMain });
const sectionLinks = (locale: 'en' | 'th' = 'en') => Array.from(nav(locale).querySelectorAll<HTMLAnchorElement>('a[data-sec]'));
const rect = (top: number) => ({ top }) as DOMRectReadOnly;

// The home page's hooks: the four C7 sections, #top, #contact, and the hero's button row.
function HomeHooks() {
  return (
    <>
      {['top', 'work', 'career', 'story', 'faq', 'contact'].map((id) => (
        <section key={id} id={id} />
      ))}
      <div id="hero-cta" />
    </>
  );
}

describe('SiteNav', () => {
  it('is a floating glass capsule with none of the old scroll chrome', () => {
    const { container } = render(<SiteNav locale="en" profile={profile} />);
    expect(container.querySelector('header')?.className).toBe('sn-wrap');
    expect(nav().classList.contains('glass')).toBe(true);
    expect(nav().classList.contains('sn-cap')).toBe(true);
    fireEvent.scroll(window);
    // C1(a): the old negative-class probe can never fail once the whole file
    // is rewritten (grepping for the pattern below always finds a hit in this
    // very test, and in ContactBand's comment) -- this proves the same thing
    // a different way: the header carries no class beyond its own `sn-wrap`.
    expect(container.querySelector('header')?.className).toBe('sn-wrap');
  });

  it('opens with the brand: monogram and first name, back to the top', () => {
    render(<SiteNav locale="en" profile={profile} />);
    const brand = within(nav()).getByRole('link', { name: 'Suwichak, back to top' });
    expect(brand.getAttribute('href')).toBe('#top');
    expect(brand.querySelector('.sn-mono')?.textContent).toBe('S');
    expect(brand.querySelector('.sn-mono')?.nextElementSibling?.textContent).toBe('Suwichak');
  });

  it('derives the brand from profile.name, never a hardcoded string', () => {
    render(<SiteNav locale="en" profile={makeProfile({ name: 'zara test' })} />);
    expect(within(nav()).getByRole('link', { name: 'zara, back to top' }).querySelector('.sn-mono')?.textContent).toBe('Z');
  });

  it('links the four C7 sections in page order, as bare hashes on the home page', () => {
    render(<SiteNav locale="en" profile={profile} />);
    expect(sectionLinks().map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      [dict.en.navWork, '#work'],
      [dict.en.navCareer, '#career'],
      [dict.en.navStory, '#story'],
      [dict.en.navFaq, '#faq'],
    ]);
    expect(within(nav()).getByRole('link', { name: dict.en.navContact }).getAttribute('href')).toBe('#contact');
  });

  // Wave-1 reconciliation (k): the current link turns bold (600), which is
  // wider than 400, so it widened ~3 px and shifted the right-anchored row on
  // every section change. Each label now carries the same hidden bold
  // duplicate as the segmented controls (globals.css `.seg-label::after`).
  it('wraps each section label with a data-label copy of itself, reserving its bold width', () => {
    for (const locale of ['en', 'th'] as const) {
      const { unmount } = render(<SiteNav locale={locale} profile={profile} />);
      for (const a of sectionLinks(locale)) {
        const label = a.querySelector('.seg-label');
        expect(label, a.textContent ?? '').not.toBeNull();
        expect(label!.getAttribute('data-label')).toBe(a.textContent);
      }
      unmount();
    }
  });

  it('points every home anchor at /{locale}#id from another route, never a dead hash', () => {
    vi.mocked(usePathname).mockReturnValue('/th/projects');
    render(<SiteNav locale="th" profile={profile} />);
    expect(sectionLinks('th').map((a) => a.getAttribute('href'))).toEqual(['/th#work', '/th#career', '/th#story', '/th#faq']);
    expect(within(nav('th')).getByRole('link', { name: dict.th.navContact }).getAttribute('href')).toBe('/th#contact');
    expect(within(nav('th')).getByRole('link', { name: 'Suwichak กลับขึ้นด้านบน' }).getAttribute('href')).toBe('/th#top');
  });

  it('speaks Thai on /th', () => {
    vi.mocked(usePathname).mockReturnValue('/th');
    render(<SiteNav locale="th" profile={profile} />);
    expect(sectionLinks('th').map((a) => a.textContent)).toEqual(['โปรเจกต์', 'เส้นทางอาชีพ', 'วิธีทำงาน', 'FAQ']);
    expect(screen.getByTestId('nav-menu').getAttribute('data-locale')).toBe('th');
  });

  it('has a ⌘K button that asks the palette to open (C8), harmless until the palette exists', () => {
    const seen = vi.fn();
    window.addEventListener(PALETTE_EVENT, seen);
    render(<SiteNav locale="en" profile={profile} />);
    const button = within(nav()).getByRole('button', { name: dict.en.navSearch });
    expect(button.getAttribute('aria-keyshortcuts')).toBe('Meta+K Control+K');
    fireEvent.click(button);
    expect(seen).toHaveBeenCalledTimes(1);
    expect((seen.mock.calls[0][0] as CustomEvent).detail).toEqual({});
    window.removeEventListener(PALETTE_EVENT, seen);
  });

  it('puts ⌘K, the EN/ไทย switch, Contact and the phone Menu on the right, in that order', () => {
    render(<SiteNav locale="en" profile={profile} />);
    const right = Array.from(nav().querySelector('.sn-right')!.children);
    expect(right[0].getAttribute('aria-label')).toBe(dict.en.navSearch);
    expect(right[1].getAttribute('role')).toBe('group');
    expect(right[1].getAttribute('aria-label')).toBe(dict.en.navLanguage);
    expect(right[2].textContent).toBe(dict.en.navContact);
    expect(right[3].getAttribute('data-testid')).toBe('nav-menu');
  });

  it('slides the active pill onto the section crossing the middle band of the viewport', () => {
    render(
      <>
        <HomeHooks />
        <SiteNav locale="en" profile={profile} />
      </>,
    );
    const work = document.getElementById('work')!;
    const career = document.getElementById('career')!;
    const io = FakeIO.watching(work);
    expect(io.options.rootMargin).toBe('-45% 0px -54% 0px');
    expect(FakeIO.watching(career)).toBe(io); // one observer for all four
    io.fire([{ target: work, isIntersecting: true }]);
    expect(sectionLinks()[0].getAttribute('aria-current')).toBe('location');
    expect(nav().querySelector('.sn-act')!.hasAttribute('data-on')).toBe(true);
    expect(screen.getByTestId('nav-menu').getAttribute('data-active')).toBe('work');
    io.fire([
      { target: work, isIntersecting: false },
      { target: career, isIntersecting: true },
    ]);
    expect(sectionLinks().map((a) => a.hasAttribute('aria-current'))).toEqual([false, true, false, false]);
    io.fire([{ target: career, isIntersecting: false }]);
    expect(sectionLinks().some((a) => a.hasAttribute('aria-current'))).toBe(false);
    expect(nav().querySelector('.sn-act')!.hasAttribute('data-on')).toBe(false);
  });

  it('watches nothing on a page without those hooks (every route but home)', () => {
    render(<SiteNav locale="en" profile={profile} />);
    // Checked by what SiteNav would observe, not by a global count, so an
    // observer some other library creates can't make this pass or fail.
    expect(FakeIO.instances.find((o) => o.options.rootMargin === '-45% 0px -54% 0px')).toBeUndefined();
    expect(FakeIO.instances.some((o) => o.targets.some((el) => el.tagName === 'SECTION' || el.id === 'hero-cta'))).toBe(false);
  });

  it('fills Contact and wakes the thumb bar once the hero buttons scroll away above', () => {
    render(
      <>
        <HomeHooks />
        <SiteNav locale="en" profile={profile} />
      </>,
    );
    const cta = document.getElementById('hero-cta')!;
    const contact = within(nav()).getByRole('link', { name: dict.en.navContact });
    expect(contact.hasAttribute('data-filled')).toBe(false);
    expect(screen.getByTestId('thumb-bar').getAttribute('data-hero-gone')).toBe('false');
    FakeIO.watching(cta).fire([{ target: cta, isIntersecting: false, boundingClientRect: rect(-120) }]);
    expect(contact.hasAttribute('data-filled')).toBe(true);
    expect(screen.getByTestId('thumb-bar').getAttribute('data-hero-gone')).toBe('true');
    FakeIO.watching(cta).fire([{ target: cta, isIntersecting: true, boundingClientRect: rect(300) }]);
    expect(contact.hasAttribute('data-filled')).toBe(false);
  });

  it('does not count the hero buttons as gone while they are still below the fold', () => {
    render(
      <>
        <HomeHooks />
        <SiteNav locale="en" profile={profile} />
      </>,
    );
    const cta = document.getElementById('hero-cta')!;
    FakeIO.watching(cta).fire([{ target: cta, isIntersecting: false, boundingClientRect: rect(1200) }]);
    expect(within(nav()).getByRole('link', { name: dict.en.navContact }).hasAttribute('data-filled')).toBe(false);
  });

  it('server-renders every link, so the nav works before (and without) JavaScript (Review Focus #4)', () => {
    const html = renderToStaticMarkup(<SiteNav locale="en" profile={profile} />);
    for (const href of ['#top', '#work', '#career', '#story', '#faq', '#contact', '/th']) {
      expect(html).toContain(`href="${href}"`);
    }
  });
});
