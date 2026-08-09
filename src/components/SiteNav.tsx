'use client';

import { useEffect, useRef } from 'react';
import { dict } from '@/lib/dictionary';
import type { Locale, Profile } from '@/lib/models';
import LocaleToggle from './LocaleToggle';

// A fixed probe point near the top of the viewport, just under the header's
// own content -- mirrors the reference prototype's syncNav
// (.superpowers/brainstorm/11719-1786211516/content/studio.html), which
// checks a constant y=40 rather than the header's own live height. A light
// band (currently only AboutBand, tagged with the `bg-light` utility class)
// crossing this point means the fixed, transparent header needs to invert.
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
const PROBE_Y = 40;
const LIGHT_BAND_SELECTOR = 'section.bg-light';

export default function SiteNav({ locale, profile }: { locale: Locale; profile: Profile }) {
  const t = dict[locale];
  const headerRef = useRef<HTMLElement | null>(null);
  const monogram = profile.name.trim().charAt(0).toUpperCase();

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const sync = () => {
      const bands = document.querySelectorAll(LIGHT_BAND_SELECTOR);
      const overLight = Array.from(bands).some((band) => {
        const r = band.getBoundingClientRect();
        return r.top <= PROBE_Y && r.bottom >= PROBE_Y;
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
  // (#cv). Each href below names a real in-page anchor, never a bare,
  // dangling hash.
  const anchors: { href: string; label: string }[] = [
    { href: '#hero', label: t.home },
    { href: '#about', label: t.about },
    { href: '#work', label: t.selectedWork },
    { href: '#cv', label: t.career },
  ];

  return (
    <header
      ref={headerRef}
      className="fixed inset-x-0 top-0 z-[60] flex items-center justify-between gap-4 px-6 py-5 sm:px-10"
    >
      <a
        href="#hero"
        aria-label={t.home}
        className="nav-mark grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full bg-light text-[15px] font-bold tracking-[-0.02em] text-dark"
      >
        {monogram}
      </a>

      <nav aria-label="Main" className="hidden items-center gap-[clamp(20px,3.4vw,54px)] sm:flex">
        {anchors.map((a) => (
          <a
            key={a.href}
            href={a.href}
            className="nav-link whitespace-nowrap font-mono text-[10.5px] uppercase tracking-[0.22em]"
          >
            {a.label}
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-3.5 text-[11px]">
        {/* Each social link is gated on its own profile field -- omitted
            entirely (never a dead placeholder href) when that field is
            empty, same rule the old SiteFooter followed. */}
        {profile.linkedin && (
          <a href={profile.linkedin} target="_blank" rel="noreferrer" className="nav-social whitespace-nowrap">
            LinkedIn
          </a>
        )}
        {profile.github && (
          <a href={profile.github} target="_blank" rel="noreferrer" className="nav-social whitespace-nowrap">
            GitHub
          </a>
        )}
        {profile.email && (
          <a href={`mailto:${profile.email}`} className="nav-social whitespace-nowrap">
            {t.email}
          </a>
        )}
        <LocaleToggle />
      </div>
    </header>
  );
}
