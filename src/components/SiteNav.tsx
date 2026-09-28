'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import LocaleToggle from '@/components/LocaleToggle';
import NavMenu from '@/components/NavMenu';
import ThumbBar from '@/components/ThumbBar';
import { setReadingAnchor } from '@/lib/active-section';
import { dict } from '@/lib/dictionary';
import { openPalette } from '@/lib/deep-link';
import type { Locale, Profile } from '@/lib/models';
import {
  firstName,
  followSection,
  isPlainClick,
  NAV_LABEL_KEY,
  NAV_SECTIONS,
  READING_ANCHORS,
  sectionHref,
  type NavSection,
  type ReadingAnchor,
} from '@/lib/nav';
import './site-nav.css';

/** The line a section must cross to count as "the one you're reading": a thin
 *  band 45 % of the way down the viewport (prototype syncActive). */
const ACTIVE_BAND = '-45% 0px -54% 0px';
const READING_LINE = 0.45;

/**
 * The floating capsule (spec §5.4, §6; prototype .cap-nav). Always visible:
 * nothing hides it on scroll, and nothing re-colours it over a band, because
 * the White Edition page has one light surface and the glass carries the
 * contrast. The old scroll-inversion probe and its hide-on-scroll are gone.
 *
 * Desktop: brand · four section links with a sliding pill on the one in view ·
 * ⌘K · EN/ไทย · Contact (filled once the hero's own buttons have scrolled away).
 * At ≤ 899 px the links, ⌘K and Contact fold into NavMenu; at ≤ 734 px
 * ThumbBar carries the two actions.
 */
