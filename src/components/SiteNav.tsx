'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { dict } from '@/lib/dictionary';
import type { Locale, Profile } from '@/lib/models';
import { eyebrowFont } from '@/lib/typography';
import LocaleToggle from './LocaleToggle';
import './site-nav.css';

// The header is `position: fixed`, so its own bounding rect IS the region
// the fixed, transparent nav actually occupies on screen -- whether the
// nav needs to invert is decided by whether a light band's rect overlaps
// that WHOLE box, not one arbitrary point inside it. An earlier version of
// this file (mirroring the reference prototype's syncNav,
// .superpowers/brainstorm/11719-1786211516/content/studio.html) checked a
// single constant y=40 instead -- but the header box is really ~82px tall,
// so roughly 40px of scroll rendered white nav links directly on the white
// AboutBand before the old probe point crossed into it (real layout --
// jsdom's getBoundingClientRect() returns zeros for everything, so this
// only manifests with a real browser, not any unit test). A light band
// (currently only AboutBand, tagged with the `bg-light` utility class)
// overlapping the header's rect means the fixed, transparent header needs
// to invert.
//
// Scoped to `section.bg-light` rather than the bare `.bg-light` class:
// Hero's and ContactBand's mailto CTAs and this file's own monogram badge
// all reuse `bg-light` for an unrelated white pill/badge background, and
// the monogram in particular sits inside the header itself -- a bare class
// selector would match it too, and since it's always positioned right at
// the probe point, `nav-on-light` would end up permanently true regardless
// of scroll (caught empirically in browser verification, not by any unit
// test -- jsdom's getBoundingClientRect() returns zeros for everything, so
// this false-positive only manifests with real layout). Scoping to
// `<section>` still means any future band that adds `bg-light` to its own
// section element participates for free, without matching incidental
// same-coloured buttons.
const LIGHT_BAND_SELECTOR = 'section.bg-light';

