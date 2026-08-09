'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { dict } from '@/lib/dictionary';
import type { Locale, Profile } from '@/lib/models';
import { eyebrowFont } from '@/lib/typography';
import LocaleToggle from './LocaleToggle';

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

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const sync = () => {
      const headerRect = header.getBoundingClientRect();
      const bands = document.querySelectorAll(LIGHT_BAND_SELECTOR);
      const overLight = Array.from(bands).some((band) => {
        const r = band.getBoundingClientRect();
        return r.top <= headerRect.bottom && r.bottom >= headerRect.top;
      });
      header.classList.toggle('nav-on-light', overLight);
    };
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
    return () => {
      window.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
    };
  }, []);

  // Section ids created by Task 11's page composition: Hero (#hero),
  // AboutBand (#about), WorkGrid (#work -- added in this task), CvBand
  // (#cv). `hash` (not `href`) -- the real, route-aware href is computed
  // per-render below via `anchorHref`, so this is never a bare, dangling
  // hash on its own.
  const anchors: { hash: string; label: string }[] = [
    { hash: '#hero', label: t.home },
    { hash: '#about', label: t.about },
    { hash: '#work', label: t.selectedWork },
    { hash: '#cv', label: t.career },
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
    <header
      ref={headerRef}
      className="fixed inset-x-0 top-0 z-[60] flex items-center justify-between gap-4 px-6 py-5 sm:px-10"
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
      <nav aria-label="Main" className="hidden items-center gap-[clamp(20px,3.4vw,54px)] md:flex">
        {anchors.map((a) => (
          <Link
            key={a.hash}
            href={anchorHref(a.hash)}
            className={`nav-link inline-flex items-center justify-center whitespace-nowrap p-2 -m-2 text-[10.5px] uppercase ${eyebrowFont(locale, 'tracking-[0.22em]')}`}
          >
            {a.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-3.5 text-[11px]">
        {/* Each social link is gated on its own profile field -- omitted
            entirely (never a dead placeholder href) when that field is
            empty, same rule the old SiteFooter followed. External URLs, so
            plain <a>, not next/link -- Link is for in-site routes. */}
        {profile.linkedin && (
          <a
            href={profile.linkedin}
            target="_blank"
            rel="noreferrer"
            className="nav-social inline-flex items-center justify-center whitespace-nowrap p-2 -m-2"
          >
            LinkedIn
          </a>
        )}
        {profile.github && (
          <a
            href={profile.github}
            target="_blank"
            rel="noreferrer"
            className="nav-social inline-flex items-center justify-center whitespace-nowrap p-2 -m-2"
          >
            GitHub
          </a>
        )}
        {profile.email && (
          <a
            href={`mailto:${profile.email}`}
            className="nav-social inline-flex items-center justify-center whitespace-nowrap p-2 -m-2"
          >
            {t.email}
          </a>
        )}
        <LocaleToggle />
      </div>
    </header>
  );
}