export default function SiteNav({ locale, profile }: { locale: Locale; profile: Profile }) {
  const t = dict[locale];
  // usePathname() is null outside a mounted App Router (unit tests); the
  // locale's own root reproduces the home page's in-page behaviour there.
  const pathname = usePathname() ?? `/${locale}`;
  const href = (hash: `#${string}`) => sectionHref(hash, pathname, locale);
  // C8: shared with NavMenu and (T11) HeroTour rather than each re-deriving
  // profile.name.trim().split(/\s+/)[0] on its own.
  const first = firstName(profile);
  const [active, setActive] = useState<NavSection | null>(null);
  const [heroGone, setHeroGone] = useState(false);
  const linksRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);

  // Which section is being read. Re-run per route: the layout, and so this
  // nav, outlives a client-side navigation, and other routes have none of
  // these ids (nothing is observed there).
  //
  // The same band also feeds the reading anchor (src/lib/active-section.ts),
  // which every EN/ไทย toggle carries across a switch (Klao decision (a)).
  // It is wider than the pill (P1 re-review Important 1): Signature, Contact
  // and the footer count, a gap between two bands keeps the last one, and
  // only the hero clears it.
  useEffect(() => {
    setActive(null);
    setReadingAnchor(null);
    if (typeof IntersectionObserver === 'undefined') return;
    const sections = NAV_SECTIONS.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;
    // Page order: at a boundary the band can touch two neighbours, and the
    // upper one wins, as it does for the pill.
    const anchors = new Map<Element, ReadingAnchor | null>();
    const top = document.getElementById('top');
    if (top) anchors.set(top, null);
    for (const id of READING_ANCHORS) {
      const el = document.getElementById(id);
      if (el) anchors.set(el, id);
    }
    const footer = document.querySelector('footer.site-foot');
    if (footer) anchors.set(footer, 'contact');
    // A jump (an anchor link, a reload that restores the scroll) can land
    // in a gap before the band has passed anything: then the band above the
    // reading line, the one just read, stands in for the last one.
    const bandAbove = () => {
      const line = window.innerHeight * READING_LINE;
      let above: ReadingAnchor | null = null;
      for (const [el, anchor] of anchors) if (el.getBoundingClientRect().top < line) above = anchor;
      return above;
    };
    let last: ReadingAnchor | null = null;
    const inBand = new Map<Element, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) inBand.set(e.target, e.isIntersecting);
        const sec = sections.find((el) => inBand.get(el));
        setActive(sec ? (sec.id as NavSection) : null);
        const hit = Array.from(anchors).find(([el]) => inBand.get(el));
        if (hit) last = hit[1];
        else if (last === null) last = bandAbove();
        setReadingAnchor(last);
      },
      { rootMargin: ACTIVE_BAND },
    );
    for (const el of anchors.keys()) io.observe(el);
    return () => {
      io.disconnect();
      setReadingAnchor(null);
    };
  }, [pathname]);

  // The hero's buttons have left the viewport upwards. A row still below the
  // fold (top > 0) doesn't count: the visitor hasn't passed it yet. One
  // callback can batch several records for the row, oldest first; the last
  // is where it is now.
  useEffect(() => {
    setHeroGone(false);
    const cta = document.getElementById('hero-cta');
    if (!cta || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      setHeroGone(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    io.observe(cta);
    return () => io.disconnect();
  }, [pathname]);

  // Put the pill under the active link. It slides with transform only; its
  // width is set without a transition (only transform and opacity animate).
  // Measured before paint, and again whenever the link row resizes (web font
  // swap, locale change).
  useLayoutEffect(() => {
    const box = linksRef.current;
    const pill = pillRef.current;
    if (!box || !pill) return;
    const place = () => {
      const link = active ? box.querySelector<HTMLAnchorElement>(`a[data-sec="${active}"]`) : null;
      if (!link) {
        pill.removeAttribute('data-on');
        return;
      }
      pill.style.width = `${link.offsetWidth}px`;
      pill.style.transform = `translateX(${link.offsetLeft}px)`;
      pill.setAttribute('data-on', '');
    };
    place();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(place);
    ro.observe(box);
    return () => ro.disconnect();
  }, [active, locale]);

  return (
    <>
      <header className="sn-wrap">
        <nav className="sn-cap glass" aria-label={t.navMain}>
          <Link href={href('#top')} className="sn-brand" aria-label={t.navBrandAria.replace('{name}', first)}>
            <span className="sn-mono" aria-hidden="true">
              {first.charAt(0).toUpperCase()}
            </span>
            {/* `.sn-name`: site-nav.css drops it below 350 px (P1 final
                review M-1); the aria-label above still names him. */}
            <span className="sn-name">{first}</span>
          </Link>
          <div className="sn-links" ref={linksRef}>
            <span className="sn-act" ref={pillRef} aria-hidden="true" />
            {NAV_SECTIONS.map((sec) => (
              <Link
                key={sec}
                href={href(`#${sec}`)}
                data-sec={sec}
                aria-current={active === sec ? 'location' : undefined}
                // Link skips its own navigation once the default is prevented.
                onClick={(e) => {
                  if (isPlainClick(e) && followSection(sec)) e.preventDefault();
                }}
              >
                {/* The current link is bold; `data-label` feeds the hidden
                    bold duplicate (globals.css `.seg-label::after`) that
                    reserves that width, so the row never shifts when the
                    current section changes. */}
                <span className="seg-label" data-label={t[NAV_LABEL_KEY[sec]]}>
                  {t[NAV_LABEL_KEY[sec]]}
                </span>
              </Link>
            ))}
          </div>
          <div className="sn-right">
            <button
              type="button"
              className="sn-icon sn-search"
              aria-label={t.navSearch}
              aria-keyshortcuts="Meta+K Control+K"
              onClick={() => openPalette()}
            >
              <Icon name="magnifying-glass" />
            </button>
            <LocaleToggle />
            <Link href={href('#contact')} className="sn-pill sn-contact" data-filled={heroGone ? '' : undefined}>
              {t.navContact}
            </Link>
            <NavMenu locale={locale} profile={profile} active={active} />
          </div>
        </nav>
      </header>
      <ThumbBar locale={locale} profile={profile} heroGone={heroGone} />
    </>
  );
}
