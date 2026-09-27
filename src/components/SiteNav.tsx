'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import LocaleToggle from '@/components/LocaleToggle';
import NavMenu from '@/components/NavMenu';
import ThumbBar from '@/components/ThumbBar';
import { dict } from '@/lib/dictionary';
import { openPalette } from '@/lib/deep-link';
import type { Locale, Profile } from '@/lib/models';
import { firstName, followSection, isPlainClick, NAV_LABEL_KEY, NAV_SECTIONS, sectionHref, type NavSection } from '@/lib/nav';
import './site-nav.css';

/** The line a section must cross to count as "the one you're reading": a thin
 *  band 45 % of the way down the viewport (prototype syncActive). */
const ACTIVE_BAND = '-45% 0px -54% 0px';

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
  useEffect(() => {
    setActive(null);
    if (typeof IntersectionObserver === 'undefined') return;
    const sections = NAV_SECTIONS.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;
    const inBand = new Map<string, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) inBand.set(e.target.id, e.isIntersecting);
        setActive(NAV_SECTIONS.find((id) => inBand.get(id)) ?? null);
      },
      { rootMargin: ACTIVE_BAND },
    );
    for (const el of sections) io.observe(el);
    return () => io.disconnect();
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
            <span>{first}</span>
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