export default function SiteNav({ locale, profile }: { locale: Locale; profile: Profile }) {
  const t = dict[locale];
  const headerRef = useRef<HTMLElement | null>(null);
  // Esc-close and link-click-close both return focus here (see closeMenu
  // below), so keyboard/AT users land back on the control that opened the
  // menu instead of at the top of the page or wherever the overlay left
  // them.
  const burgerRef = useRef<HTMLButtonElement | null>(null);
  // The overlay's own <nav>. Queried at keydown time by the Esc/Tab-trap
  // listener below to find the currently-focusable links, rather than
  // captured once -- so that listener's effect can stay keyed on just
  // `menuOpen` without also depending on the (locale- and profile-shaped)
  // list of links inside it.
  const overlayRef = useRef<HTMLElement | null>(null);
  const monogram = profile.name.trim().charAt(0).toUpperCase();

  // The four in-page anchors (plus the monogram mark, which is a fifth link
  // to the same #hero id) only resolve on the homepage -- its section ids
  // (#hero/#about/#work/#cv) don't exist on /projects, /writing or /career
  // (confirmed by curling each route and grepping for the ids: absent on
  // all three). Outside the homepage the same links instead point at
  // `/{locale}#id`, a real cross-route navigation to the matching homepage
  // section, so the browser's normal navigate-then-jump-to-fragment
  // behaviour resolves them -- never a dead fragment on the current page.
  // `usePathname()` returns null outside a mounted App Router (e.g. in this
  // component's own unit tests), so it defaults to the locale's own root,
  // which reproduces the homepage in-page-scroll behaviour the tests
  // already exercise.
  const pathname = usePathname() ?? `/${locale}`;
  const isHome = pathname === `/${locale}` || pathname === `/${locale}/`;
  const anchorHref = (hash: string) => (isHome ? hash : `/${locale}${hash}`);

  const [menuOpen, setMenuOpen] = useState(false);
  // Mirrors `menuOpen` for the scroll listener below, which is set up once
  // (empty dependency array -- see that effect's own comment) and so never
  // recreates its closure when `menuOpen` changes. A ref is what lets that
  // one-time closure keep reading the *current* menu-open state instead of
  // the `false` it captured on mount.
  const menuOpenRef = useRef(false);
  const toggleMenu = () => {
    setMenuOpen((v) => {
      const next = !v;
      menuOpenRef.current = next;
      return next;
    });
  };
  const closeMenu = () => {
    setMenuOpen(false);
    menuOpenRef.current = false;
    // Return focus to the control that opened the menu -- covers both the
    // Esc key (below) and clicking a link inside the overlay (in-page
    // anchors and the /writing route link alike; focus landing on an
    // element that's still in the DOM, on a page that's about to navigate
    // away anyway, doesn't fight the navigation).
    burgerRef.current?.focus();
  };

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const lastY = { v: window.scrollY };
    const sync = () => {
      const headerRect = header.getBoundingClientRect();
      const bands = document.querySelectorAll(LIGHT_BAND_SELECTOR);
      const overLight = Array.from(bands).some((band) => {
        const r = band.getBoundingClientRect();
        return r.top <= headerRect.bottom && r.bottom >= headerRect.top;
      });
      header.classList.toggle('nav-on-light', overLight);

      const y = window.scrollY;
      header.classList.toggle('nav-solid', y > 40);
      // Only hide when actually travelling down, past the header's own reach,
      // and by more than a 2px jitter threshold. The menuOpenRef guard stays
      // even though the mobile overlay now locks background scroll while
      // it's open (see the scroll-lock effect and the overlay-sibling
      // comment below) -- overscroll bounce and on-screen-keyboard resizes
      // can still fire scroll/resize events while `overflow: hidden` is
      // set, so this remains belt-and-suspenders against the header hiding
      // out from under an open overlay, not the only thing preventing it.
      if (Math.abs(y - lastY.v) > 2) {
        header.classList.toggle('nav-hidden', !menuOpenRef.current && y > lastY.v && y > 120);
        lastY.v = y;
      }
    };
    // rAF-throttled to at most one sync() per animation frame -- scroll and
    // resize can both fire far more often than the browser repaints, and
    // sync() does two getBoundingClientRect() calls plus a
    // querySelectorAll per invocation. Closes a parked review finding
    // ("unthrottled scroll listener", measured >100 scroll events/frame on
    // a fling before this); this makes the fix structural rather than
    // relying on scroll behaving politely. Same onX/rAF split
    // SpotlightList.tsx already uses.
    let raf = 0;
    const onScrollOrResize = () => {
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; sync(); });
    };
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);
    sync();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, []);

  // Locks background scroll for as long as the mobile overlay is open --
  // otherwise the page behind a `position: fixed` overlay keeps scrolling
  // underneath it (mobile Safari in particular). Restores whatever
  // `document.body.style.overflow` was set to before the menu opened
  // (not a hardcoded ''), on both close and unmount, so this never
  // clobbers an overflow value some other part of the page had already
  // set.
  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  // Esc closes the menu; Tab/Shift+Tab trap focus inside the overlay while
  // it's open. One listener does both, since both only make sense while
  // `menuOpen` is true and both need to run before the browser's own
  // default Tab handling does. Deliberately not closed over the overlay's
  // focusable links at effect-setup time -- it queries `overlayRef.current`
  // fresh on every keydown instead, so this effect's dependency array can
  // stay just `[menuOpen]` rather than also tracking the (locale- and
  // profile-shaped) set of links inside it.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMenu();
        return;
      }
      if (e.key !== 'Tab') return;
      const overlay = overlayRef.current;
      if (!overlay) return;
      const focusables = Array.from(overlay.querySelectorAll<HTMLElement>('a[href]'));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  // Moves focus into the overlay the instant it opens, onto its first link
  // -- otherwise focus would stay on the burger button, now visually
  // covered by the `fixed` overlay sitting on top of it, which is exactly
  // the disorienting keyboard/screen-reader experience the Esc/link-click
  // return-to-burger behaviour above (see closeMenu) undoes on the way
  // back out.
  useEffect(() => {
    if (!menuOpen) return;
    overlayRef.current?.querySelector<HTMLElement>('a[href]')?.focus();
  }, [menuOpen]);

  // Section ids created by Task 11's page composition: Hero (#hero),
  // AboutBand (#about), CvBand (#cv). `hash` (not `href`) -- the real,
  // route-aware href is computed per-render below via `anchorHref`, so
  // this is never a bare, dangling hash on its own. #work left this list
  // on 2026-08-15 (owner call): the nav's "Selected projects" entry now
  // opens the full /projects index as a real route (see navItems below)
  // instead of scrolling to the homepage deck -- the deck keeps its
  // id="work" for the story pages' back-links and the deck's own anchor.
  const anchors: { hash: string; label: string }[] = [
    { hash: '#hero', label: t.home },
    { hash: '#about', label: t.about },
    { hash: '#cv', label: t.career },
  ];

  // /writing is a real, sitemapped route (see writing/[slug]/page.tsx),
  // not a homepage section -- unlike the four anchors above it has no
  // section id to scroll to, on this route or any other, so it deliberately
  // does NOT go through `anchorHref`'s isHome bare-hash/prefixed-hash
  // branching. Its href is just `/{locale}/writing`, always, everywhere.
  // Combined with the mapped anchors into one list so desktop and mobile
  // both render it from a single source, in the same position (right after
  // Career/#cv).
  const navItems: { key: string; href: string; label: string }[] = [
    ...anchors.slice(0, 2).map((a) => ({ key: a.hash, href: anchorHref(a.hash), label: a.label })),
    // "Selected projects" is a real route like /writing (owner call,
    // 2026-08-15) -- it keeps its old slot between About and Career but
    // never goes through anchorHref's isHome branching.
    { key: 'projects', href: `/${locale}/projects`, label: t.selectedProjects },
    ...anchors.slice(2).map((a) => ({ key: a.hash, href: anchorHref(a.hash), label: a.label })),
    { key: 'writing', href: `/${locale}/writing`, label: t.writing },
  ];

  // Hit-area fix (WCAG 2.5.8): every text-only link below renders at
  // 10.5-11px with no padding of its own, well under the 24x24 CSS px
  // minimum. `p-2` grows the clickable/tappable box in every direction;
  // the matching `-m-2` cancels that growth for layout purposes (a
  // negative margin shrinks an element's flow/gap footprint back to its
  // unpadded size without affecting where its own border-box -- the
  // actually clickable area -- gets painted or hit-tested), so neither the
  // visible text nor the gap spacing between items changes at all. Both
  // the header (`flex` row) and this `nav` (also `flex`) are flex
  // containers using `gap`, which is exactly the "tight spacing" the
  // 640-672px overflow comment below warns about -- this is what keeps the
  // fix from reintroducing that bug.
  return (
    <>
      <header
        ref={headerRef}
        className="nav-chrome fixed inset-x-0 top-0 z-[60] flex items-center justify-between gap-4 px-6 py-5 sm:px-10"
      >
        <Link
          href={anchorHref('#hero')}
          aria-label={t.home}
          className="nav-mark grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full bg-light text-[15px] font-bold tracking-[-0.02em] text-dark"
        >
          {monogram}
        </Link>

        {/* `md:flex` (not `sm:flex`): between ~640px and ~672px on /th, the
            fixed header's content (monogram + 4 anchor links + socials + the
            TH/EN toggle) overflowed to ~675px wide. Because the header is
            `position: fixed`, no scrollbar ever appears for that overflow --
            the toggle just sits off-screen, unclickable, with no way to
            reach it (English had only ~8px of slack at 650px, so it was one
            longer profile name away from the same failure). Hiding the
            in-page anchor links until `md` (768px) gives both locales real
            headroom instead of a few px of luck. Verified in Chrome at
            640px, 672px and 768px in both locales. */}
        <nav aria-label={t.navMain} className="hidden items-center gap-[clamp(20px,3.4vw,54px)] md:flex">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`nav-link u-draw inline-flex items-center justify-center whitespace-nowrap p-2 -m-2 text-[10.5px] uppercase ${eyebrowFont(locale, 'tracking-[0.22em]')}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3.5 text-[11px]">
          {/* Each social link is gated on its own profile field -- omitted
              entirely (never a dead placeholder href) when that field is
              empty, same rule the old SiteFooter followed. External URLs, so
              plain <a>, not next/link -- Link is for in-site routes.
              `hidden md:inline-flex` (not a bare `inline-flex`): at phone
              widths the header was carrying 6 controls -- monogram, the
              (already md:-gated) desktop nav links, all 3 of these, the
              burger and the locale toggle -- which crowded the fixed header
              even though the burger, not this row, is the real mobile entry
              point. Below `md` these fold into the overlay's own socials row
              instead (see that row below); the profile-field gating and
              hrefs are identical, just re-rendered there. */}
          {profile.linkedin && (
            <a
              href={profile.linkedin}
              target="_blank"
              rel="noreferrer"
              className="nav-social hidden items-center justify-center whitespace-nowrap p-2 -m-2 md:inline-flex"
            >
              LinkedIn
            </a>
          )}
          {profile.github && (
            <a
              href={profile.github}
              target="_blank"
              rel="noreferrer"
              className="nav-social hidden items-center justify-center whitespace-nowrap p-2 -m-2 md:inline-flex"
            >
              GitHub
            </a>
          )}
          {profile.email && (
            <a
              href={`mailto:${profile.email}`}
              className="nav-social hidden items-center justify-center whitespace-nowrap p-2 -m-2 md:inline-flex"
            >
              {t.email}
            </a>
          )}
          <button
            ref={burgerRef}
            type="button"
            className="nav-burger -m-1 inline-flex h-10 w-10 flex-col items-center justify-center gap-[5px] md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={t.navMain}
            onClick={toggleMenu}
          >
            <span aria-hidden="true" className={`h-[1.5px] w-5 bg-current transition-transform duration-300 ${menuOpen ? 'translate-y-[6.5px] rotate-45' : ''}`} />
            <span aria-hidden="true" className={`h-[1.5px] w-5 bg-current transition-opacity duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
            <span aria-hidden="true" className={`h-[1.5px] w-5 bg-current transition-transform duration-300 ${menuOpen ? '-translate-y-[6.5px] -rotate-45' : ''}`} />
          </button>
          <LocaleToggle />
        </div>
      </header>
      {/* Rendered as a SIBLING of `<header>`, not a child. `header.nav-hidden`
          applies a CSS transform (`translateY`) to the header, and a
          transformed ancestor establishes a new containing block for any
          `position: fixed` descendant -- so a `fixed` overlay nested inside
          the header would re-anchor to the header's own ~82px box instead of
          the viewport the instant the header hides mid-scroll. (The
          menuOpenRef guard in the scroll effect above, plus the scroll-lock
          effect, both make that down-scroll far less likely while the menu
          is open, but this component still doesn't control every path that
          can move the header -- sibling placement means it doesn't need
          to.) Sibling placement keeps this overlay's `fixed` positioning
          anchored to the viewport regardless of what the header's own
          transform is doing. `id="mobile-menu"` is unchanged, so the
          button's `aria-controls` above still resolves correctly. */}
      {menuOpen && (
        <nav
          ref={overlayRef}
          id="mobile-menu"
          aria-label={t.navMain}
          className="fixed inset-x-0 bottom-0 top-[82px] z-[59] flex flex-col gap-2 bg-dark/[.97] px-8 pt-10 md:hidden"
        >
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              onClick={closeMenu}
              className="py-3 text-[28px] font-bold tracking-[-0.02em] text-on-dark"
            >
              {item.label}
            </Link>
          ))}
          {/* The header's own social links are `hidden` below `md` (see
              that block's comment) -- this is where LinkedIn/GitHub/email
              actually live at phone widths instead. Same profile-field
              gating, same hrefs, same `nav-social` class (the overlay sits
              on `bg-dark`, so on-dark colors are correct here same as in
              the header). `mt-auto` on the row pushes it to the bottom of
              this flex-col overlay regardless of how many nav links precede
              it; `border-t` visually separates it from the links above.
              `mb-` uses `env(safe-area-inset-bottom)` (with a fixed-value
              floor for browsers/devices without a safe-area inset) so it
              clears the home-indicator area on notched iOS devices instead
              of sitting flush against it. */}
          {(profile.linkedin || profile.github || profile.email) && (
            <div className="mt-auto flex gap-8 border-t border-on-dark-faint pt-6 mb-[max(2.5rem,env(safe-area-inset-bottom))]">
              {profile.linkedin && (
                <a
                  href={profile.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="nav-social inline-flex items-center whitespace-nowrap text-[13px]"
                >
                  LinkedIn
                </a>
              )}
              {profile.github && (
                <a
                  href={profile.github}
                  target="_blank"
                  rel="noreferrer"
                  className="nav-social inline-flex items-center whitespace-nowrap text-[13px]"
                >
                  GitHub
                </a>
              )}
              {profile.email && (
                <a
                  href={`mailto:${profile.email}`}
                  className="nav-social inline-flex items-center whitespace-nowrap text-[13px]"
                >
                  {t.email}
                </a>
              )}
            </div>
          )}
        </nav>
      )}
    </>
  );
}
